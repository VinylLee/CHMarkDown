import { describe, expect, it } from 'vitest'
import { getDroppedMarkdownFilePath } from './droppedMarkdownFile'

describe('getDroppedMarkdownFilePath', () => {
  it('returns the first supported Markdown file path', () => {
    expect(getDroppedMarkdownFilePath([
      { name: 'notes.txt', path: 'C:\\notes.txt' },
      { name: 'README.md', path: 'C:\\README.md' },
      { name: 'later.markdown', path: 'C:\\later.markdown' },
    ])).toEqual({ status: 'ok', filePath: 'C:\\README.md' })
  })

  it('accepts Markdown extensions case-insensitively', () => {
    expect(getDroppedMarkdownFilePath([
      { name: 'PLAN.MARKDOWN', path: 'C:\\PLAN.MARKDOWN' },
    ])).toEqual({ status: 'ok', filePath: 'C:\\PLAN.MARKDOWN' })
  })

  it('reports unsupported dropped files', () => {
    expect(getDroppedMarkdownFilePath([
      { name: 'notes.txt', path: 'C:\\notes.txt' },
    ])).toEqual({ status: 'unsupported' })
  })

  it('reports when Electron does not expose a local path', () => {
    expect(getDroppedMarkdownFilePath([{ name: 'README.md' }])).toEqual({
      status: 'missing-path',
    })
  })
})
