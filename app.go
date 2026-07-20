package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

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
		DevUrl:  a.DetectDevUrl(folderPath),
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

func (a *App) OpenInBrowser(url string) OpenInBrowserResult {
	if url == "" {
		return OpenInBrowserResult{Success: false, Error: "地址为空"}
	}
	cmd := exec.Command("open", url)
	if err := cmd.Run(); err == nil {
		return OpenInBrowserResult{Success: true}
	}
	return OpenInBrowserResult{Success: false, Error: "无法打开浏览器"}
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

func (a *App) DetectDevUrl(projectPath string) string {
	packageJsonPath := filepath.Join(projectPath, "package.json")
	data, err := os.ReadFile(packageJsonPath)
	if err != nil {
		return ""
	}

	var pkg struct {
		Scripts         map[string]string `json:"scripts"`
		Dependencies    map[string]string `json:"dependencies"`
		DevDependencies map[string]string `json:"devDependencies"`
	}
	if err := json.Unmarshal(data, &pkg); err != nil {
		return ""
	}

	framework := ""
	port := 0
	allDeps := make(map[string]string)
	for k, v := range pkg.Dependencies {
		allDeps[k] = v
	}
	for k, v := range pkg.DevDependencies {
		allDeps[k] = v
	}

	for _, scriptName := range []string{"dev", "start", "serve"} {
		cmd := pkg.Scripts[scriptName]
		if cmd == "" {
			continue
		}
		if p := parsePortFromCommand(cmd); p > 0 {
			port = p
		}
		if f := detectFrameworkFromCommand(cmd, allDeps); f != "" {
			framework = f
			break
		}
	}

	if framework == "" {
		framework = detectFrameworkFromDeps(allDeps)
	}

	if port == 0 {
		port = parsePortFromConfigFiles(projectPath, framework)
	}
	if port == 0 {
		port = defaultPortForFramework(framework)
	}
	if port == 0 {
		return ""
	}

	return fmt.Sprintf("http://localhost:%d", port)
}

func detectFrameworkFromCommand(cmd string, deps map[string]string) string {
	lower := strings.ToLower(cmd)
	patterns := []struct {
		key   string
		name  string
		dep   string
	}{
		{"vite", "vite", "vite"},
		{"next", "next", "next"},
		{"nuxt", "nuxt", "nuxt"},
		{"vue-cli-service", "vue-cli", "@vue/cli-service"},
		{"react-scripts", "cra", "react-scripts"},
		{"astro", "astro", "astro"},
		{"gatsby", "gatsby", "gatsby"},
		{"svelte-kit", "sveltekit", "@sveltejs/kit"},
		{"remix", "remix", "@remix-run/dev"},
		{"quasar", "quasar", "quasar"},
	}
	for _, p := range patterns {
		if strings.Contains(lower, p.key) {
			return p.name
		}
		if _, ok := deps[p.dep]; ok {
			return p.name
		}
	}
	return ""
}

func detectFrameworkFromDeps(deps map[string]string) string {
	checks := []struct {
		dep  string
		name string
	}{
		{"vite", "vite"},
		{"@sveltejs/kit", "sveltekit"},
		{"next", "next"},
		{"nuxt", "nuxt"},
		{"@vue/cli-service", "vue-cli"},
		{"vue-cli-service", "vue-cli"},
		{"react-scripts", "cra"},
		{"astro", "astro"},
		{"gatsby", "gatsby"},
		{"@remix-run/dev", "remix"},
		{"quasar", "quasar"},
	}
	for _, c := range checks {
		if _, ok := deps[c.dep]; ok {
			return c.name
		}
	}
	return ""
}

func parsePortFromCommand(cmd string) int {
	re := regexp.MustCompile(`(?:--port|-p)\s*(?:=|\s)?\s*(\d+)`)
	matches := re.FindStringSubmatch(cmd)
	if len(matches) >= 2 {
		if p, err := strconv.Atoi(matches[1]); err == nil {
			return p
		}
	}
	return 0
}

func parsePortFromConfigFiles(projectPath, framework string) int {
	configs := map[string]struct {
		files []string
		regex string
	}{
		"vite": {
			files: []string{"vite.config.js", "vite.config.ts", "vite.config.mjs", "vite.config.cjs"},
			regex: `server\s*:\s*\{[^}]*?port\s*:\s*(\d+)`,
		},
		"next": {
			files: []string{"next.config.js", "next.config.ts", "next.config.mjs"},
			regex: `port\s*:\s*(\d+)`,
		},
		"vue-cli": {
			files: []string{"vue.config.js", "vue.config.ts"},
			regex: `devServer\s*:\s*\{[^}]*?port\s*:\s*(\d+)`,
		},
		"nuxt": {
			files: []string{"nuxt.config.js", "nuxt.config.ts", "nuxt.config.mjs"},
			regex: `devServer\s*:\s*\{[^}]*?port\s*:\s*(\d+)`,
		},
		"astro": {
			files: []string{"astro.config.mjs", "astro.config.js", "astro.config.ts"},
			regex: `server\s*:\s*\{[^}]*?port\s*:\s*(\d+)`,
		},
	}

	cfg, ok := configs[framework]
	if !ok {
		return 0
	}

	re := regexp.MustCompile(cfg.regex)
	for _, file := range cfg.files {
		data, err := os.ReadFile(filepath.Join(projectPath, file))
		if err != nil {
			continue
		}
		matches := re.FindStringSubmatch(string(data))
		if len(matches) >= 2 {
			if p, err := strconv.Atoi(matches[1]); err == nil {
				return p
			}
		}
	}
	return 0
}

func defaultPortForFramework(framework string) int {
	switch framework {
	case "vite", "sveltekit":
		return 5173
	case "next", "nuxt", "cra", "remix":
		return 3000
	case "vue-cli", "quasar":
		return 8080
	case "gatsby":
		return 8000
	case "astro":
		return 4321
	}
	return 0
}
