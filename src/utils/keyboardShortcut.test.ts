import { describe, expect, it } from 'vitest'
import {
  isNoteListToggleShortcut,
  matchesPrimaryShortcut,
  resolveEditorShortcut,
} from './keyboardShortcut'

function shortcut(key: string, overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key,
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...overrides,
  } as KeyboardEvent
}

describe('matchesPrimaryShortcut', () => {
  it('matches Ctrl+F, Ctrl+R and Ctrl+B without case sensitivity', () => {
    expect(matchesPrimaryShortcut(shortcut('F'), 'f')).toBe(true)
    expect(matchesPrimaryShortcut(shortcut('r'), 'r')).toBe(true)
    expect(matchesPrimaryShortcut(shortcut('B'), 'b')).toBe(true)
  })

  it('supports the platform primary Meta modifier', () => {
    expect(matchesPrimaryShortcut(shortcut('f', { ctrlKey: false, metaKey: true }), 'f'))
      .toBe(true)
  })

  it('does not match old or modified shortcut combinations', () => {
    expect(matchesPrimaryShortcut(shortcut('h'), 'r')).toBe(false)
    expect(matchesPrimaryShortcut(shortcut('b', { shiftKey: true }), 'b')).toBe(false)
    expect(matchesPrimaryShortcut(shortcut('f', { altKey: true }), 'f')).toBe(false)
  })

  it('toggles search with Ctrl+F and replacement with Ctrl+R', () => {
    expect(resolveEditorShortcut(shortcut('f'), false)).toBe('open-search')
    expect(resolveEditorShortcut(shortcut('f'), true)).toBe('close-search')
    expect(resolveEditorShortcut(shortcut('r'), false, false)).toBe('open-replace')
    expect(resolveEditorShortcut(shortcut('r'), true, false)).toBe('open-replace')
    expect(resolveEditorShortcut(shortcut('r'), true, true)).toBe('close-search')
    expect(resolveEditorShortcut(shortcut('h'), false)).toBeNull()
  })

  it('uses Ctrl+B but not Ctrl+Shift+B for the document list', () => {
    expect(isNoteListToggleShortcut(shortcut('b'))).toBe(true)
    expect(isNoteListToggleShortcut(shortcut('b', { shiftKey: true }))).toBe(false)
  })
})
