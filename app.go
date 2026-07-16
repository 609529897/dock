package main

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	processManager.SetContext(ctx)
}

func (a *App) Shutdown(ctx context.Context) {
	processManager.StopAll()
}

func (a *App) GetProjects() []ProjectConfig {
	return store.GetProjects()
}

func (a *App) AddProject(folderPath string) AddProjectResult {
	if folderPath == "" {
		return AddProjectResult{Success: false, Error: "无效的路径"}
	}
	info, err := os.Stat(folderPath)
	if err != nil {
		return AddProjectResult{Success: false, Error: "路径不存在"}
	}
	if !info.IsDir() {
		return AddProjectResult{Success: false, Error: "请选择文件夹，而非文件"}
	}
	config := ProjectConfig{
		Path:    folderPath,
		Name:    filepath.Base(folderPath),
		Command: "yarn run dev",
	}
	if !store.AddProject(config) {
		return AddProjectResult{Success: false, Error: "该项目已存在列表中"}
	}
	return AddProjectResult{Success: true}
}

func (a *App) RemoveProject(projectPath string) {
	if processManager.IsRunning(projectPath) {
		processManager.Stop(projectPath)
	}
	store.RemoveProject(projectPath)
}

func (a *App) UpdateProject(projectPath string, update ProjectConfigUpdate) {
	store.UpdateProject(projectPath, update)
}

func (a *App) ReorderProjects(projects []ProjectConfig) {
	store.SetProjects(projects)
}

func (a *App) StartProject(projectPath string) StartProjectResult {
	projects := store.GetProjects()
	var project *ProjectConfig
	for i := range projects {
		if projects[i].Path == projectPath {
			project = &projects[i]
			break
		}
	}
	if project == nil {
		return StartProjectResult{Success: false, Error: "项目未找到"}
	}
	if processManager.IsRunning(projectPath) {
		return StartProjectResult{Success: false, Error: "项目已在运行中"}
	}
	if processManager.Start(projectPath, project.Command, project.Name) {
		return StartProjectResult{Success: true}
	}
	return StartProjectResult{Success: false, Error: "启动失败"}
}

func (a *App) StopProject(projectPath string) {
	processManager.Stop(projectPath)
}

func (a *App) GetAllStatuses() map[string]ProcessStatus {
	return processManager.GetAllStatuses()
}

func (a *App) GetTheme() string {
	return store.GetTheme()
}

func (a *App) SetTheme(theme string) {
	store.SetTheme(theme)
}

func (a *App) SelectFolder() string {
	selected, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择项目文件夹",
	})
	if err != nil {
		return ""
	}
	return selected
}

func (a *App) OpenInEditor(projectPath string, editorPath string) OpenInEditorResult {
	cmd := exec.Command(editorPath, projectPath)
	if err := cmd.Run(); err == nil {
		return OpenInEditorResult{Success: true}
	}
	return OpenInEditorResult{Success: false, Error: "无法打开编辑器"}
}

func (a *App) GetAvailableEditors() []EditorInfo {
	type editorCandidate struct {
		Info  EditorInfo
		Paths []string
	}
	candidates := []editorCandidate{
		{Info: EditorInfo{Name: "code", Label: "VS Code"}, Paths: []string{"code", "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"}},
		{Info: EditorInfo{Name: "cursor", Label: "Cursor"}, Paths: []string{"cursor", "/Applications/Cursor.app/Contents/Resources/app/bin/cursor"}},
		{Info: EditorInfo{Name: "trae", Label: "Trae"}, Paths: []string{"trae", "/Applications/Trae.app/Contents/Resources/app/bin/trae", "/Applications/Trae AI.app/Contents/Resources/app/bin/trae"}},
		{Info: EditorInfo{Name: "windsurf", Label: "Windsurf"}, Paths: []string{"windsurf", "/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf"}},
		{Info: EditorInfo{Name: "open", Label: "访达（Finder）"}, Paths: []string{"open"}},
	}
	available := []EditorInfo{}
	for _, c := range candidates {
		if c.Info.Name == "open" {
			c.Info.Path = "open"
			available = append(available, c.Info)
			continue
		}
		foundPath := ""
		for _, p := range c.Paths {
			if resolved, err := exec.LookPath(p); err == nil {
				foundPath = resolved
				break
			}
			if _, err := os.Stat(p); err == nil {
				foundPath = p
				break
			}
		}
		if foundPath != "" {
			c.Info.Path = foundPath
			available = append(available, c.Info)
		}
	}
	return available
}
