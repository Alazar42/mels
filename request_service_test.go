package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
)

func TestRequestService_ExecuteGET(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Errorf("expected GET method, got %s", r.Method)
		}
		if r.Header.Get("X-Custom-Header") != "TestValue" {
			t.Errorf("expected custom header 'TestValue', got %s", r.Header.Get("X-Custom-Header"))
		}
		if r.URL.Query().Get("page") != "2" {
			t.Errorf("expected query param page=2, got %s", r.URL.Query().Get("page"))
		}

		http.SetCookie(w, &http.Cookie{
			Name:  "session_id",
			Value: "xyz123",
			Path:  "/",
		})
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"success"}`))
	}))
	defer server.Close()

	svc := NewRequestService()
	svc.SetContext(context.Background())

	req := ApiRequest{
		ID:     "req-1",
		Method: "GET",
		URL:    server.URL,
		QueryParams: []KeyValuePair{
			{Key: "page", Value: "2", Enabled: true},
			{Key: "disabled", Value: "foo", Enabled: false},
		},
		Headers: []KeyValuePair{
			{Key: "X-Custom-Header", Value: "TestValue", Enabled: true},
		},
		Settings: RequestSettings{
			TimeoutMs: 5000,
			VerifySSL: false,
		},
	}

	res := svc.ExecuteRequest(req)

	if res.Error != "" {
		t.Fatalf("unexpected error: %s", res.Error)
	}
	if res.StatusCode != 200 {
		t.Errorf("expected status 200, got %d", res.StatusCode)
	}
	if !strings.Contains(res.Body, `"status":"success"`) {
		t.Errorf("expected response body with status success, got %s", res.Body)
	}
	if len(res.Cookies) != 1 || res.Cookies[0].Name != "session_id" {
		t.Errorf("expected 1 cookie 'session_id', got %+v", res.Cookies)
	}
	if res.TimeMs < 0 {
		t.Errorf("invalid response time %d ms", res.TimeMs)
	}
}

func TestRequestService_ExecutePOST_JSON(t *testing.T) {
	type Payload struct {
		Message string `json:"message"`
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST method, got %s", r.Method)
		}
		if !strings.Contains(r.Header.Get("Content-Type"), "application/json") {
			t.Errorf("expected json content-type, got %s", r.Header.Get("Content-Type"))
		}

		var body Payload
		err := json.NewDecoder(r.Body).Decode(&body)
		if err != nil {
			t.Fatalf("failed to decode JSON body: %v", err)
		}
		if body.Message != "Hello Mels" {
			t.Errorf("expected 'Hello Mels', got %s", body.Message)
		}

		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"created":true}`))
	}))
	defer server.Close()

	svc := NewRequestService()
	res := svc.ExecuteRequest(ApiRequest{
		ID:     "req-post",
		Method: "POST",
		URL:    server.URL,
		Body: RequestBody{
			Type:    "raw",
			RawType: "json",
			Raw:     `{"message":"Hello Mels"}`,
		},
	})

	if res.Error != "" {
		t.Fatalf("unexpected error: %s", res.Error)
	}
	if res.StatusCode != 201 {
		t.Errorf("expected status 201, got %d", res.StatusCode)
	}
	if !strings.Contains(res.Body, `"created":true`) {
		t.Errorf("expected response body, got %s", res.Body)
	}
}

func TestRequestService_ExecutePOST_UrlEncoded(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		err := r.ParseForm()
		if err != nil {
			t.Fatalf("failed to parse form: %v", err)
		}
		if r.FormValue("username") != "micky" || r.FormValue("role") != "admin" {
			t.Errorf("unexpected form values: %+v", r.Form)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}))
	defer server.Close()

	svc := NewRequestService()
	res := svc.ExecuteRequest(ApiRequest{
		ID:     "req-form",
		Method: "POST",
		URL:    server.URL,
		Body: RequestBody{
			Type: "x-www-form-urlencoded",
			UrlEncoded: []KeyValuePair{
				{Key: "username", Value: "micky", Enabled: true},
				{Key: "role", Value: "admin", Enabled: true},
			},
		},
	})

	if res.Error != "" {
		t.Fatalf("unexpected error: %s", res.Error)
	}
	if res.StatusCode != 200 {
		t.Errorf("expected 200, got %d", res.StatusCode)
	}
}

func TestRequestService_ExecutePOST_FormData(t *testing.T) {
	tmpFile, err := os.CreateTemp("", "test_upload_*.txt")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())

	_, _ = tmpFile.WriteString("file content test")
	tmpFile.Close()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		err := r.ParseMultipartForm(10 << 20)
		if err != nil {
			t.Fatalf("failed to parse multipart: %v", err)
		}
		if r.FormValue("description") != "upload test" {
			t.Errorf("expected field 'upload test', got %s", r.FormValue("description"))
		}

		file, _, err := r.FormFile("attachment")
		if err != nil {
			t.Fatalf("failed to get form file: %v", err)
		}
		defer file.Close()

		content, _ := io.ReadAll(file)
		if string(content) != "file content test" {
			t.Errorf("expected 'file content test', got %s", string(content))
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("uploaded"))
	}))
	defer server.Close()

	svc := NewRequestService()
	res := svc.ExecuteRequest(ApiRequest{
		ID:     "req-multipart",
		Method: "POST",
		URL:    server.URL,
		Body: RequestBody{
			Type: "form-data",
			FormData: []FormDataItem{
				{Key: "description", Value: "upload test", Type: "text", Enabled: true},
				{Key: "attachment", FilePath: tmpFile.Name(), Type: "file", Enabled: true},
			},
		},
	})

	if res.Error != "" {
		t.Fatalf("unexpected error: %s", res.Error)
	}
	if res.StatusCode != 200 {
		t.Errorf("expected status 200, got %d", res.StatusCode)
	}
}

