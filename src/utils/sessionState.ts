import { createOpenMarkdownFile } from './openMarkdownFiles'
import type { OpenMarkdownFile } from './openMarkdownFiles'

export interface RestoredSession {
  documentOrder: string[]
  externalFiles: OpenMarkdownFile[]
  selectedId: string | null
  failedFilePaths: string[]
}

function referenceId(reference: SessionDocumentRef): string {
  return reference.kind === 'note'
    ? reference.id
    : `file:${reference.filePath.toLowerCase()}`
}

export function createSessionState(
  documentOrder: string[],
  notes: Note[],
  externalFiles: OpenMarkdownFile[],
  selectedId: string | null,
): SessionState {
  const references = new Map<string, SessionDocumentRef>()
  for (const note of notes) references.set(note.id, { kind: 'note', id: note.id })
  for (const file of externalFiles) {
    references.set(file.id, { kind: 'file', filePath: file.filePath })
  }

  const documents = documentOrder
    .map((id) => references.get(id))
    .filter((reference): reference is SessionDocumentRef => Boolean(reference))

  return {
    version: 1,
    documents,
    selected: selectedId ? references.get(selectedId) ?? null : null,
  }
}

export async function restoreSessionState(
  session: SessionState,
  notes: Note[],
  readMarkdown: (filePath: string) => Promise<MarkdownFileDocument>,
): Promise<RestoredSession> {
  const noteIds = new Set(notes.map((note) => note.id))
  const documentOrder: string[] = []
  const externalFiles: OpenMarkdownFile[] = []
  const failedFilePaths: string[] = []
  const seenIds = new Set<string>()
  const fileReads = new Map<string, Promise<MarkdownFileDocument>>()

  type LoadedReference =
    | { kind: 'note'; id: string }
    | { kind: 'file'; filePath: string; openedFile: OpenMarkdownFile | null }

  const loadedReferences = await Promise.all(session.documents.map(async (
    reference,
  ): Promise<LoadedReference> => {
    if (reference.kind === 'note') return reference

    const readKey = reference.filePath.toLowerCase()
    let pendingRead = fileReads.get(readKey)
    if (!pendingRead) {
      pendingRead = readMarkdown(reference.filePath)
      fileReads.set(readKey, pendingRead)
    }

    try {
      return {
        kind: 'file',
        filePath: reference.filePath,
        openedFile: createOpenMarkdownFile(await pendingRead),
      }
    } catch {
      return { kind: 'file', filePath: reference.filePath, openedFile: null }
    }
  }))

  for (const reference of loadedReferences) {
    if (reference.kind === 'note') {
      if (noteIds.has(reference.id) && !seenIds.has(reference.id)) {
        documentOrder.push(reference.id)
        seenIds.add(reference.id)
      }
      continue
    }

    if (!reference.openedFile) {
      failedFilePaths.push(reference.filePath)
      continue
    }
    if (!seenIds.has(reference.openedFile.id)) {
      externalFiles.push(reference.openedFile)
      documentOrder.push(reference.openedFile.id)
      seenIds.add(reference.openedFile.id)
    }
  }

  for (const note of notes) {
    if (!seenIds.has(note.id)) {
      documentOrder.push(note.id)
      seenIds.add(note.id)
    }
  }

  const requestedSelectedId = session.selected ? referenceId(session.selected) : null
  const selectedId = requestedSelectedId && seenIds.has(requestedSelectedId)
    ? requestedSelectedId
    : documentOrder[0] ?? null

  return { documentOrder, externalFiles, selectedId, failedFilePaths }
}
