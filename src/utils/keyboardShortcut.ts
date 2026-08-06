export interface ShortcutEvent {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
}

export function matchesPrimaryShortcut(event: ShortcutEvent, key: string): boolean {
  return (
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === key.toLowerCase()
  )
}

export type EditorShortcutAction = 'open-search' | 'close-search' | 'open-replace' | null

export function resolveEditorShortcut(
  event: ShortcutEvent,
  searchOpen: boolean,
  replaceVisible = false,
): EditorShortcutAction {
  if (matchesPrimaryShortcut(event, 'f')) {
    return searchOpen ? 'close-search' : 'open-search'
  }
  if (matchesPrimaryShortcut(event, 'r')) {
    return searchOpen && replaceVisible ? 'close-search' : 'open-replace'
  }
  return null
}

export function isNoteListToggleShortcut(event: ShortcutEvent): boolean {
  return matchesPrimaryShortcut(event, 'b')
}

export function isOutlineToggleShortcut(event: ShortcutEvent): boolean {
  return matchesPrimaryShortcut(event, 'g')
}

export type EditorHistoryShortcutAction = 'undo' | 'redo' | null

export function resolveEditorHistoryShortcut(
  event: ShortcutEvent,
): EditorHistoryShortcutAction {
  if (matchesPrimaryShortcut(event, 'z')) return 'undo'
  if (matchesPrimaryShortcut(event, 'y')) return 'redo'
  return null
}
