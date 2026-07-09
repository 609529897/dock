package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

type Store struct {
	mu       sync.RWMutex
	data     StoreData
	filePath string
}

var store = NewStore()

func NewStore() *Store {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir, _ = os.UserHomeDir()
	}
	filePath := filepath.Join(configDir, "project-manager", "projects-config.json")
	s := &Store{filePath: filePath}
	s.load()
	return s
}

func (s *Store) load() {
	raw, err := os.ReadFile(s.filePath)
	if err != nil {
		s.data = StoreData{Theme: "dark"}
		return
	}
	_ = json.Unmarshal(raw, &s.data)
	if s.data.Theme == "" {
		s.data.Theme = "dark"
	}
}

func (s *Store) save() {
	_ = os.MkdirAll(filepath.Dir(s.filePath), 0755)
	raw, _ := json.MarshalIndent(s.data, "", "  ")
	_ = os.WriteFile(s.filePath, raw, 0644)
}

func (s *Store) GetProjects() []ProjectConfig {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]ProjectConfig, len(s.data.Projects))
	copy(out, s.data.Projects)
	return out
}

func (s *Store) AddProject(config ProjectConfig) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, p := range s.data.Projects {
		if p.Path == config.Path {
			return false
		}
	}
	s.data.Projects = append(s.data.Projects, config)
	s.save()
	return true
}

func (s *Store) RemoveProject(projectPath string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.Projects = filterProjects(s.data.Projects, projectPath)
	s.save()
}

func (s *Store) UpdateProject(projectPath string, update ProjectConfigUpdate) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, p := range s.data.Projects {
		if p.Path != projectPath {
			continue
		}
		if update.Name != nil {
			p.Name = *update.Name
		}
		if update.Command != nil {
			p.Command = *update.Command
		}
		s.data.Projects[i] = p
		break
	}
	s.save()
}

func (s *Store) GetTheme() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.data.Theme
}

func (s *Store) SetTheme(theme string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.Theme = theme
	s.save()
}

func filterProjects(projects []ProjectConfig, exclude string) []ProjectConfig {
	out := make([]ProjectConfig, 0, len(projects))
	for _, p := range projects {
		if p.Path != exclude {
			out = append(out, p)
		}
	}
	return out
}
