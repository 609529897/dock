import { useState, useEffect, useCallback } from 'react'
import type { ProjectConfig, ProcessStatus, LogEntry } from './shared/types'
import { api } from './api/wails'
import Sidebar from './components/Sidebar'
import LogPanel from './components/LogPanel'
import Toolbar from './components/Toolbar'
import './App.css'

export default function App(): JSX.Element {
  const [projects, setProjects] = useState<ProjectConfig[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<Record<string, ProcessStatus>>({})
  const [logs, setLogs] = useState<Record<string, LogEntry[]>>({})
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const selectedProject = projects.find((p) => p.path === selectedPath) ?? null

  const loadProjects = useCallback(async () => {
    const list = await api.getProjects()
    setProjects(list)
    const s = await api.getAllStatuses()
    setStatuses(s)
  }, [])

  const loadTheme = useCallback(async () => {
    const t = await api.getTheme()
    setTheme(t as 'dark' | 'light')
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  useEffect(() => {
    loadProjects()
    loadTheme()
  }, [loadProjects, loadTheme])

  useEffect(() => {
    const unsub = api.onProjectLog((log: LogEntry) => {
      setLogs((prev) => {
        const existing = prev[log.projectPath] ?? []
        const updated = [...existing, log]
        if (updated.length > 2000) {
          return { ...prev, [log.projectPath]: updated.slice(-2000) }
        }
        return { ...prev, [log.projectPath]: updated }
      })
    })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = api.onProcessStatusChange((data) => {
      setStatuses((prev) => ({ ...prev, [data.projectPath]: data.status }))
    })
    return unsub
  }, [])

  const toggleTheme = useCallback(async () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    await api.setTheme(next)
  }, [theme])

  const handleAddProject = useCallback(
    async (folderPath: string) => {
      const result = await api.addProject(folderPath)
      if (result.success) {
        await loadProjects()
      }
      return result
    },
    [loadProjects]
  )

  useEffect(() => {
    window.runtime.OnFileDrop(
      (_x: number, _y: number, paths: string[]) => {
        if (paths.length > 0) {
          handleAddProject(paths[0])
        }
      },
      true
    )
    return () => window.runtime.OnFileDropOff()
  }, [handleAddProject])

  const handleRemoveProject = useCallback(
    async (projectPath: string) => {
      await api.removeProject(projectPath)
      if (selectedPath === projectPath) {
        setSelectedPath(null)
      }
      await loadProjects()
    },
    [loadProjects, selectedPath]
  )

  const handleUpdateProject = useCallback(
    async (projectPath: string, config: Partial<ProjectConfig>) => {
      await api.updateProject(projectPath, config)
      await loadProjects()
    },
    [loadProjects]
  )

  const handleReorderProjects = useCallback(
    async (reorderedProjects: ProjectConfig[]) => {
      setProjects(reorderedProjects)
      await api.reorderProjects(reorderedProjects)
    },
    []
  )

  const handleStart = useCallback(
    async (projectPath: string) => {
      setStatuses((prev) => ({ ...prev, [projectPath]: 'starting' }))
      await api.startProject(projectPath)
    },
    []
  )

  const handleStop = useCallback(async (projectPath: string) => {
    await api.stopProject(projectPath)
  }, [])

  return (
    <div className="app">
      <Toolbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onClearAll={async () => {
          for (const p of projects) {
            await api.removeProject(p.path)
          }
          setSelectedPath(null)
          await loadProjects()
        }}
      />
      <div className="app-body">
        <Sidebar
          projects={projects}
          selectedPath={selectedPath}
          statuses={statuses}
          onSelect={setSelectedPath}
          onAdd={handleAddProject}
          onRemove={handleRemoveProject}
          onReorder={handleReorderProjects}
          onStart={handleStart}
          onStop={handleStop}
        />
        <main className="main-content">
          {selectedProject ? (
            <>
              <div className="project-detail-header">
                <div className="project-title-group">
                  <span
                    className={`status-dot ${statuses[selectedProject.path] === 'running' ? 'running' : ''}`}
                  />
                  <div>
                    <h2 className="project-title">{selectedProject.name}</h2>
                    <span className="project-path-label">{selectedProject.path}</span>
                  </div>
                </div>
              </div>
              <div className="project-detail-body">
                <div className="command-section">
                  <div className="command-card">
                    <label className="command-label">启动命令</label>
                    <div className="command-input-row">
                      <input
                        className="command-input"
                        value={selectedProject.command}
                        onChange={(e) =>
                          handleUpdateProject(selectedProject.path, { command: e.target.value })
                        }
                        placeholder="yarn run dev"
                        spellCheck={false}
                      />
                      <button
                        className={`btn-action ${statuses[selectedProject.path] === 'running' ? 'btn-stop' : 'btn-start'}`}
                        onClick={() => {
                          if (statuses[selectedProject.path] === 'running') {
                            handleStop(selectedProject.path)
                          } else {
                            handleStart(selectedProject.path)
                          }
                        }}
                      >
                        {statuses[selectedProject.path] === 'running' ? '停止' : '启动'}
                      </button>
                    </div>
                  </div>
                </div>
                <LogPanel logs={logs[selectedProject.path] ?? []} status={statuses[selectedProject.path]} />
              </div>
            </>
          ) : (
            <div className="empty-state">
              <svg className="empty-icon" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity="0.35">
                <path d="M8 20a4 4 0 0 1 4-4h14l6 6h24a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" />
                <path d="M8 28h48" strokeWidth="1.2" />
              </svg>
              <p className="empty-text">从左侧添加项目文件夹</p>
              <p className="empty-hint">点击左侧添加按钮，或将文件夹拖拽到侧边栏添加</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
