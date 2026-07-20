package main

type ProjectConfig struct {
	Path    string `json:"path"`
	Name    string `json:"name"`
	Command string `json:"command"`
	DevUrl  string `json:"devUrl"`
}

type StoreData struct {
	Projects []ProjectConfig `json:"projects"`
	Theme    string          `json:"theme"`
}

type LogEntry struct {
	ProjectPath string `json:"projectPath"`
	Text        string `json:"text"`
	Type        string `json:"type"`
	Timestamp   int64  `json:"timestamp"`
}

type ProcessStatus string

const (
	StatusRunning  ProcessStatus = "running"
	StatusStopped  ProcessStatus = "stopped"
	StatusStarting ProcessStatus = "starting"
)

type ProjectConfigUpdate struct {
	Name    *string `json:"name,omitempty"`
	Command *string `json:"command,omitempty"`
	DevUrl  *string `json:"devUrl,omitempty"`
}

type AddProjectResult struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

type StartProjectResult struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

type OpenInEditorResult struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

type OpenInBrowserResult struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

type EditorInfo struct {
	Name  string `json:"name"`
	Label string `json:"label"`
	Path  string `json:"path"`
}
