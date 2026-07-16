import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ProjectConfig, ProcessStatus } from '../shared/types'
import EditorPicker from './EditorPicker'

interface ProjectItemProps {
  project: ProjectConfig
  isSelected: boolean
  status: ProcessStatus
  onSelect: () => void
  onRemove: () => void
  onStart: () => void
  onStop: () => void
  onOpenInEditor: (path: string, editor: string) => void
}

function PlayIcon(): JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M2 1.25v7.5l6.5-3.75z" />
    </svg>
  )
}

function StopIcon(): JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="7" height="7" rx="1.3" />
    </svg>
  )
}

function CodeIcon(): JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 2.5L1.5 5l2 2.5" />
      <path d="M6.5 2.5l2 2.5-2 2.5" />
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
  onStop,
  onOpenInEditor
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
      <span className="project-item-name" title={project.name}>{project.name}</span>
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
        <EditorPicker
          projectPath={project.path}
          onOpen={onOpenInEditor}
          trigger={
            <button
              className="project-item-action-btn project-item-code"
              title="用编辑器打开"
            >
              <CodeIcon />
            </button>
          }
        />
        <button
          className="project-item-action-btn project-item-remove"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          title="移除项目"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M2 2l6 6M8 2l-6 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
