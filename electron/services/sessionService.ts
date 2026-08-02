import fs from 'node:fs'
import path from 'node:path'

export type SessionDocumentRef =
  | { kind: 'note'; id: string }
  | { kind: 'file'; filePath: string }

export interface SessionState {
  version: 1
  documents: SessionDocumentRef[]
  selected: SessionDocumentRef | null
}

export const EMPTY_SESSION_STATE: SessionState = {
  version: 1,
  documents: [],
  selected: null,
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isDocumentRef(value: unknown): value is SessionDocumentRef {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<SessionDocumentRef>
  return candidate.kind === 'note'
    ? typeof candidate.id === 'string' && candidate.id.length > 0
    : candidate.kind === 'file' &&
        typeof candidate.filePath === 'string' &&
        candidate.filePath.length > 0
}

function documentKey(document: SessionDocumentRef): string {
  return document.kind === 'note'
    ? `note:${document.id}`
    : `file:${path.resolve(document.filePath).toLowerCase()}`
}

function normalizeDocument(document: SessionDocumentRef): SessionDocumentRef {
  return document.kind === 'note'
    ? { kind: 'note', id: document.id }
    : { kind: 'file', filePath: path.resolve(document.filePath) }
}

export function normalizeSessionState(value: unknown): SessionState {
  if (!value || typeof value !== 'object') {
    throw new Error('会话格式无效')
  }
  const candidate = value as Partial<SessionState>
  if (candidate.version !== 1 || !Array.isArray(candidate.documents)) {
    throw new Error('会话格式无效')
  }
  if (candidate.selected !== null && !isDocumentRef(candidate.selected)) {
    throw new Error('会话选中项无效')
  }

  const seen = new Set<string>()
  const documents = candidate.documents.map((document) => {
    if (!isDocumentRef(document)) throw new Error('会话文档条目无效')
    return normalizeDocument(document)
  }).filter((document) => {
    const key = documentKey(document)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return {
    version: 1,
    documents,
    selected: candidate.selected ? normalizeDocument(candidate.selected) : null,
  }
}

export function readSessionState(storagePath: string): SessionState {
  if (!fs.existsSync(storagePath)) return EMPTY_SESSION_STATE

  try {
    return normalizeSessionState(JSON.parse(fs.readFileSync(storagePath, 'utf8')) as unknown)
  } catch (error) {
    throw new Error(`读取上次会话失败：${errorMessage(error)}`)
  }
}

export function writeSessionState(storagePath: string, value: unknown): SessionState {
  const state = normalizeSessionState(value)
  try {
    fs.mkdirSync(path.dirname(storagePath), { recursive: true })
    fs.writeFileSync(storagePath, JSON.stringify(state, null, 2), 'utf8')
    return state
  } catch (error) {
    throw new Error(`保存当前会话失败：${errorMessage(error)}`)
  }
}
