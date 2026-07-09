import type { ProjectConfig, LogEntry, ProcessStatus } from '../shared/types'

export const api = {
  getProjects: (): Promise<ProjectConfig[]> => window.go.main.App.GetProjects(),

  addProject: (folderPath: string) => window.go.main.App.AddProject(folderPath),

  removeProject: (projectPath: string) => window.go.main.App.RemoveProject(projectPath),

  updateProject: (projectPath: string, config: Partial<ProjectConfig>) =>
    window.go.main.App.UpdateProject(projectPath, config),

  reorderProjects: (projects: ProjectConfig[]) => window.go.main.App.ReorderProjects(projects),

  startProject: (projectPath: string) => window.go.main.App.StartProject(projectPath),

  stopProject: (projectPath: string) => window.go.main.App.StopProject(projectPath),

  getAllStatuses: (): Promise<Record<string, ProcessStatus>> =>
    window.go.main.App.GetAllStatuses(),

  getTheme: (): Promise<string> => window.go.main.App.GetTheme(),

  setTheme: (theme: string) => window.go.main.App.SetTheme(theme),

  selectFolder: (): Promise<string> => window.go.main.App.SelectFolder(),

  onProjectLog: (callback: (log: LogEntry) => void) => {
    window.runtime.EventsOn('project:log', callback)
    return () => window.runtime.EventsOff('project:log')
  },

  onProcessStatusChange: (
    callback: (data: { projectPath: string; status: ProcessStatus }) => void
  ) => {
    window.runtime.EventsOn('process:status-change', callback)
    return () => window.runtime.EventsOff('process:status-change')
  }
}
