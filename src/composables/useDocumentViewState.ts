import type { ScrollPositionSnapshot } from './useScrollSync'
import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEY = 'chmarkdown:document-view-states'
const STORAGE_VERSION = 1
const MAX_DOCUMENT_STATES = 200

export interface DocumentViewState {
  editorPosition: ScrollPositionSnapshot | null
  previewPosition: ScrollPositionSnapshot | null
  selectionStart: number
  selectionEnd: number
  selectionDirection: 'forward' | 'backward' | 'none'
  updatedAt: number
}

interface StoredDocumentViewStates {
  version: number
  documents: Record<string, DocumentViewState>
}

function isScrollPosition(value: unknown): value is ScrollPositionSnapshot | null {
  if (value === null) return true
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<ScrollPositionSnapshot>
  return (candidate.line === null || (Number.isInteger(candidate.line) && (candidate.line ?? 0) > 0))
    && typeof candidate.ratio === 'number'
    && Number.isFinite(candidate.ratio)
    && candidate.ratio >= 0
    && candidate.ratio <= 1
    && (candidate.edge === null || candidate.edge === 'start' || candidate.edge === 'end')
}

function isDocumentViewState(value: unknown): value is DocumentViewState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<DocumentViewState>
  return isScrollPosition(candidate.editorPosition)
    && isScrollPosition(candidate.previewPosition)
    && Number.isInteger(candidate.selectionStart)
    && (candidate.selectionStart ?? -1) >= 0
    && Number.isInteger(candidate.selectionEnd)
    && (candidate.selectionEnd ?? -1) >= (candidate.selectionStart ?? 0)
    && (
      candidate.selectionDirection === 'forward'
      || candidate.selectionDirection === 'backward'
      || candidate.selectionDirection === 'none'
    )
    && typeof candidate.updatedAt === 'number'
    && Number.isFinite(candidate.updatedAt)
}

export function parseDocumentViewStates(raw: string | null): Record<string, DocumentViewState> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Partial<StoredDocumentViewStates>
    if (parsed.version !== STORAGE_VERSION || !parsed.documents || typeof parsed.documents !== 'object') {
      return {}
    }
    return Object.fromEntries(
      Object.entries(parsed.documents).filter((entry): entry is [string, DocumentViewState] =>
        isDocumentViewState(entry[1]),
      ),
    )
  } catch {
    return {}
  }
}

export function useDocumentViewState() {
  const storage = useLocalStorage()
  let documents = parseDocumentViewStates(storage.getItem(STORAGE_KEY))

  function persist(): void {
    const newest = Object.entries(documents)
      .sort((first, second) => second[1].updatedAt - first[1].updatedAt)
      .slice(0, MAX_DOCUMENT_STATES)
    documents = Object.fromEntries(newest)
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: STORAGE_VERSION,
      documents,
    } satisfies StoredDocumentViewStates))
  }

  function get(documentId: string): DocumentViewState | null {
    const state = documents[documentId]
    return state ? { ...state } : null
  }

  function set(documentId: string, state: Omit<DocumentViewState, 'updatedAt'>): void {
    documents[documentId] = { ...state, updatedAt: Date.now() }
    persist()
  }

  return { get, set }
}
