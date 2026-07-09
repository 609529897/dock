import { useState, useCallback } from 'react'
import type { ProjectConfig, ProcessStatus } from '../shared/types'
import { api } from '../api/wails'
import ProjectItem from './ProjectItem'

interface SidebarProps {
  projects: ProjectConfig[]
  selectedPath: string | null
  statuses: Record<string, ProcessStatus>
  onSelect: (path: string) => void
  onAdd: (folderPath: string) => Promise<{ success: boolean; error?: string }>
  onRemove: (path: string) => Promise<void>
  onStart: (path: string) => Promise<void>
  onStop: (path: string) => Promise<void>
}

export default function Sidebar({
  projects,
  selectedPath,
  statuses,
  onSelect,
  onAdd,
  onRemove,
  onStart,
  onStop
}: SidebarProps): JSX.Element {
  const [error, setError] = useState<string | null>(null)

  const handleSelectFolder = useCallback(async () => {
    const folderPath = await api.selectFolder()
    if (!folderPath) return

    const result = await onAdd(folderPath)
    if (!result.success) {
      setError(result.error ?? '添加失败')
      setTimeout(() => setError(null), 3000)
    }
  }, [onAdd])

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">项目</span>
        <span className="sidebar-count">{projects.length}</span>
      </div>

      <div className="sidebar-list">
        {projects.map((project) => (
          <ProjectItem
            key={project.path}
            project={project}
            isSelected={selectedPath === project.path}
            status={statuses[project.path] ?? 'stopped'}
            onSelect={() => onSelect(project.path)}
            onRemove={() => onRemove(project.path)}
            onStart={() => onStart(project.path)}
            onStop={() => onStop(project.path)}
          />
        ))}
      </div>

      <div
        className="sidebar-drop-zone"
        role="button"
        tabIndex={0}
        onClick={handleSelectFolder}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.currentTarget.click()
          }
        }}
      >
        <span className="drop-zone-icon">+</span>
        <span className="drop-zone-text">点击或拖拽文件夹到此处添加</span>
      </div>

      {error && (
        <div className="sidebar-error">
          {error}
        </div>
      )}
    </aside>
  )
}
