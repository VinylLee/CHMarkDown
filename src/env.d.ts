/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

type CreateNoteInput = Pick<Note, 'title' | 'content'>
type FileCommand = 'open' | 'save' | 'save-as' | 'settings'
type ThemePreference = 'light' | 'dark' | 'system'
type EditorMode = 'edit' | 'split' | 'preview'
type EditorFontFamily = 'Cascadia Code' | 'Consolas' | 'Microsoft YaHei' | 'system-ui'

interface AppSettings {
  version: 1
  theme: ThemePreference
  editorFontFamily: EditorFontFamily
  editorFontSize: number
  defaultEditorMode: EditorMode
  wordWrap: boolean
  imageDirectoryName: string
  showTrayIcon: boolean
}

interface SettingsLoadResult {
  settings: AppSettings
  warning: string | null
}

interface MarkdownFileDocument {
  filePath: string
  fileName: string
  content: string
}

interface DocumentExportInput {
  title: string
  content: string
  sourceFilePath?: string | null
}

interface RecentFile {
  filePath: string
  fileName: string
  lastOpenedAt: string
}

type SessionDocumentRef =
  | { kind: 'note'; id: string }
  | { kind: 'file'; filePath: string }

interface SessionState {
  version: 1
  documents: SessionDocumentRef[]
  selected: SessionDocumentRef | null
}

interface Window {
  electronAPI: {
    app: {
      ready: () => void
      onCloseRequested: (callback: (requestId: number) => void) => () => void
      respondToClose: (requestId: number, allowClose: boolean) => void
      onFileCommand: (callback: (command: FileCommand) => void) => () => void
      onOpenFileRequested: (callback: (filePath: string) => void) => () => void
    }
    files: {
      getPathForFile: (file: File) => string
      openMarkdown: () => Promise<MarkdownFileDocument | null>
      openMarkdownPath: (filePath: string) => Promise<MarkdownFileDocument>
      revealInFolder: (filePath: string) => Promise<boolean>
      getRecent: () => Promise<RecentFile[]>
      addRecent: (filePath: string) => Promise<RecentFile[]>
      removeRecent: (filePath: string) => Promise<RecentFile[]>
      clearRecent: () => Promise<void>
      saveMarkdown: (filePath: string, content: string) => Promise<MarkdownFileDocument>
      saveMarkdownAs: (
        suggestedName: string,
        content: string,
        sourceFilePath?: string | null,
      ) => Promise<MarkdownFileDocument | null>
      exportDocument: (input: DocumentExportInput) => Promise<string | null>
    }
    session: {
      get: () => Promise<SessionState>
      save: (state: SessionState) => Promise<SessionState>
    }
    settings: {
      get: () => Promise<SettingsLoadResult>
      save: (settings: AppSettings) => Promise<AppSettings>
    }
    notes: {
      getAll: () => Promise<Note[]>
      add: (input: CreateNoteInput) => Promise<Note>
      update: (id: string, updates: Partial<CreateNoteInput>) => Promise<Note>
      delete: (id: string) => Promise<void>
      uploadImage: () => Promise<string | null>
      pasteImage: (buffer: ArrayBuffer, mimeType: string) => Promise<string>
    }
    extFiles: {
      registerDir: (fileDir: string) => Promise<string>
      unregisterDir: (token: string) => Promise<void>
      uploadImage: (filePath: string) => Promise<string | null>
      pasteImage: (filePath: string, buffer: ArrayBuffer, mimeType: string) => Promise<string>
    }
  }
}
