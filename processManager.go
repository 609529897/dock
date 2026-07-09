package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	goRuntime "runtime"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type ProcessEntry struct {
	ProjectPath string
	Cmd         *exec.Cmd
	Status      ProcessStatus
}

type ProcessManager struct {
	mu        sync.RWMutex
	processes map[string]*ProcessEntry
	ctx       context.Context
}

var processManager = NewProcessManager()

// 获取用户登录 shell；GUI 启动时 SHELL 可能为空，按平台给默认值
func getUserShell() string {
	if shell := os.Getenv("SHELL"); shell != "" {
		return shell
	}
	if goRuntime.GOOS == "darwin" {
		return "/bin/zsh"
	}
	return "/bin/bash"
}

func NewProcessManager() *ProcessManager {
	return &ProcessManager{
		processes: make(map[string]*ProcessEntry),
	}
}

func (pm *ProcessManager) SetContext(ctx context.Context) {
	pm.ctx = ctx
}

func (pm *ProcessManager) Start(projectPath, command, projectName string) bool {
	pm.mu.Lock()
	if entry, ok := pm.processes[projectPath]; ok && entry.Status == StatusRunning {
		pm.mu.Unlock()
		fmt.Printf("[ProcessManager] %s 已在运行中\n", projectName)
		return false
	}
	pm.mu.Unlock()

	if command == "" {
		return false
	}

	var cmd *exec.Cmd
	if goRuntime.GOOS == "windows" {
		cmd = exec.Command("cmd", "/c", command)
	} else {
		// 通过登录 shell 执行命令，让 shell 加载用户 profile，从而拿到完整 PATH
		cmd = exec.Command(getUserShell(), "-l", "-c", command)
	}
	cmd.Dir = projectPath
	setProcessGroup(cmd)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return false
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return false
	}

	if err := cmd.Start(); err != nil {
		fmt.Printf("[ProcessManager] %s 启动失败: %v\n", projectName, err)
		pm.broadcastLog(projectPath, fmt.Sprintf("启动失败: %v\n", err), "stderr")
		return false
	}

	pm.mu.Lock()
	pm.processes[projectPath] = &ProcessEntry{
		ProjectPath: projectPath,
		Cmd:         cmd,
		Status:      StatusRunning,
	}
	pm.mu.Unlock()

	pm.broadcastStatus(projectPath, StatusRunning)

	go pm.readOutput(stdout, projectPath, "stdout")
	go pm.readOutput(stderr, projectPath, "stderr")

	go func() {
		_ = cmd.Wait()
		fmt.Printf("[ProcessManager] %s 已退出\n", projectName)
		pm.mu.Lock()
		delete(pm.processes, projectPath)
		pm.mu.Unlock()
		pm.broadcastStatus(projectPath, StatusStopped)
	}()

	return true
}

func (pm *ProcessManager) Stop(projectPath string) {
	pm.mu.Lock()
	entry, ok := pm.processes[projectPath]
	if !ok {
		pm.mu.Unlock()
		return
	}
	entry.Status = StatusStopped
	pm.mu.Unlock()

	if entry.Cmd != nil && entry.Cmd.Process != nil {
		pid := entry.Cmd.Process.Pid
		if err := killProcessTree(pid); err != nil {
			fmt.Printf("[ProcessManager] 停止进程 %d 失败: %v\n", pid, err)
		}
		_ = entry.Cmd.Process.Kill()
	}

	pm.mu.Lock()
	delete(pm.processes, projectPath)
	pm.mu.Unlock()
	pm.broadcastStatus(projectPath, StatusStopped)
}

func (pm *ProcessManager) StopAll() {
	pm.mu.RLock()
	paths := make([]string, 0, len(pm.processes))
	for path := range pm.processes {
		paths = append(paths, path)
	}
	pm.mu.RUnlock()
	for _, path := range paths {
		pm.Stop(path)
	}
}

func (pm *ProcessManager) GetStatus(projectPath string) ProcessStatus {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	if entry, ok := pm.processes[projectPath]; ok {
		return entry.Status
	}
	return StatusStopped
}

func (pm *ProcessManager) GetAllStatuses() map[string]ProcessStatus {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	result := make(map[string]ProcessStatus, len(pm.processes))
	for path, entry := range pm.processes {
		result[path] = entry.Status
	}
	return result
}

func (pm *ProcessManager) IsRunning(projectPath string) bool {
	return pm.GetStatus(projectPath) == StatusRunning
}

func (pm *ProcessManager) readOutput(r io.ReadCloser, projectPath, typ string) {
	defer r.Close()
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 1024), 1024*1024)
	for scanner.Scan() {
		pm.broadcastLog(projectPath, scanner.Text(), typ)
	}
}

func (pm *ProcessManager) broadcastLog(projectPath, text, typ string) {
	if pm.ctx == nil {
		return
	}
	runtime.EventsEmit(pm.ctx, "project:log", LogEntry{
		ProjectPath: projectPath,
		Text:        text,
		Type:        typ,
		Timestamp:   time.Now().UnixMilli(),
	})
}

func (pm *ProcessManager) broadcastStatus(projectPath string, status ProcessStatus) {
	if pm.ctx == nil {
		return
	}
	runtime.EventsEmit(pm.ctx, "process:status-change", map[string]interface{}{
		"projectPath": projectPath,
		"status":      status,
	})
}
