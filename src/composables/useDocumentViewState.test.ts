import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseDocumentViewStates, useDocumentViewState } from './useDocumentViewState'
import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEY = 'chmarkdown:document-view-states'

describe('useDocumentViewState', () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
      removeItem: vi.fn((key: string) => values.delete(key)),
    })
    useLocalStorage().resetAvailable()
  })

  it('stores independent positions and selections for each document', () => {
    const viewState = useDocumentViewState()
    viewState.set('first', {
      editorPosition: { line: 12, ratio: 0.25, edge: null },
      previewPosition: { line: 10, ratio: 0.2, edge: null },
      selectionStart: 20,
      selectionEnd: 24,
      selectionDirection: 'forward',
    })
    viewState.set('second', {
      editorPosition: { line: null, ratio: 1, edge: 'end' },
      previewPosition: null,
      selectionStart: 2,
      selectionEnd: 2,
      selectionDirection: 'none',
    })

    expect(viewState.get('first')).toMatchObject({
      editorPosition: { line: 12, ratio: 0.25, edge: null },
      selectionStart: 20,
      selectionEnd: 24,
    })
    expect(viewState.get('second')).toMatchObject({
      editorPosition: { line: null, ratio: 1, edge: 'end' },
      selectionStart: 2,
    })
    expect(localStorage.setItem).toHaveBeenLastCalledWith(
      STORAGE_KEY,
      expect.stringContaining('"second"'),
    )
  })

  it('ignores corrupt and invalid stored values', () => {
    expect(parseDocumentViewStates('{bad json')).toEqual({})
    expect(parseDocumentViewStates(JSON.stringify({ version: 99, documents: {} }))).toEqual({})
    expect(parseDocumentViewStates(JSON.stringify({
      version: 1,
      documents: {
        invalid: { selectionStart: -1 },
      },
    }))).toEqual({})
  })
})
