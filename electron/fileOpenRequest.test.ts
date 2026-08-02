import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractMarkdownFilePath } from './fileOpenRequest'

describe('extractMarkdownFilePath', () => {
  it('extracts an absolute Markdown path from packaged arguments', () => {
    const filePath = path.resolve('notes', 'project.md')
    expect(extractMarkdownFilePath(['CHMarkDown.exe', filePath])).toBe(filePath)
  })

  it('accepts markdown extension case-insensitively', () => {
    const filePath = path.resolve('README.MARKDOWN')
    expect(extractMarkdownFilePath(['CHMarkDown.exe', filePath])).toBe(filePath)
  })

  it('ignores flags and unrelated development arguments', () => {
    expect(extractMarkdownFilePath([
      'electron.exe',
      '.',
      '--inspect=9229',
      'notes.txt',
    ])).toBeNull()
  })

  it('returns a missing Markdown path for the renderer to report safely', () => {
    const filePath = path.resolve('missing.md')
    expect(extractMarkdownFilePath(['CHMarkDown.exe', filePath])).toBe(filePath)
  })
})
