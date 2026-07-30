import { describe, expect, it } from 'vitest'
import {
  createOpenMarkdownFile,
  removeOpenMarkdownFile,
  replaceOpenMarkdownFile,
  upsertOpenMarkdownFile,
} from './openMarkdownFiles'

const firstDocument: MarkdownFileDocument = {
  filePath: 'D:\\docs\\First.md',
  fileName: 'First.md',
  content: '# First',
}

describe('openMarkdownFiles', () => {
  it('creates a stable, case-insensitive id for a file path', () => {
    const lowerCasePath = createOpenMarkdownFile(firstDocument, '2026-01-01T00:00:00.000Z')
    const upperCasePath = createOpenMarkdownFile(
      { ...firstDocument, filePath: 'D:\\DOCS\\FIRST.MD' },
      '2026-01-01T00:00:00.000Z'
    )

    expect(lowerCasePath.id).toBe(upperCasePath.id)
  })

  it('adds a newly opened file to the document list', () => {
    const files = upsertOpenMarkdownFile([], firstDocument, '2026-01-01T00:00:00.000Z')

    expect(files).toHaveLength(1)
    expect(files[0]).toMatchObject({
      fileName: 'First.md',
      content: '# First',
    })
  })

  it('refreshes an already opened file instead of duplicating it', () => {
    const existing = upsertOpenMarkdownFile(
      [],
      firstDocument,
      '2026-01-01T00:00:00.000Z'
    )
    const refreshed = upsertOpenMarkdownFile(
      existing,
      { ...firstDocument, content: '# Refreshed' },
      '2026-01-02T00:00:00.000Z'
    )

    expect(refreshed).toHaveLength(1)
    expect(refreshed[0].content).toBe('# Refreshed')
  })

  it('replaces the previous entry after save as', () => {
    const existing = upsertOpenMarkdownFile(
      [],
      firstDocument,
      '2026-01-01T00:00:00.000Z'
    )
    const replaced = replaceOpenMarkdownFile(
      existing,
      existing[0].id,
      {
        filePath: 'D:\\docs\\Renamed.md',
        fileName: 'Renamed.md',
        content: '# First',
      },
      '2026-01-02T00:00:00.000Z'
    )

    expect(replaced).toHaveLength(1)
    expect(replaced[0].fileName).toBe('Renamed.md')
    expect(replaced[0].id).not.toBe(existing[0].id)
  })

  it('closes a file by removing only its session entry', () => {
    const firstFile = createOpenMarkdownFile(firstDocument, '2026-01-01T00:00:00.000Z')
    const secondFile = createOpenMarkdownFile(
      {
        filePath: 'D:\\docs\\Second.md',
        fileName: 'Second.md',
        content: '# Second',
      },
      '2026-01-02T00:00:00.000Z'
    )

    expect(removeOpenMarkdownFile([firstFile, secondFile], firstFile.id)).toEqual([
      secondFile,
    ])
  })
})
