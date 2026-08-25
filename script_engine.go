package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/dop251/goja"
)

// ScriptEngine executes pre-request and post-request JavaScript code in an isolated Goja VM.
type ScriptEngine struct {
	mu sync.Mutex
}

// NewScriptEngine creates a new instance of ScriptEngine.
func NewScriptEngine() *ScriptEngine {
	return &ScriptEngine{}
}

// ScriptResult encapsulates the output of script execution.
type ScriptResult struct {
	TestResults      []TestResult      `json:"testResults"`
	Logs             []string          `json:"logs"`
	UpdatedVariables map[string]string `json:"updatedVariables"`
	Error            string            `json:"error,omitempty"`
}

// RunScript executes JavaScript with either pre-request or test environment.
func (e *ScriptEngine) RunScript(
	script string,
	req *ApiRequest,
	resp *ApiResponse,
	initialVars map[string]string,
	isTest bool,
) ScriptResult {
	e.mu.Lock()
	defer e.mu.Unlock()

	result := ScriptResult{
		TestResults:      make([]TestResult, 0),
		Logs:             make([]string, 0),
		UpdatedVariables: make(map[string]string),
	}

	for k, v := range initialVars {
		result.UpdatedVariables[k] = v
	}

	trimmedScript := strings.TrimSpace(script)
	if trimmedScript == "" {
		return result
	}

	vm := goja.New()
	vm.SetFieldNameMapper(goja.TagFieldNameMapper("json", true))

	// 1. Console Object
	consoleObj := vm.NewObject()
	_ = consoleObj.Set("log", func(call goja.FunctionCall) goja.Value {
		var parts []string
		for _, arg := range call.Arguments {
			parts = append(parts, fmt.Sprintf("%v", arg.Export()))
		}
		result.Logs = append(result.Logs, strings.Join(parts, " "))
		return goja.Undefined()
	})
	_ = consoleObj.Set("error", func(call goja.FunctionCall) goja.Value {
		var parts []string
		for _, arg := range call.Arguments {
			parts = append(parts, fmt.Sprintf("%v", arg.Export()))
		}
		result.Logs = append(result.Logs, "[ERROR] "+strings.Join(parts, " "))
		return goja.Undefined()
	})
	_ = vm.Set("console", consoleObj)

	// 2. Mels / PM Global Object
	melsObj := vm.NewObject()

	// Environment / Variables accessors
	envObj := vm.NewObject()
	_ = envObj.Set("get", func(key string) string {
		return result.UpdatedVariables[key]
	})
	_ = envObj.Set("set", func(key, value string) {
		result.UpdatedVariables[key] = value
	})
	_ = envObj.Set("has", func(key string) bool {
		_, exists := result.UpdatedVariables[key]
		return exists
	})
	_ = envObj.Set("unset", func(key string) {
		delete(result.UpdatedVariables, key)
	})

	_ = melsObj.Set("environment", envObj)
	_ = melsObj.Set("variables", envObj)
	_ = melsObj.Set("collectionVariables", envObj)

	_ = melsObj.Set("getEnvironmentVariable", func(key string) string {
		return result.UpdatedVariables[key]
	})
	_ = melsObj.Set("setEnvironmentVariable", func(key, value string) {
		result.UpdatedVariables[key] = value
	})

	// Request Object
	reqObj := vm.NewObject()
	if req != nil {
		_ = reqObj.Set("url", req.URL)
		_ = reqObj.Set("method", req.Method)
		headersMap := make(map[string]string)
		for _, h := range req.Headers {
			if h.Enabled && h.Key != "" {
				headersMap[h.Key] = h.Value
			}
		}
		_ = reqObj.Set("headers", headersMap)
		_ = reqObj.Set("body", req.Body.Raw)
	}
	_ = melsObj.Set("request", reqObj)

	// Response Object (available in test scripts)
	if resp != nil {
		respObj := vm.NewObject()
		_ = respObj.Set("code", resp.StatusCode)
		_ = respObj.Set("status", resp.StatusText)
		_ = respObj.Set("body", resp.Body)
		_ = respObj.Set("responseTime", resp.TimeMs)

		headersMap := make(map[string]string)
		for _, h := range resp.Headers {
			headersMap[h.Key] = h.Value
		}
		_ = respObj.Set("headers", headersMap)

		_ = respObj.Set("json", func() (interface{}, error) {
			var parsed interface{}
			if err := json.Unmarshal([]byte(resp.Body), &parsed); err != nil {
				return nil, err
			}
			return parsed, nil
		})

		_ = respObj.Set("text", func() string {
			return resp.Body
		})

		_ = melsObj.Set("response", respObj)
	}

	// 3. Testing and Assertion Framework
	_ = melsObj.Set("test", func(name string, fn goja.Callable) {
		_, err := fn(goja.Undefined())
		if err != nil {
			result.TestResults = append(result.TestResults, TestResult{
				Name:   name,
				Passed: false,
				Error:  err.Error(),
			})
		} else {
			result.TestResults = append(result.TestResults, TestResult{
				Name:   name,
				Passed: true,
			})
		}
	})

	// Assertion Helper Library injected into JS runtime
	const assertionJS = `
	function expect(actual) {
		return {
			to: {
				equal: function(expected) {
					if (actual !== expected) {
						throw new Error("Expected " + JSON.stringify(actual) + " to equal " + JSON.stringify(expected));
					}
				},
				eql: function(expected) {
					if (JSON.stringify(actual) !== JSON.stringify(expected)) {
						throw new Error("Expected " + JSON.stringify(actual) + " to deeply equal " + JSON.stringify(expected));
					}
				},
				be: {
					a: function(type) {
						if (typeof actual !== type) {
							throw new Error("Expected " + typeof actual + " to be " + type);
						}
					},
					above: function(n) {
						if (actual <= n) {
							throw new Error("Expected " + actual + " to be above " + n);
						}
					},
					below: function(n) {
						if (actual >= n) {
							throw new Error("Expected " + actual + " to be below " + n);
						}
					},
					ok: function() {
						if (!actual) throw new Error("Expected value to be truthy");
					},
					true: function() {
						if (actual !== true) throw new Error("Expected value to be true");
					},
					false: function() {
						if (actual !== false) throw new Error("Expected value to be false");
					},
					null: function() {
						if (actual !== null) throw new Error("Expected value to be null");
					}
				},
				have: {
					status: function(code) {
						var status = mels.response ? mels.response.code : undefined;
						if (status !== code) {
							throw new Error("Expected status " + code + " but got " + status);
						}
					},
					property: function(prop, val) {
						if (!actual || typeof actual !== 'object' || !(prop in actual)) {
							throw new Error("Expected object to have property " + prop);
						}
						if (val !== undefined && actual[prop] !== val) {
							throw new Error("Expected property " + prop + " to equal " + val + " but got " + actual[prop]);
						}
					},
					header: function(headerKey) {
						if (!mels.response || !mels.response.headers) {
							throw new Error("No response headers available");
						}
						var found = false;
						for (var k in mels.response.headers) {
							if (k.toLowerCase() === headerKey.toLowerCase()) {
								found = true;
								break;
							}
						}
						if (!found) {
							throw new Error("Expected response to have header: " + headerKey);
						}
					}
				},
				include: function(item) {
					if (typeof actual === 'string' && !actual.includes(item)) {
						throw new Error("Expected string to include: " + item);
					} else if (Array.isArray(actual) && !actual.includes(item)) {
						throw new Error("Expected array to include: " + item);
					}
				}
			}
		};
	}
	mels.expect = expect;
	var pm = mels; // Postman script compatibility
	`

	_ = vm.Set("mels", melsObj)
	_ = vm.Set("pm", melsObj)

	if _, err := vm.RunString(assertionJS); err != nil {
		result.Error = fmt.Sprintf("Init error: %v", err)
		return result
	}

	// 4. Execute user script with timeout protection
	timeDone := make(chan error, 1)
	go func() {
		defer func() {
			if r := recover(); r != nil {
				timeDone <- fmt.Errorf("runtime panic: %v", r)
			}
		}()
		_, err := vm.RunString(trimmedScript)
		timeDone <- err
	}()

	select {
	case err := <-timeDone:
		if err != nil {
			result.Error = err.Error()
		}
	case <-time.After(3 * time.Second):
		vm.Interrupt("Script execution timed out (limit: 3s)")
		result.Error = "Script execution timed out (limit: 3s)"
	}

	return result
}
