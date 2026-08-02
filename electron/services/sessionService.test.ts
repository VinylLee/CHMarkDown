import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readSessionState, writeSessionState } from './sessionService'

describe('sessionService', () => {
  let testDirectory = ''
  let storagePath = ''

  beforeEach(() => {
    testDirectory = mkdtempSync(path.join(os.tmpdir(), 'chmarkdown-session-'))
    storagePath = path.join(testDirectory, 'session.json')
  })

  afterEach(() => {
    if (testDirectory.startsWith(os.tmpdir())) {
      rmSync(testDirectory, { recursive: true, force: true })
    }
  })

  it('returns an empty session before the storage file exists', () => {
    expect(readSessionState(storagePath)).toEqual({
      version: 1,
      documents: [],
      selected: null,
    })
  })

  it('preserves document order and selected item', () => {
    const filePath = path.join(testDirectory, 'guide.md')
    const state = writeSessionState(storagePath, {
      version: 1,
      documents: [
        { kind: 'file', filePath },
        { kind: 'note', id: 'note-1' },
      ],
      selected: { kind: 'note', id: 'note-1' },
    })

    expect(readSessionState(storagePath)).toEqual(state)
    expect(state.documents.map((document) => document.kind)).toEqual(['file', 'note'])
  })

  it('deduplicates file paths case-insensitively', () => {
    const filePath = path.join(testDirectory, 'guide.md')
    const state = writeSessionState(storagePath, {
      version: 1,
      documents: [
        { kind: 'file', filePath },
        { kind: 'file', filePath: filePath.toUpperCase() },
      ],
      selected: null,
    })

    expect(state.documents).toHaveLength(1)
  })

  it('does not persist unsaved document content', () => {
    const state = writeSessionState(storagePath, {
      version: 1,
      documents: [{ kind: 'note', id: 'note-1', content: 'unsaved' }],
      selected: null,
    })

    expect(state.documents).toEqual([{ kind: 'note', id: 'note-1' }])
  })

  it('reports a corrupted session so the renderer can show a prompt', () => {
    writeFileSync(storagePath, '{invalid', 'utf8')
    expect(() => readSessionState(storagePath)).toThrow('读取上次会话失败')
  })
})
