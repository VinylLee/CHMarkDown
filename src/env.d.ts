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

interface Window {
  electronAPI: {
    app: {
      ready: () => void
      onCloseRequested: (callback: (requestId: number) => void) => () => void
      respondToClose: (requestId: number, allowClose: boolean) => void
    }
    notes: {
      getAll: () => Promise<Note[]>
      add: (input: CreateNoteInput) => Promise<Note>
      update: (id: string, updates: Partial<CreateNoteInput>) => Promise<Note>
      delete: (id: string) => Promise<void>
      uploadImage: () => Promise<string | null>
      pasteImage: (buffer: ArrayBuffer, mimeType: string) => Promise<string>
      exportNote: (noteId: string, noteTitle: string) => Promise<string | null>
    }
  }
}
