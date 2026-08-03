import { contextBridge, ipcRenderer, webUtils } from 'electron'

export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export type CreateNoteInput = Pick<Note, 'title' | 'content'>
export type FileCommand = 'open' | 'save' | 'save-as' | 'settings'
export type ThemePreference = 'light' | 'dark' | 'system'
export type EditorMode = 'edit' | 'split' | 'preview'
export type EditorFontFamily = 'Cascadia Code' | 'Consolas' | 'Microsoft YaHei' | 'system-ui'

export interface AppSettings {
  version: 1
  theme: ThemePreference
  editorFontFamily: EditorFontFamily
  editorFontSize: number
  defaultEditorMode: EditorMode
  wordWrap: boolean
  imageDirectoryName: string
  showTrayIcon: boolean
}

export interface SettingsLoadResult {
  settings: AppSettings
  warning: string | null
}

export interface MarkdownFileDocument {
  filePath: string
  fileName: string
  content: string
}

export interface DocumentExportInput {
  title: string
  content: string
  sourceFilePath?: string | null
}

export interface RecentFile {
  filePath: string
  fileName: string
  lastOpenedAt: string
}

export type SessionDocumentRef =
  | { kind: 'note'; id: string }
  | { kind: 'file'; filePath: string }

export interface SessionState {
  version: 1
  documents: SessionDocumentRef[]
  selected: SessionDocumentRef | null
}

contextBridge.exposeInMainWorld('electronAPI', {
  app: {
    ready: (): void => {
      ipcRenderer.send('app:renderer-ready')
    },
    onCloseRequested: (callback: (requestId: number) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, requestId: number) => callback(requestId)
      ipcRenderer.on('app:close-requested', listener)
      return () => ipcRenderer.removeListener('app:close-requested', listener)
    },
    respondToClose: (requestId: number, allowClose: boolean): void => {
      ipcRenderer.send('app:close-response', requestId, allowClose)
    },
    onFileCommand: (callback: (command: FileCommand) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, command: FileCommand) => callback(command)
      ipcRenderer.on('app:file-command', listener)
      return () => ipcRenderer.removeListener('app:file-command', listener)
    },
    onOpenFileRequested: (callback: (filePath: string) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath)
      ipcRenderer.on('app:open-file-requested', listener)
      return () => ipcRenderer.removeListener('app:open-file-requested', listener)
    },
  },
  files: {
    getPathForFile: (file: File): string => webUtils.getPathForFile(file),
    openMarkdown: (): Promise<MarkdownFileDocument | null> =>
      ipcRenderer.invoke('files:openMarkdown'),
    openMarkdownPath: (filePath: string): Promise<MarkdownFileDocument> =>
      ipcRenderer.invoke('files:openMarkdownPath', filePath),
    getRecent: (): Promise<RecentFile[]> => ipcRenderer.invoke('files:getRecent'),
    addRecent: (filePath: string): Promise<RecentFile[]> =>
      ipcRenderer.invoke('files:addRecent', filePath),
    removeRecent: (filePath: string): Promise<RecentFile[]> =>
      ipcRenderer.invoke('files:removeRecent', filePath),
    clearRecent: (): Promise<void> => ipcRenderer.invoke('files:clearRecent'),
    saveMarkdown: (filePath: string, content: string): Promise<MarkdownFileDocument> =>
      ipcRenderer.invoke('files:saveMarkdown', filePath, content),
    saveMarkdownAs: (
      suggestedName: string,
      content: string,
      sourceFilePath?: string | null,
    ): Promise<MarkdownFileDocument | null> =>
      ipcRenderer.invoke('files:saveMarkdownAs', suggestedName, content, sourceFilePath),
    exportDocument: (input: DocumentExportInput): Promise<string | null> =>
      ipcRenderer.invoke('files:exportDocument', input),
  },
  session: {
    get: (): Promise<SessionState> => ipcRenderer.invoke('session:get'),
    save: (state: SessionState): Promise<SessionState> =>
      ipcRenderer.invoke('session:save', state),
  },
  settings: {
    get: (): Promise<SettingsLoadResult> => ipcRenderer.invoke('settings:get'),
    save: (settings: AppSettings): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:save', settings),
  },
  notes: {
    getAll: (): Promise<Note[]> => ipcRenderer.invoke('notes:getAll'),
    add: (input: CreateNoteInput): Promise<Note> => ipcRenderer.invoke('notes:add', input),
    update: (id: string, updates: Partial<CreateNoteInput>): Promise<Note> =>
      ipcRenderer.invoke('notes:update', id, updates),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('notes:delete', id),
    uploadImage: (): Promise<string | null> => ipcRenderer.invoke('notes:uploadImage'),
    pasteImage: (buffer: ArrayBuffer, mimeType: string): Promise<string> =>
      ipcRenderer.invoke('notes:pasteImage', buffer, mimeType),
  },
  extFiles: {
    registerDir: (fileDir: string): Promise<string> =>
      ipcRenderer.invoke('ext-files:registerDir', fileDir),
    unregisterDir: (token: string): Promise<void> =>
      ipcRenderer.invoke('ext-files:unregisterDir', token),
    uploadImage: (filePath: string): Promise<string | null> =>
      ipcRenderer.invoke('ext-files:uploadImage', filePath),
    pasteImage: (filePath: string, buffer: ArrayBuffer, mimeType: string): Promise<string> =>
      ipcRenderer.invoke('ext-files:pasteImage', filePath, buffer, mimeType),
  },
})
