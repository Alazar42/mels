package main

import (
	"context"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct manages the core application lifecycle and provides Wails runtime access.
type App struct {
	ctx            context.Context
	requestService *RequestService
}

// NewApp creates a new App application struct with injected services.
func NewApp(requestService *RequestService) *App {
	return &App{
		requestService: requestService,
	}
}

// startup is called when the app starts. The context is saved so runtime methods can be invoked.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	if a.requestService != nil {
		a.requestService.SetContext(ctx)
	}
}

// shutdown is called when the app is terminating.
func (a *App) shutdown(ctx context.Context) {
	// Cleanup on exit
}

// domReady is called after front-end resources are loaded.
func (a *App) domReady(ctx context.Context) {
	// Front-end DOM ready handler
}

// ExecuteRequest is the primary Wails-bound method to execute HTTP requests from the frontend.
func (a *App) ExecuteRequest(req ApiRequest) ApiResponse {
	if a.requestService == nil {
		return ApiResponse{
			RequestID: req.ID,
			Error:     "RequestService not initialized",
		}
	}
	return a.requestService.ExecuteRequest(req)
}

// CancelRequest cancels an in-flight HTTP request.
func (a *App) CancelRequest(requestID string) bool {
	if a.requestService == nil {
		return false
	}
	return a.requestService.CancelRequest(requestID)
}

// Window Controls for Native-like Desktop Title Bar
func (a *App) WindowMinimise() {
	if a.ctx != nil {
		runtime.WindowMinimise(a.ctx)
	}
}

func (a *App) WindowToggleMaximise() {
	if a.ctx != nil {
		if runtime.WindowIsMaximised(a.ctx) {
			runtime.WindowUnmaximise(a.ctx)
		} else {
			runtime.WindowMaximise(a.ctx)
		}
	}
}

func (a *App) WindowClose() {
	if a.ctx != nil {
		runtime.Quit(a.ctx)
	}
}

// OpenFileDialog opens the native OS file picker and returns the selected path.
func (a *App) OpenFileDialog(title string) (string, error) {
	if a.ctx == nil {
		return "", nil
	}
	return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: title,
	})
}

// SaveFileDialog opens the native OS save dialog and writes the content to disk.
func (a *App) SaveFileDialog(title string, defaultFilename string, content string) (string, error) {
	if a.ctx == nil {
		return "", nil
	}
	filepath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           title,
		DefaultFilename: defaultFilename,
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil || filepath == "" {
		return "", err
	}
	err = os.WriteFile(filepath, []byte(content), 0644)
	return filepath, err
}

// ReadFileContent opens a file dialog and reads the selected file from disk.
func (a *App) ReadFileContent(title string) (string, error) {
	if a.ctx == nil {
		return "", nil
	}
	filepath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: title,
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil || filepath == "" {
		return "", err
	}
	data, err := os.ReadFile(filepath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func getStorageDir() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}
	dir := filepath.Join(homeDir, ".mels", "storage")
	_ = os.MkdirAll(dir, 0755)
	return dir
}

// SaveStorageItem saves data to persistent storage (~/.mels/storage/<key>.json)
func (a *App) SaveStorageItem(key string, value string) error {
	dir := getStorageDir()
	safeKey := filepath.Base(key)
	filePath := filepath.Join(dir, safeKey+".json")
	return os.WriteFile(filePath, []byte(value), 0644)
}

// GetStorageItem loads data from persistent storage (~/.mels/storage/<key>.json)
func (a *App) GetStorageItem(key string) (string, error) {
	dir := getStorageDir()
	safeKey := filepath.Base(key)
	filePath := filepath.Join(dir, safeKey+".json")
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// DeleteStorageItem removes an item from persistent storage
func (a *App) DeleteStorageItem(key string) error {
	dir := getStorageDir()
	safeKey := filepath.Base(key)
	filePath := filepath.Join(dir, safeKey+".json")
	return os.Remove(filePath)
}

// ClearAllStorage wipes all persistent storage in ~/.mels/storage/
func (a *App) ClearAllStorage() error {
	dir := getStorageDir()
	return os.RemoveAll(dir)
}
