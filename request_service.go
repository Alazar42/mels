package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"fmt"
	"io"
	"mime/multipart"
	"net"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptrace"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"golang.org/x/net/http2"
)

const (
	// MaxInMemoryResponseBodyBytes limits response reading into memory to 5MB for IPC performance.
	MaxInMemoryResponseBodyBytes int64 = 5 * 1024 * 1024
	DefaultTimeout                      = 30 * time.Second
	DefaultUserAgent                    = "Mels-API-Client/1.0"
)

// RequestService handles executing HTTP requests, cookie jars, and scripting.
type RequestService struct {
	ctx           context.Context
	mu            sync.RWMutex
	activeCancels map[string]context.CancelFunc
	jar           http.CookieJar
	scriptEngine  *ScriptEngine
	transports    map[string]*http.Transport
	transportsMu  sync.Mutex
}

// NewRequestService creates a new instance of RequestService with a persistent cookie jar.
func NewRequestService() *RequestService {
	jar, _ := cookiejar.New(nil)
	return &RequestService{
		activeCancels: make(map[string]context.CancelFunc),
		jar:           jar,
		scriptEngine:  NewScriptEngine(),
		transports:    make(map[string]*http.Transport),
	}
}

// getTransport retrieves or creates a pooled HTTP transport for the given settings.
func (s *RequestService) getTransport(verifySSL bool, customCA string, proxyURL string, enableHttp2 bool) *http.Transport {
	key := fmt.Sprintf("ssl:%t|ca:%s|proxy:%s|h2:%t", verifySSL, customCA, proxyURL, enableHttp2)

	s.transportsMu.Lock()
	defer s.transportsMu.Unlock()

	if t, exists := s.transports[key]; exists {
		return t
	}

	tlsConfig := &tls.Config{
		InsecureSkipVerify: !verifySSL,
	}

	if customCA != "" {
		caCertPool, err := x509.SystemCertPool()
		if err != nil {
			caCertPool = x509.NewCertPool()
		}
		caCertPool.AppendCertsFromPEM([]byte(customCA))
		tlsConfig.RootCAs = caCertPool
	}

	dialer := &net.Dialer{
		Timeout:   10 * time.Second,
		KeepAlive: 90 * time.Second,
	}

	t := &http.Transport{
		Proxy:                 http.ProxyFromEnvironment,
		DialContext:           dialer.DialContext,
		TLSClientConfig:       tlsConfig,
		DisableKeepAlives:     false,
		MaxIdleConns:          200,
		MaxIdleConnsPerHost:   50,
		MaxConnsPerHost:       100,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		ForceAttemptHTTP2:     enableHttp2,
	}

	if proxyURL != "" {
		if pURL, err := url.Parse(proxyURL); err == nil {
			t.Proxy = http.ProxyURL(pURL)
		}
	}

	if enableHttp2 {
		_ = http2.ConfigureTransport(t)
	}

	s.transports[key] = t
	return t
}

// SetContext sets the application context.
func (s *RequestService) SetContext(ctx context.Context) {
	s.ctx = ctx
}

