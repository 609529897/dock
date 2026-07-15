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
      <div className="app-sidebar-column">
        <div className="sidebar-top-drag" />
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
      </div>
      <div className="app-main-column">
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
                <LogPanel
                  logs={logs[selectedProject.path] ?? []}
                  status={statuses[selectedProject.path]}
                  onClear={() => setLogs((prev) => ({ ...prev, [selectedProject.path]: [] }))}
                />
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
              </div>
              <div className="empty-content">
                <p className="empty-title">还没有添加项目</p>
                <p className="empty-hint">点击左侧 + 按钮或拖拽文件夹到侧边栏添加</p>
              </div>
              <div className="empty-steps">
                <div className="empty-step">
                  <span className="empty-step-num">1</span>
                  <span>添加项目</span>
                </div>
                <span className="empty-step-arrow">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M4.5 2.5L8 6l-3.5 3.5" />
                  </svg>
                </span>
                <div className="empty-step">
                  <span className="empty-step-num">2</span>
                  <span>配置命令</span>
                </div>
                <span className="empty-step-arrow">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M4.5 2.5L8 6l-3.5 3.5" />
                  </svg>
                </span>
                <div className="empty-step">
                  <span className="empty-step-num">3</span>
                  <span>一键启动</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
