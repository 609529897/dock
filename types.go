package main

type ProjectConfig struct {
	Path    string `json:"path"`
	Name    string `json:"name"`
	Command string `json:"command"`
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
}

type AddProjectResult struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

type StartProjectResult struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}
