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
type FileCommand = 'open' | 'save' | 'save-as'

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
      openMarkdown: () => Promise<MarkdownFileDocument | null>
      openMarkdownPath: (filePath: string) => Promise<MarkdownFileDocument>
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
