import { describe, expect, it, vi } from 'vitest'
import { createOpenMarkdownFile } from './openMarkdownFiles'
import { createSessionState, restoreSessionState } from './sessionState'

const notes: Note[] = [
  {
    id: 'note-1',
    title: 'One',
    content: '# One',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'note-2',
    title: 'Two',
    content: '# Two',
    createdAt: '2026-08-02T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
  },
]

describe('sessionState', () => {
  it('stores only document references in the current list order', () => {
    const file = createOpenMarkdownFile({
      filePath: 'D:\\docs\\guide.md',
      fileName: 'guide.md',
      content: 'unsaved draft must not be stored',
    })

    expect(createSessionState([file.id, 'note-2', 'note-1'], notes, [file], file.id)).toEqual({
      version: 1,
      documents: [
        { kind: 'file', filePath: 'D:\\docs\\guide.md' },
        { kind: 'note', id: 'note-2' },
        { kind: 'note', id: 'note-1' },
      ],
      selected: { kind: 'file', filePath: 'D:\\docs\\guide.md' },
    })
  })

  it('restores order, types and the previously selected document', async () => {
    const readMarkdown = vi.fn().mockResolvedValue({
      filePath: 'D:\\docs\\guide.md',
      fileName: 'guide.md',
      content: '# Latest disk content',
    })
    const restored = await restoreSessionState({
      version: 1,
      documents: [
        { kind: 'note', id: 'note-2' },
        { kind: 'file', filePath: 'D:\\docs\\guide.md' },
        { kind: 'note', id: 'note-1' },
      ],
      selected: { kind: 'file', filePath: 'D:\\docs\\guide.md' },
    }, notes, readMarkdown)

    expect(restored.documentOrder).toEqual([
      'note-2',
      'file:d:\\docs\\guide.md',
      'note-1',
    ])
    expect(restored.selectedId).toBe('file:d:\\docs\\guide.md')
    expect(restored.externalFiles[0].content).toBe('# Latest disk content')
  })

  it('skips an invalid external file without blocking remaining documents', async () => {
    const readMarkdown = vi.fn(async (filePath: string) => {
      if (filePath.endsWith('missing.md')) throw new Error('ENOENT')
      return { filePath, fileName: 'valid.md', content: '# valid' }
    })
    const restored = await restoreSessionState({
      version: 1,
      documents: [
        { kind: 'file', filePath: 'D:\\docs\\missing.md' },
        { kind: 'note', id: 'note-2' },
        { kind: 'file', filePath: 'D:\\docs\\valid.md' },
      ],
      selected: { kind: 'file', filePath: 'D:\\docs\\missing.md' },
    }, notes, readMarkdown)

    expect(restored.failedFilePaths).toEqual(['D:\\docs\\missing.md'])
    expect(restored.documentOrder).toContain('file:d:\\docs\\valid.md')
    expect(restored.selectedId).toBe('note-2')
  })

  it('does not restore a deleted local note', async () => {
    const restored = await restoreSessionState({
      version: 1,
      documents: [{ kind: 'note', id: 'deleted-note' }],
      selected: { kind: 'note', id: 'deleted-note' },
    }, notes, vi.fn())

    expect(restored.documentOrder).toEqual(['note-1', 'note-2'])
    expect(restored.selectedId).toBe('note-1')
  })

  it('reads external session files concurrently while preserving list order', async () => {
    const resolvers = new Map<string, (document: MarkdownFileDocument) => void>()
    const readMarkdown = vi.fn((filePath: string) => new Promise<MarkdownFileDocument>((resolve) => {
      resolvers.set(filePath, resolve)
    }))
    const firstPath = 'D:\\docs\\first.md'
    const secondPath = 'D:\\docs\\second.md'

    const loading = restoreSessionState({
      version: 1,
      documents: [
        { kind: 'file', filePath: firstPath },
        { kind: 'file', filePath: secondPath },
      ],
      selected: null,
    }, notes, readMarkdown)

    expect(readMarkdown).toHaveBeenCalledTimes(2)
    resolvers.get(secondPath)?.({ filePath: secondPath, fileName: 'second.md', content: '# Second' })
    resolvers.get(firstPath)?.({ filePath: firstPath, fileName: 'first.md', content: '# First' })

    const restored = await loading
    expect(restored.documentOrder.slice(0, 2)).toEqual([
      'file:d:\\docs\\first.md',
      'file:d:\\docs\\second.md',
    ])
  })
})
