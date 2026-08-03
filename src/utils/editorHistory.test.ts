import { describe, expect, it } from 'vitest'
import {
  createEditorHistory,
  DEFAULT_EDITOR_HISTORY_LIMIT,
  resolveInputHistoryGroup,
  type EditorHistorySnapshot,
} from './editorHistory'

function snapshot(
  content: string,
  selectionStart = content.length,
  selectionEnd = selectionStart,
): EditorHistorySnapshot {
  return {
    content,
    selectionStart,
    selectionEnd,
    selectionDirection: 'none',
  }
}

describe('createEditorHistory', () => {
  it('undoes and redoes content with its selection', () => {
    const history = createEditorHistory(snapshot('hello', 5))
    history.record(snapshot('hello!', 6))

    expect(history.undo()).toEqual(snapshot('hello', 5))
    expect(history.redo()).toEqual(snapshot('hello!', 6))
  })

  it('clears the redo branch after a new edit', () => {
    const history = createEditorHistory(snapshot(''))
    history.record(snapshot('a'))
    history.record(snapshot('ab'))
    expect(history.undo()).toEqual(snapshot('a'))

    history.record(snapshot('ac'))
    expect(history.canRedo()).toBe(false)
    expect(history.redo()).toBeNull()
  })

  it('groups nearby continuous typing into one undo step', () => {
    const history = createEditorHistory(snapshot(''))
    history.record(snapshot('a'), { group: 'insert-text', timestamp: 1000 })
    history.record(snapshot('ab'), { group: 'insert-text', timestamp: 1500 })
    history.record(snapshot('abc'), { group: 'insert-text', timestamp: 2000 })

    expect(history.undo()).toEqual(snapshot(''))
  })

  it('starts a new step when the cursor moves during typing', () => {
    const history = createEditorHistory(snapshot(''))
    history.record(snapshot('a', 1), { group: 'insert-text', timestamp: 1000 })
    history.synchronize(snapshot('a', 0))
    history.record(snapshot('ba', 1), { group: 'insert-text', timestamp: 1200 })

    expect(history.undo()).toEqual(snapshot('a', 0))
    expect(history.undo()).toEqual(snapshot(''))
  })

  it('starts a new step after the grouping time window', () => {
    const history = createEditorHistory(snapshot(''))
    history.record(snapshot('a'), { group: 'insert-text', timestamp: 1000 })
    history.record(snapshot('ab'), { group: 'insert-text', timestamp: 2000 })

    expect(history.undo()).toEqual(snapshot('a'))
  })

  it(`keeps at most ${DEFAULT_EDITOR_HISTORY_LIMIT} undo steps`, () => {
    const history = createEditorHistory(snapshot('0'))
    for (let index = 1; index <= DEFAULT_EDITOR_HISTORY_LIMIT + 5; index += 1) {
      history.record(snapshot(String(index)), { timestamp: index * 1000 })
    }

    let undoCount = 0
    while (history.undo()) undoCount += 1
    expect(undoCount).toBe(DEFAULT_EDITOR_HISTORY_LIMIT)
  })

  it('normalizes selections to the content bounds', () => {
    const history = createEditorHistory(snapshot('hello'))
    history.record({
      content: 'a',
      selectionStart: -2,
      selectionEnd: 20,
      selectionDirection: 'forward',
    })

    expect(history.undo()).toEqual(snapshot('hello'))
    expect(history.redo()).toEqual({
      content: 'a',
      selectionStart: 0,
      selectionEnd: 1,
      selectionDirection: 'forward',
    })
  })
})

describe('resolveInputHistoryGroup', () => {
  it('groups typing and directional deletion but not paste or drop', () => {
    expect(resolveInputHistoryGroup('insertText')).toBe('insert-text')
    expect(resolveInputHistoryGroup('insertCompositionText')).toBe('insert-text')
    expect(resolveInputHistoryGroup('deleteContentBackward')).toBe('delete-backward')
    expect(resolveInputHistoryGroup('deleteContentForward')).toBe('delete-forward')
    expect(resolveInputHistoryGroup('insertFromPaste')).toBeNull()
    expect(resolveInputHistoryGroup('insertFromDrop')).toBeNull()
  })
})
