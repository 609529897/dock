package main

import (
	"context"
	"os"
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
