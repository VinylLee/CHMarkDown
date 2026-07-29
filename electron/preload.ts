import { contextBridge, ipcRenderer } from 'electron'

export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export type CreateNoteInput = Pick<Note, 'title' | 'content'>

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
    exportNote: (noteId: string, noteTitle: string): Promise<string | null> =>
      ipcRenderer.invoke('notes:exportNote', noteId, noteTitle),
  },
})
