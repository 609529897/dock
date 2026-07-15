import { useState, useCallback } from 'react'
import type { ProjectConfig, ProcessStatus } from '../shared/types'
import { api } from '../api/wails'
import ProjectItem from './ProjectItem'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'

interface SidebarProps {
  projects: ProjectConfig[]
  selectedPath: string | null
  statuses: Record<string, ProcessStatus>
  onSelect: (path: string) => void
  onAdd: (folderPath: string) => Promise<{ success: boolean; error?: string }>
  onRemove: (path: string) => Promise<void>
  onReorder: (projects: ProjectConfig[]) => Promise<void>
  onStart: (path: string) => Promise<void>
  onStop: (path: string) => Promise<void>
}

function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = [...array]
  const [moved] = newArray.splice(from, 1)
  newArray.splice(to, 0, moved)
  return newArray
}

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0
})

export default function Sidebar({
  projects,
  selectedPath,
  statuses,
  onSelect,
  onAdd,
  onRemove,
  onReorder,
  onStart,
  onStop
}: SidebarProps): JSX.Element {
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleSelectFolder = useCallback(async () => {
    const folderPath = await api.selectFolder()
    if (!folderPath) return

    const result = await onAdd(folderPath)
    if (!result.success) {
      setError(result.error ?? '添加失败')
      setTimeout(() => setError(null), 3000)
    }
  }, [onAdd])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const fromIndex = projects.findIndex((p) => p.path === active.id)
      const toIndex = projects.findIndex((p) => p.path === over.id)
      if (fromIndex === -1 || toIndex === -1) return

      const newProjects = arrayMove(projects, fromIndex, toIndex)
      await onReorder(newProjects)
    },
    [projects, onReorder]
  )

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">项目</span>
        <span className="sidebar-count">{projects.length}</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext
          items={projects.map((p) => p.path)}
          strategy={verticalListSortingStrategy}
        >
          <div className="sidebar-list">
            {projects.length === 0 ? (
              <div className="sidebar-empty">
                <span className="sidebar-empty-text">暂无项目</span>
                <span className="sidebar-empty-hint">点击下方按钮添加</span>
              </div>
            ) : (
              projects.map((project) => (
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
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

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
