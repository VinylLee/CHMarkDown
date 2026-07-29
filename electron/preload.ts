import { contextBridge, ipcRenderer } from 'electron'

export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export type CreateNoteInput = Pick<Note, 'title' | 'content'>
export type FileCommand = 'open' | 'save' | 'save-as'

export interface MarkdownFileDocument {
  filePath: string
  fileName: string
  content: string
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
  },
  files: {
    openMarkdown: (): Promise<MarkdownFileDocument | null> =>
      ipcRenderer.invoke('files:openMarkdown'),
    saveMarkdown: (filePath: string, content: string): Promise<MarkdownFileDocument> =>
      ipcRenderer.invoke('files:saveMarkdown', filePath, content),
    saveMarkdownAs: (
      suggestedName: string,
      content: string
    ): Promise<MarkdownFileDocument | null> =>
      ipcRenderer.invoke('files:saveMarkdownAs', suggestedName, content),
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
