import { useRef, useEffect } from 'react'
import type { LogEntry, ProcessStatus } from '../shared/types'

interface LogPanelProps {
  logs: LogEntry[]
  status?: ProcessStatus
  onClear?: () => void
}

export default function LogPanel({ logs, status, onClear }: LogPanelProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

  /** 当用户手动滚动时判断是否启用自动滚动 */
  const handleScroll = (): void => {
    const el = containerRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
    autoScrollRef.current = isAtBottom
  }

  /** 新日志写入时自动滚动到底部 */
  useEffect(() => {
    if (autoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="log-panel">
      <div className="log-panel-header">
        <div className="log-panel-title">
          <span className={`log-indicator ${status === 'running' ? 'running' : ''}`} />
          运行日志
        </div>
        <span className="log-panel-count">
          {logs.length > 0 && (
            <button className="log-btn-clear" onClick={onClear} title="清除日志">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1.5 3h9M4 3V1.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V3M2.5 3v7a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V3" />
              </svg>
            </button>
          )}
          {logs.length} 行
        </span>
      </div>
      <div
        className="log-panel-content"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {logs.length === 0 ? (
          <div className="log-empty">启动项目后将在此处显示实时运行日志</div>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              className={`log-line ${log.type === 'stderr' ? 'log-error' : ''}`}
            >
              <span className="log-text">{log.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
