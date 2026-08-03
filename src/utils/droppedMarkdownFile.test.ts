import { describe, expect, it } from 'vitest'
import { getDroppedMarkdownFilePath } from './droppedMarkdownFile'

describe('getDroppedMarkdownFilePath', () => {
  it('returns the first supported Markdown file path', () => {
    expect(getDroppedMarkdownFilePath([
      { name: 'notes.txt' },
      { name: 'README.md' },
      { name: 'later.markdown' },
    ], (file) => `C:\\未命名笔记\\${file.name}`)).toEqual({
      status: 'ok',
      filePath: 'C:\\未命名笔记\\README.md',
    })
  })

  it('accepts Markdown extensions case-insensitively', () => {
    expect(getDroppedMarkdownFilePath([
      { name: 'PLAN.MARKDOWN' },
    ], (file) => `C:\\${file.name}`)).toEqual({
      status: 'ok',
      filePath: 'C:\\PLAN.MARKDOWN',
    })
  })

  it('reports unsupported dropped files', () => {
    expect(getDroppedMarkdownFilePath([
      { name: 'notes.txt' },
    ], () => '')).toEqual({ status: 'unsupported' })
  })

  it('reports when Electron does not return a local path', () => {
    expect(getDroppedMarkdownFilePath([{ name: 'README.md' }], () => '')).toEqual({
      status: 'missing-path',
    })
  })

  it('reports when Electron rejects a non-disk file object', () => {
    expect(getDroppedMarkdownFilePath([{ name: 'README.md' }], () => {
      throw new TypeError('not a native File')
    })).toEqual({ status: 'missing-path' })
  })
})