func TestRequestService_Authentication(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if r.URL.Path == "/bearer" {
			if authHeader != "Bearer my-secret-token" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
		} else if r.URL.Path == "/basic" {
			user, pass, ok := r.BasicAuth()
			if !ok || user != "admin" || pass != "secret123" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
		} else if r.URL.Path == "/apikey-header" {
			if r.Header.Get("X-API-KEY") != "key_999" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	svc := NewRequestService()

	// Test Bearer Auth
	resBearer := svc.ExecuteRequest(ApiRequest{
		ID:     "req-bearer",
		Method: "GET",
		URL:    server.URL + "/bearer",
		Auth: AuthConfig{
			Type:   "bearer",
			Bearer: "my-secret-token",
		},
	})
	if resBearer.StatusCode != 200 {
		t.Errorf("expected bearer auth 200, got %d", resBearer.StatusCode)
	}

	// Test Basic Auth
	resBasic := svc.ExecuteRequest(ApiRequest{
		ID:     "req-basic",
		Method: "GET",
		URL:    server.URL + "/basic",
		Auth: AuthConfig{
			Type:     "basic",
			Username: "admin",
			Password: "secret123",
		},
	})
	if resBasic.StatusCode != 200 {
		t.Errorf("expected basic auth 200, got %d", resBasic.StatusCode)
	}

	// Test API Key Header Auth
	resApiKey := svc.ExecuteRequest(ApiRequest{
		ID:     "req-api-key",
		Method: "GET",
		URL:    server.URL + "/apikey-header",
		Auth: AuthConfig{
			Type: "api-key",
			ApiKey: ApiKeyConfig{
				Key:   "X-API-KEY",
				Value: "key_999",
				AddTo: "header",
			},
		},
	})
	if resApiKey.StatusCode != 200 {
		t.Errorf("expected api key auth 200, got %d", resApiKey.StatusCode)
	}
}

func TestRequestService_ScriptEngineAndAssertions(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"user":{"id":42,"name":"Micky","active":true}}`))
	}))
	defer server.Close()

	svc := NewRequestService()

	req := ApiRequest{
		ID:     "req-script-test",
		Method: "GET",
		URL:    server.URL,
		PreRequestScript: `
			console.log("Starting pre-request script...");
			mels.environment.set("token", "pre_token_99");
		`,
		TestScript: `
			console.log("Running post-request assertions...");
			mels.test("Status code is 200", function() {
				mels.expect(mels.response.code).to.equal(200);
			});
			mels.test("User payload contains name Micky", function() {
				var data = mels.response.json();
				mels.expect(data.user.name).to.equal("Micky");
				mels.expect(data.user.id).to.equal(42);
				mels.expect(data.user.active).to.be.true();
			});
			mels.environment.set("userId", "42");
		`,
	}

	res := svc.ExecuteRequest(req)

	if res.Error != "" {
		t.Fatalf("unexpected error: %s", res.Error)
	}
	if len(res.TestResults) != 2 {
		t.Fatalf("expected 2 test results, got %d", len(res.TestResults))
	}
	for _, tr := range res.TestResults {
		if !tr.Passed {
			t.Errorf("test '%s' failed: %s", tr.Name, tr.Error)
		}
	}
	if res.UpdatedVariables["token"] != "pre_token_99" {
		t.Errorf("expected variable token=pre_token_99, got %s", res.UpdatedVariables["token"])
	}
	if res.UpdatedVariables["userId"] != "42" {
		t.Errorf("expected variable userId=42, got %s", res.UpdatedVariables["userId"])
	}
	if len(res.ScriptLogs) < 2 {
		t.Errorf("expected script logs, got %+v", res.ScriptLogs)
	}
}

func TestRequestService_LargeResponseTruncation(t *testing.T) {
	largeData := make([]byte, 6*1024*1024)
	for i := range largeData {
		largeData[i] = 'A'
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		w.Write(largeData)
	}))
	defer server.Close()

	svc := NewRequestService()
	res := svc.ExecuteRequest(ApiRequest{
		ID:     "req-large",
		Method: "GET",
		URL:    server.URL,
	})

	if res.Error != "" {
		t.Fatalf("unexpected error: %s", res.Error)
	}
	if !res.IsTruncated {
		t.Errorf("expected response to be truncated, got isTruncated=false")
	}
	if int64(len(res.Body)) != MaxInMemoryResponseBodyBytes {
		t.Errorf("expected body length %d, got %d", MaxInMemoryResponseBodyBytes, len(res.Body))
	}
}

func TestRequestService_Cancellation(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(500 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	svc := NewRequestService()

	go func() {
		time.Sleep(50 * time.Millisecond)
		svc.CancelRequest("req-cancel")
	}()

	res := svc.ExecuteRequest(ApiRequest{
		ID:     "req-cancel",
		Method: "GET",
		URL:    server.URL,
	})

	if !strings.Contains(res.Error, "canceled") {
		t.Errorf("expected request to be canceled, got error: %s", res.Error)
	}
}
