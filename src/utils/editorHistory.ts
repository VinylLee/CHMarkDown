export const DEFAULT_EDITOR_HISTORY_LIMIT = 100
export const EDITOR_HISTORY_GROUP_WINDOW_MS = 750

export type EditorSelectionDirection = 'forward' | 'backward' | 'none'

export interface EditorHistorySnapshot {
  content: string
  selectionStart: number
  selectionEnd: number
  selectionDirection: EditorSelectionDirection
}

export interface RecordEditorHistoryOptions {
  group?: string | null
  timestamp?: number
}

function normalizeSnapshot(snapshot: EditorHistorySnapshot): EditorHistorySnapshot {
  const contentLength = snapshot.content.length
  const selectionStart = Math.min(Math.max(0, snapshot.selectionStart), contentLength)
  const selectionEnd = Math.min(
    Math.max(selectionStart, snapshot.selectionEnd),
    contentLength,
  )
  return {
    content: snapshot.content,
    selectionStart,
    selectionEnd,
    selectionDirection: snapshot.selectionDirection,
  }
}

function snapshotsEqual(
  first: EditorHistorySnapshot,
  second: EditorHistorySnapshot,
): boolean {
  return first.content === second.content
    && first.selectionStart === second.selectionStart
    && first.selectionEnd === second.selectionEnd
    && first.selectionDirection === second.selectionDirection
}

export function createEditorHistory(
  initialSnapshot: EditorHistorySnapshot,
  limit = DEFAULT_EDITOR_HISTORY_LIMIT,
) {
  const historyLimit = Math.max(1, Math.floor(limit))
  let current = normalizeSnapshot(initialSnapshot)
  let past: EditorHistorySnapshot[] = []
  let future: EditorHistorySnapshot[] = []
  let lastGroup: string | null = null
  let lastTimestamp = 0

  function clearGrouping(): void {
    lastGroup = null
    lastTimestamp = 0
  }

  function trimPast(): void {
    if (past.length > historyLimit) {
      past = past.slice(past.length - historyLimit)
    }
  }

  function reset(snapshot: EditorHistorySnapshot): void {
    current = normalizeSnapshot(snapshot)
    past = []
    future = []
    clearGrouping()
  }

  function synchronize(snapshot: EditorHistorySnapshot): void {
    const normalized = normalizeSnapshot(snapshot)
    if (snapshotsEqual(current, normalized)) return

    if (current.content !== normalized.content) {
      past.push(current)
      trimPast()
      future = []
    } else {
      clearGrouping()
    }
    current = normalized
  }

  function record(
    snapshot: EditorHistorySnapshot,
    options: RecordEditorHistoryOptions = {},
  ): void {
    const normalized = normalizeSnapshot(snapshot)
    if (snapshotsEqual(current, normalized)) return

    const group = options.group ?? null
    const timestamp = options.timestamp ?? Date.now()
    const canGroup = group !== null
      && group === lastGroup
      && timestamp - lastTimestamp <= EDITOR_HISTORY_GROUP_WINDOW_MS

    if (!canGroup) {
      past.push(current)
      trimPast()
    }
    current = normalized
    future = []
    lastGroup = group
    lastTimestamp = timestamp
  }

  function undo(): EditorHistorySnapshot | null {
    const previous = past.pop()
    if (!previous) return null
    future.push(current)
    current = previous
    clearGrouping()
    return { ...current }
  }

  function redo(): EditorHistorySnapshot | null {
    const next = future.pop()
    if (!next) return null
    past.push(current)
    trimPast()
    current = next
    clearGrouping()
    return { ...current }
  }

  return {
    reset,
    synchronize,
    record,
    undo,
    redo,
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  }
}

export type EditorHistory = ReturnType<typeof createEditorHistory>

export function resolveInputHistoryGroup(inputType: string): string | null {
  if (inputType === 'insertText' || inputType === 'insertCompositionText') {
    return 'insert-text'
  }
  if (inputType === 'deleteContentBackward') return 'delete-backward'
  if (inputType === 'deleteContentForward') return 'delete-forward'
  return null
}
