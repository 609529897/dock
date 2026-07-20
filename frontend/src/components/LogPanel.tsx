import { useRef, useEffect } from 'react'
import type { LogEntry, ProcessStatus } from '../shared/types'
import { api } from '../api/wails'

interface LogPanelProps {
  logs: LogEntry[]
  status?: ProcessStatus
  onClear?: () => void
}

export default function LogPanel({ logs, status, onClear }: LogPanelProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

  const renderClickableText = (text: string): (React.ReactNode | string)[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <button
            key={index}
            className="log-link"
            onClick={() => api.openInBrowser(part)}
            title={part}
          >
            {part}
          </button>
        )
      }
      return part
    })
  }

  const getLogLineClass = (text: string, type: LogEntry['type']): string => {
    const lower = text.toLowerCase()
    if (type === 'stderr' || lower.includes('error') || lower.includes('failed') || lower.includes('fatal')) {
      return 'log-error'
    }
    if (lower.includes('warning') || lower.includes('warn')) {
      return 'log-warning'
    }
    if (lower.includes('success') || lower.includes('ready') || lower.includes('done') || lower.includes('compiled successfully')) {
      return 'log-success'
    }
    return ''
  }

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
              className={`log-line ${getLogLineClass(log.text, log.type)}`}
            >
              <span className="log-text">{renderClickableText(log.text)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
