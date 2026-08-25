package main

// KeyValuePair represents generic key-value items used for headers, query params, form values, and variables.
type KeyValuePair struct {
	Key         string `json:"key"`
	Value       string `json:"value"`
	Enabled     bool   `json:"enabled"`
	Description string `json:"description,omitempty"`
}

// FormDataItem represents an item in a multipart/form-data request.
// Can be either plain text or a reference to a local file.
type FormDataItem struct {
	Key         string `json:"key"`
	Value       string `json:"value"`       // Used for text type
	Type        string `json:"type"`        // "text" or "file"
	FilePath    string `json:"filePath"`    // Used for file type (local file path)
	Enabled     bool   `json:"enabled"`
	Description string `json:"description,omitempty"`
}

// RequestBody defines the payload configuration for an HTTP request.
type RequestBody struct {
	Type           string         `json:"type"`                     // "none", "raw", "form-data", "x-www-form-urlencoded", "binary"
	Raw            string         `json:"raw,omitempty"`           // String content for JSON, XML, text, GraphQL, etc.
	RawType        string         `json:"rawType,omitempty"`       // "json", "xml", "text", "html", "javascript"
	FormData       []FormDataItem `json:"formData,omitempty"`       // Multipart form items
	UrlEncoded     []KeyValuePair `json:"urlEncoded,omitempty"`     // Key-value pairs for urlencoded body
	BinaryFilePath string         `json:"binaryFilePath,omitempty"` // Path to local file for binary upload
}

// ApiKeyConfig holds API key authentication settings.
type ApiKeyConfig struct {
	Key   string `json:"key"`   // Header or query param key name
	Value string `json:"value"` // API key value
	AddTo string `json:"addTo"` // "header" or "query"
}

// AuthConfig defines authentication parameters for a request.
type AuthConfig struct {
	Type     string       `json:"type"`               // "none", "bearer", "basic", "api-key"
	Bearer   string       `json:"bearer,omitempty"`   // Bearer token string
	Username string       `json:"username,omitempty"` // Basic auth username
	Password string       `json:"password,omitempty"` // Basic auth password
	ApiKey   ApiKeyConfig `json:"apiKey,omitempty"`
}

// RequestSettings defines execution settings and policies for an HTTP call.
type RequestSettings struct {
	TimeoutMs       int    `json:"timeoutMs"`                 // Request timeout in milliseconds (default: 30000)
	FollowRedirects bool   `json:"followRedirects"`           // Whether to follow 3xx redirects (default: true)
	MaxRedirects    int    `json:"maxRedirects"`              // Maximum redirect count (default: 10)
	VerifySSL       bool   `json:"verifySSL"`                 // Whether to verify SSL/TLS certificates (default: true)
	ProxyURL        string `json:"proxyUrl,omitempty"`        // Optional HTTP/HTTPS/SOCKS5 proxy URL
	EnableHTTP2     bool   `json:"enableHttp2"`               // Enable HTTP/2 protocol multiplexing
	CustomCACert    string `json:"customCaCert,omitempty"`    // Optional custom CA certificate PEM content
}

// ApiRequest represents the complete incoming request definition from the frontend.
type ApiRequest struct {
	ID                string            `json:"id"`
	Name              string            `json:"name"`
	Method            string            `json:"method"` // GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD
	URL               string            `json:"url"`
	QueryParams       []KeyValuePair    `json:"queryParams"`
	Headers           []KeyValuePair    `json:"headers"`
	Body              RequestBody       `json:"body"`
	Auth              AuthConfig        `json:"auth"`
	Settings          RequestSettings   `json:"settings"`
	PreRequestScript  string            `json:"preRequestScript,omitempty"`
	TestScript        string            `json:"testScript,omitempty"`
	Variables         map[string]string `json:"variables,omitempty"` // Context variables passed to scripts
}

// ResponseCookie holds parsed cookie data returned by the server.
type ResponseCookie struct {
	Name     string `json:"name"`
	Value    string `json:"value"`
	Path     string `json:"path"`
	Domain   string `json:"domain"`
	Expires  string `json:"expires,omitempty"`
	MaxAge   int    `json:"maxAge,omitempty"`
	Secure   bool   `json:"secure"`
	HttpOnly bool   `json:"httpOnly"`
	SameSite string `json:"sameSite,omitempty"`
}

// RequestTiming records microsecond/millisecond breakdown of the request lifecycle.
type RequestTiming struct {
	DNSLookupMs     int64 `json:"dnsLookupMs"`
	TCPConnMs       int64 `json:"tcpConnMs"`
	TLSHandshakeMs  int64 `json:"tlsHandshakeMs"`
	ServerTimeMs    int64 `json:"serverTimeMs"` // TTFB (Time to First Byte)
	DownloadTimeMs  int64 `json:"downloadTimeMs"`
	TotalDurationMs int64 `json:"totalDurationMs"`
}

// TestResult represents the outcome of an assertion inside a test script.
type TestResult struct {
	Name   string `json:"name"`
	Passed bool   `json:"passed"`
	Error  string `json:"error,omitempty"`
}

// ApiResponse represents the structured response returned to the frontend.
type ApiResponse struct {
	RequestID        string            `json:"requestId"`
	StatusCode       int               `json:"statusCode"`
	StatusText       string            `json:"statusText"`
	Proto            string            `json:"proto"`
	Headers          []KeyValuePair    `json:"headers"`
	Cookies          []ResponseCookie  `json:"cookies"`
	Body             string            `json:"body"` // Text response or base64 encoded if binary
	ContentType      string            `json:"contentType"`
	Size             int64             `json:"size"`       // Payload body size in bytes
	HeaderSize       int64             `json:"headerSize"` // Headers size in bytes
	TimeMs           int64             `json:"timeMs"`     // Total duration in milliseconds
	Timing           RequestTiming     `json:"timing"`     // Granular timing breakdown
	IsBinary         bool              `json:"isBinary"`   // True if payload is binary
	IsTruncated      bool              `json:"isTruncated"`
	Error            string            `json:"error,omitempty"`
	TestResults      []TestResult      `json:"testResults"`
	ScriptLogs       []string          `json:"scriptLogs"`
	UpdatedVariables map[string]string `json:"updatedVariables,omitempty"`
	RedirectHistory  []string          `json:"redirectHistory"`
}

// --- Git-Friendly Local-First Storage Schemas ---

type ItemType string

const (
	ItemTypeFolder  ItemType = "folder"
	ItemTypeRequest ItemType = "request"
)

type CollectionItem struct {
	ID          string           `json:"id"`
	Name        string           `json:"name"`
	Type        ItemType         `json:"type"`
	Request     *ApiRequest      `json:"request,omitempty"`
	Children    []CollectionItem `json:"children,omitempty"`
	Description string           `json:"description,omitempty"`
}

type Collection struct {
	SchemaVersion string           `json:"schemaVersion"`
	ID            string           `json:"id"`
	Name          string           `json:"name"`
	Description   string           `json:"description,omitempty"`
	Variables     []KeyValuePair   `json:"variables,omitempty"`
	Auth          AuthConfig       `json:"auth,omitempty"`
	Items         []CollectionItem `json:"items"`
}

type Environment struct {
	ID        string         `json:"id"`
	Name      string         `json:"name"`
	Variables []KeyValuePair `json:"variables"`
}