// registerCancel records a cancellation function for a request ID.
func (s *RequestService) registerCancel(id string, cancel context.CancelFunc) {
	if id == "" {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.activeCancels[id] = cancel
}

// unregisterCancel removes a cancellation function for a request ID.
func (s *RequestService) unregisterCancel(id string) {
	if id == "" {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.activeCancels, id)
}

// CancelRequest cancels an in-flight request by its ID.
func (s *RequestService) CancelRequest(requestID string) bool {
	s.mu.Lock()
	cancel, exists := s.activeCancels[requestID]
	if exists {
		delete(s.activeCancels, requestID)
	}
	s.mu.Unlock()

	if exists && cancel != nil {
		cancel()
		return true
	}
	return false
}

// ExecuteRequest processes an ApiRequest, executes pre/post scripts, and returns a comprehensive ApiResponse.
func (s *RequestService) ExecuteRequest(req ApiRequest) ApiResponse {
	startTime := time.Now()
	res := ApiResponse{
		RequestID:        req.ID,
		Headers:          make([]KeyValuePair, 0),
		Cookies:          make([]ResponseCookie, 0),
		TestResults:      make([]TestResult, 0),
		ScriptLogs:       make([]string, 0),
		RedirectHistory:  make([]string, 0),
		UpdatedVariables: make(map[string]string),
	}

	for k, v := range req.Variables {
		res.UpdatedVariables[k] = v
	}

	// 1. Run Pre-Request Script (if provided)
	if strings.TrimSpace(req.PreRequestScript) != "" {
		preResult := s.scriptEngine.RunScript(req.PreRequestScript, &req, nil, res.UpdatedVariables, false)
		if len(preResult.Logs) > 0 {
			res.ScriptLogs = append(res.ScriptLogs, preResult.Logs...)
		}
		for k, v := range preResult.UpdatedVariables {
			res.UpdatedVariables[k] = v
		}
		if preResult.Error != "" {
			res.ScriptLogs = append(res.ScriptLogs, "[Pre-Script Error] "+preResult.Error)
		}
	}

	// 2. URL Resolution & Validation
	rawURL := strings.TrimSpace(req.URL)
	if rawURL == "" {
		res.Error = "URL cannot be empty"
		res.TimeMs = time.Since(startTime).Milliseconds()
		return res
	}

	if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
		rawURL = "http://" + rawURL
	}

	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		res.Error = fmt.Sprintf("Invalid URL: %v", err)
		res.TimeMs = time.Since(startTime).Milliseconds()
		return res
	}

	// 3. Query Parameters handling
	queryParams := parsedURL.Query()
	for _, qp := range req.QueryParams {
		if qp.Enabled && qp.Key != "" {
			queryParams.Add(qp.Key, qp.Value)
		}
	}
	if req.Auth.Type == "api-key" && req.Auth.ApiKey.AddTo == "query" && req.Auth.ApiKey.Key != "" {
		queryParams.Add(req.Auth.ApiKey.Key, req.Auth.ApiKey.Value)
	}
	parsedURL.RawQuery = queryParams.Encode()

	// 4. Request Body Construction
	var bodyReader io.Reader
	var autoContentType string

	switch req.Body.Type {
	case "raw":
		bodyReader = strings.NewReader(req.Body.Raw)
		switch req.Body.RawType {
		case "json":
			autoContentType = "application/json; charset=utf-8"
		case "xml":
			autoContentType = "application/xml; charset=utf-8"
		case "html":
			autoContentType = "text/html; charset=utf-8"
		case "javascript":
			autoContentType = "application/javascript; charset=utf-8"
		case "text":
			autoContentType = "text/plain; charset=utf-8"
		}

	case "x-www-form-urlencoded":
		formValues := url.Values{}
		for _, item := range req.Body.UrlEncoded {
			if item.Enabled && item.Key != "" {
				formValues.Add(item.Key, item.Value)
			}
		}
		bodyReader = strings.NewReader(formValues.Encode())
		autoContentType = "application/x-www-form-urlencoded"

	case "form-data":
		var b bytes.Buffer
		w := multipart.NewWriter(&b)
		for _, item := range req.Body.FormData {
			if !item.Enabled || item.Key == "" {
				continue
			}
			if item.Type == "file" && item.FilePath != "" {
				file, err := os.Open(item.FilePath)
				if err != nil {
					res.Error = fmt.Sprintf("Failed to open file '%s': %v", item.FilePath, err)
					res.TimeMs = time.Since(startTime).Milliseconds()
					return res
				}
				defer file.Close()

				part, err := w.CreateFormFile(item.Key, filepath.Base(item.FilePath))
				if err != nil {
					res.Error = fmt.Sprintf("Failed to create form file: %v", err)
					res.TimeMs = time.Since(startTime).Milliseconds()
					return res
				}
				if _, err := io.Copy(part, file); err != nil {
					res.Error = fmt.Sprintf("Failed to copy file data: %v", err)
					res.TimeMs = time.Since(startTime).Milliseconds()
					return res
				}
			} else {
				if err := w.WriteField(item.Key, item.Value); err != nil {
					res.Error = fmt.Sprintf("Failed to write form field: %v", err)
					res.TimeMs = time.Since(startTime).Milliseconds()
					return res
				}
			}
		}
		if err := w.Close(); err != nil {
			res.Error = fmt.Sprintf("Failed to finalize multipart writer: %v", err)
			res.TimeMs = time.Since(startTime).Milliseconds()
			return res
		}
		bodyReader = &b
		autoContentType = w.FormDataContentType()

	case "binary":
		if req.Body.BinaryFilePath != "" {
			fileData, err := os.ReadFile(req.Body.BinaryFilePath)
			if err != nil {
				res.Error = fmt.Sprintf("Failed to read binary file: %v", err)
				res.TimeMs = time.Since(startTime).Milliseconds()
				return res
			}
			bodyReader = bytes.NewReader(fileData)
			autoContentType = "application/octet-stream"
		}
	}

	// 5. Context & Timeout Management
	timeout := DefaultTimeout
	if req.Settings.TimeoutMs > 0 {
		timeout = time.Duration(req.Settings.TimeoutMs) * time.Millisecond
	}

	baseCtx := s.ctx
	if baseCtx == nil {
		baseCtx = context.Background()
	}
	reqCtx, cancel := context.WithCancel(baseCtx)
	timer := time.AfterFunc(timeout, func() {
		cancel()
	})
	defer timer.Stop()

	s.registerCancel(req.ID, cancel)
	defer s.unregisterCancel(req.ID)

	// 6. Build HTTP Request
	method := strings.ToUpper(strings.TrimSpace(req.Method))
	if method == "" {
		method = http.MethodGet
	}

	httpReq, err := http.NewRequestWithContext(reqCtx, method, parsedURL.String(), bodyReader)
	if err != nil {
		res.Error = fmt.Sprintf("Failed to create request: %v", err)
		res.TimeMs = time.Since(startTime).Milliseconds()
		return res
	}

	// 7. Apply Headers
	hasUserAgent := false
	hasContentType := false

	for _, h := range req.Headers {
		if h.Enabled && h.Key != "" {
			if strings.EqualFold(h.Key, "User-Agent") {
				hasUserAgent = true
			}
			if strings.EqualFold(h.Key, "Content-Type") {
				hasContentType = true
			}
			httpReq.Header.Add(h.Key, h.Value)
		}
	}

	if !hasUserAgent {
		httpReq.Header.Set("User-Agent", DefaultUserAgent)
	}
	if !hasContentType && autoContentType != "" {
		httpReq.Header.Set("Content-Type", autoContentType)
	}

	// 8. Apply Authentication
	switch req.Auth.Type {
	case "bearer":
		if req.Auth.Bearer != "" {
			httpReq.Header.Set("Authorization", "Bearer "+strings.TrimSpace(req.Auth.Bearer))
		}
	case "basic":
		if req.Auth.Username != "" || req.Auth.Password != "" {
			auth := req.Auth.Username + ":" + req.Auth.Password
			basic := base64.StdEncoding.EncodeToString([]byte(auth))
			httpReq.Header.Set("Authorization", "Basic "+basic)
		}
	case "api-key":
		if req.Auth.ApiKey.AddTo != "query" && req.Auth.ApiKey.Key != "" {
			httpReq.Header.Set(req.Auth.ApiKey.Key, req.Auth.ApiKey.Value)
		}
	}

	// 9. Granular Timing & Trace Setup
	var dnsStart, dnsDone time.Time
	var connStart, connDone time.Time
	var tlsStart, tlsDone time.Time
	var gotFirstByte time.Time
	var connReused bool

	trace := &httptrace.ClientTrace{
		DNSStart: func(_ httptrace.DNSStartInfo) {
			dnsStart = time.Now()
		},
		DNSDone: func(_ httptrace.DNSDoneInfo) {
			dnsDone = time.Now()
		},
		ConnectStart: func(_, _ string) {
			connStart = time.Now()
		},
		ConnectDone: func(_, _ string, _ error) {
			connDone = time.Now()
		},
		TLSHandshakeStart: func() {
			tlsStart = time.Now()
		},
		TLSHandshakeDone: func(_ tls.ConnectionState, _ error) {
			tlsDone = time.Now()
		},
		GotConn: func(info httptrace.GotConnInfo) {
			connReused = info.Reused
		},
		GotFirstResponseByte: func() {
			gotFirstByte = time.Now()
		},
	}
	httpReq = httpReq.WithContext(httptrace.WithClientTrace(httpReq.Context(), trace))

	// 10. Use High-Performance Pooled Transport
	transport := s.getTransport(req.Settings.VerifySSL, req.Settings.CustomCACert, req.Settings.ProxyURL, req.Settings.EnableHTTP2)

	client := &http.Client{
		Transport: transport,
		Jar:       s.jar,
	}

	// 12. Redirect Policy & Chain Tracking
	redirectChain := make([]string, 0)
	if !req.Settings.FollowRedirects {
		client.CheckRedirect = func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		}
	} else {
		maxRedir := 10
		if req.Settings.MaxRedirects > 0 {
			maxRedir = req.Settings.MaxRedirects
		}
		client.CheckRedirect = func(r *http.Request, via []*http.Request) error {
			redirectChain = append(redirectChain, r.URL.String())
			if len(via) >= maxRedir {
				return fmt.Errorf("stopped after %d redirects", maxRedir)
			}
			return nil
		}
	}

	// 13. Execute HTTP Request
	httpStartTime := time.Now()
	httpResp, err := client.Do(httpReq)
	if err != nil {
		res.TimeMs = time.Since(httpStartTime).Milliseconds()
		if reqCtx.Err() == context.Canceled {
			res.Error = "Request canceled by user"
		} else if reqCtx.Err() == context.DeadlineExceeded {
			res.Error = fmt.Sprintf("Request timed out after %v", timeout)
		} else {
			res.Error = fmt.Sprintf("Request failed: %v", err)
		}
		return res
	}
	defer httpResp.Body.Close()

	downloadStart := time.Now()

	// 14. Read Response with Memory Safety Limit (5MB cap)
	limitReader := io.LimitReader(httpResp.Body, MaxInMemoryResponseBodyBytes+1)
	bodyBytes, err := io.ReadAll(limitReader)
	if err != nil && err != io.EOF {
		res.Error = fmt.Sprintf("Error reading response body: %v", err)
	}

	downloadDone := time.Now()
	totalDone := time.Now()

	// Check truncation
	if int64(len(bodyBytes)) > MaxInMemoryResponseBodyBytes {
		res.IsTruncated = true
		bodyBytes = bodyBytes[:MaxInMemoryResponseBodyBytes]
	} else {
		_, _ = io.Copy(io.Discard, httpResp.Body)
	}

	// 15. Fill Payload Metadata
	res.StatusCode = httpResp.StatusCode
	res.StatusText = http.StatusText(httpResp.StatusCode)
	if res.StatusText == "" {
		res.StatusText = strings.TrimSpace(strings.TrimPrefix(httpResp.Status, fmt.Sprintf("%d", httpResp.StatusCode)))
	}
	res.Proto = httpResp.Proto
	res.ContentType = httpResp.Header.Get("Content-Type")
	res.RedirectHistory = redirectChain

	if httpResp.ContentLength > 0 {
		res.Size = httpResp.ContentLength
	} else {
		res.Size = int64(len(bodyBytes))
	}

	if isBinaryContent(res.ContentType, bodyBytes) {
		res.IsBinary = true
		res.Body = base64.StdEncoding.EncodeToString(bodyBytes)
	} else {
		res.IsBinary = false
		res.Body = string(bodyBytes)
	}

	// 16. Parse Headers
	var headerSize int64
	for key, values := range httpResp.Header {
		for _, val := range values {
			res.Headers = append(res.Headers, KeyValuePair{
				Key:     key,
				Value:   val,
				Enabled: true,
			})
			headerSize += int64(len(key) + len(val) + 4)
		}
	}
	res.HeaderSize = headerSize

	// 17. Parse Cookies
	for _, cookie := range httpResp.Cookies() {
		res.Cookies = append(res.Cookies, ResponseCookie{
			Name:     cookie.Name,
			Value:    cookie.Value,
			Path:     cookie.Path,
			Domain:   cookie.Domain,
			Expires:  cookie.Expires.Format(time.RFC3339),
			MaxAge:   cookie.MaxAge,
			Secure:   cookie.Secure,
			HttpOnly: cookie.HttpOnly,
			SameSite: fmt.Sprintf("%v", cookie.SameSite),
		})
	}

	// 18. Record Timing Metrics
	res.TimeMs = totalDone.Sub(httpStartTime).Milliseconds()
	timing := RequestTiming{
		TotalDurationMs: res.TimeMs,
		ConnReused:      connReused,
	}
	if !dnsStart.IsZero() && !dnsDone.IsZero() {
		timing.DNSLookupMs = dnsDone.Sub(dnsStart).Milliseconds()
	}
	if !connStart.IsZero() && !connDone.IsZero() {
		timing.TCPConnMs = connDone.Sub(connStart).Milliseconds()
	}
	if !tlsStart.IsZero() && !tlsDone.IsZero() {
		timing.TLSHandshakeMs = tlsDone.Sub(tlsStart).Milliseconds()
	}
	if !gotFirstByte.IsZero() {
		timing.ServerTimeMs = gotFirstByte.Sub(httpStartTime).Milliseconds()
	}
	timing.DownloadTimeMs = downloadDone.Sub(downloadStart).Milliseconds()
	res.Timing = timing

	// 19. Run Post-Request / Test Script (if provided)
	if strings.TrimSpace(req.TestScript) != "" {
		testResult := s.scriptEngine.RunScript(req.TestScript, &req, &res, res.UpdatedVariables, true)
		res.TestResults = testResult.TestResults
		if len(testResult.Logs) > 0 {
			res.ScriptLogs = append(res.ScriptLogs, testResult.Logs...)
		}
		for k, v := range testResult.UpdatedVariables {
			res.UpdatedVariables[k] = v
		}
		if testResult.Error != "" {
			res.ScriptLogs = append(res.ScriptLogs, "[Test Script Error] "+testResult.Error)
		}
	}

	return res
}

// isBinaryContent inspects content type header and first chunk of bytes to determine if content is binary.
func isBinaryContent(contentType string, data []byte) bool {
	ct := strings.ToLower(contentType)
	if strings.Contains(ct, "application/json") ||
		strings.Contains(ct, "application/xml") ||
		strings.Contains(ct, "text/") ||
		strings.Contains(ct, "application/javascript") ||
		strings.Contains(ct, "application/xhtml+xml") ||
		strings.Contains(ct, "application/ld+json") ||
		strings.Contains(ct, "image/svg+xml") {
		return false
	}

	if strings.HasPrefix(ct, "image/") ||
		strings.HasPrefix(ct, "audio/") ||
		strings.HasPrefix(ct, "video/") ||
		strings.HasPrefix(ct, "application/pdf") ||
		strings.HasPrefix(ct, "application/zip") ||
		strings.HasPrefix(ct, "application/octet-stream") {
		return true
	}

	checkLen := len(data)
	if checkLen > 1024 {
		checkLen = 1024
	}
	if checkLen > 0 && !utf8.Valid(data[:checkLen]) {
		return true
	}

	return false
}
