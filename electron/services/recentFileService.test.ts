import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  addRecentFile,
  clearRecentFiles,
  readRecentFiles,
  removeRecentFile,
} from './recentFileService'

describe('recentFileService', () => {
  let testDirectory = ''
  let storagePath = ''

  beforeEach(() => {
    testDirectory = mkdtempSync(path.join(os.tmpdir(), 'chmarkdown-recent-files-'))
    storagePath = path.join(testDirectory, 'recent-files.json')
  })

  afterEach(() => {
    if (testDirectory.startsWith(os.tmpdir())) {
      rmSync(testDirectory, { recursive: true, force: true })
    }
  })

  it('returns an empty list before the storage file exists', () => {
    expect(readRecentFiles(storagePath)).toEqual([])
  })

  it('stores newest files first and deduplicates paths case-insensitively', () => {
    const firstPath = path.join(testDirectory, 'First.md')
    const secondPath = path.join(testDirectory, 'Second.markdown')
    addRecentFile(storagePath, firstPath, '2026-08-01T10:00:00.000Z')
    addRecentFile(storagePath, secondPath, '2026-08-01T11:00:00.000Z')
    const updated = addRecentFile(
      storagePath,
      firstPath.toUpperCase(),
      '2026-08-01T12:00:00.000Z',
    )

    expect(updated).toHaveLength(2)
    expect(updated[0].fileName.toLowerCase()).toBe('first.md')
    expect(updated[0].lastOpenedAt).toBe('2026-08-01T12:00:00.000Z')
    expect(updated[1].fileName).toBe('Second.markdown')
  })

  it('keeps at most twelve files', () => {
    for (let index = 0; index < 15; index += 1) {
      addRecentFile(storagePath, path.join(testDirectory, `${index}.md`))
    }
    expect(readRecentFiles(storagePath)).toHaveLength(12)
  })

  it('removes one record without deleting the Markdown file', () => {
    const filePath = path.join(testDirectory, 'keep.md')
    writeFileSync(filePath, '# keep', 'utf8')
    addRecentFile(storagePath, filePath)

    expect(removeRecentFile(storagePath, filePath)).toEqual([])
    expect(readFileSync(filePath, 'utf8')).toBe('# keep')
  })

  it('clears all records', () => {
    addRecentFile(storagePath, path.join(testDirectory, 'one.md'))
    clearRecentFiles(storagePath)
    expect(readRecentFiles(storagePath)).toEqual([])
  })

  it('reports corrupted storage instead of silently ignoring it', () => {
    writeFileSync(storagePath, '{invalid', 'utf8')
    expect(() => readRecentFiles(storagePath)).toThrow('读取最近文件记录失败')
  })
})
