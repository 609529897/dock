export interface ProjectConfig {
  path: string
  name: string
  command: string
  devUrl: string
}

export interface StoreData {
  projects: ProjectConfig[]
  theme: 'dark' | 'light'
}

export type ProcessStatus = 'running' | 'stopped' | 'starting'

export interface LogEntry {
  projectPath: string
  text: string
  type: 'stdout' | 'stderr'
  timestamp: number
}

export interface AddProjectResult {
  success: boolean
  error?: string
}

export interface StartProjectResult {
  success: boolean
  error?: string
}

export interface OpenInEditorResult {
  success: boolean
  error?: string
}

export interface OpenInBrowserResult {
  success: boolean
  error?: string
}

export interface EditorInfo {
  name: string
  label: string
  path: string
}
