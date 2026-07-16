import type { ProjectConfig, ProcessStatus, AddProjectResult, StartProjectResult, OpenInEditorResult, EditorInfo } from './shared/types'

declare global {
  interface Window {
    go: {
      main: {
        App: {
          GetProjects: () => Promise<ProjectConfig[]>
          AddProject: (folderPath: string) => Promise<AddProjectResult>
          RemoveProject: (projectPath: string) => Promise<void>
          UpdateProject: (projectPath: string, config: Partial<ProjectConfig>) => Promise<void>
          ReorderProjects: (projects: ProjectConfig[]) => Promise<void>
          StartProject: (projectPath: string) => Promise<StartProjectResult>
          StopProject: (projectPath: string) => Promise<void>
          GetAllStatuses: () => Promise<Record<string, ProcessStatus>>
          GetTheme: () => Promise<string>
          SetTheme: (theme: string) => Promise<void>
          SelectFolder: () => Promise<string>
          OpenInEditor: (projectPath: string, editor: string) => Promise<OpenInEditorResult>
          GetAvailableEditors: () => Promise<EditorInfo[]>
        }
      }
    }
    runtime: {
      EventsOn: (eventName: string, callback: (...args: any[]) => void) => void
      EventsOff: (eventName: string) => void
      OnFileDrop: (
        callback: (x: number, y: number, paths: string[]) => void,
        useDropTarget: boolean
      ) => void
      OnFileDropOff: () => void
    }
  }
}

export {}
