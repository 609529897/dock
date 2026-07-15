import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ProjectConfig, ProcessStatus } from '../shared/types'

interface ProjectItemProps {
  project: ProjectConfig
  isSelected: boolean
  status: ProcessStatus
  onSelect: () => void
  onRemove: () => void
  onStart: () => void
  onStop: () => void
}

function PlayIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M2.5 1.5v9l8-4.5z" />
    </svg>
  )
}

function StopIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <rect x="2" y="2" width="8" height="8" rx="1.5" />
    </svg>
  )
}

export default function ProjectItem({
  project,
  isSelected,
  status,
  onSelect,
  onRemove,
  onStart,
  onStop
}: ProjectItemProps): JSX.Element {
  const isRunning = status === 'running'
  const isStarting = status === 'starting'

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: project.path })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'project-item',
        isSelected ? 'project-item-selected' : '',
        isDragging ? 'project-item-dragging' : ''
      ].join(' ')}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <span className={`project-status-dot ${isRunning ? 'running' : ''}`} />
      <span className="project-item-name">{project.name}</span>
      <div className="project-item-hover-actions">
        <button
          className="project-item-action-btn"
          onClick={(e) => {
            e.stopPropagation()
            if (isRunning) {
              onStop()
            } else if (!isStarting) {
              onStart()
            }
          }}
          disabled={isStarting}
          title={isRunning ? '停止' : isStarting ? '启动中...' : '启动'}
        >
          {isStarting ? (
            <span className="project-item-spinner" />
          ) : isRunning ? (
            <StopIcon />
          ) : (
            <PlayIcon />
          )}
        </button>
        <button
          className="project-item-action-btn project-item-remove"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          title="移除项目"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
