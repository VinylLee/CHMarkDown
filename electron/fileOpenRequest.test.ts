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

  it('ignores flags and unsupported development arguments', () => {
    expect(extractMarkdownFilePath([
      'electron.exe',
      '.',
      '--inspect=9229',
      'notes.bin',
    ])).toBeNull()
  })

  it('extracts TXT and JSON paths from packaged arguments', () => {
    const txtPath = path.resolve('notes', 'notes.txt')
    const jsonPath = path.resolve('config.json')
    expect(extractMarkdownFilePath(['CHMarkDown.exe', txtPath])).toBe(txtPath)
    expect(extractMarkdownFilePath(['CHMarkDown.exe', jsonPath])).toBe(jsonPath)
  })

  it('returns a missing Markdown path for the renderer to report safely', () => {
    const filePath = path.resolve('missing.md')
    expect(extractMarkdownFilePath(['CHMarkDown.exe', filePath])).toBe(filePath)
  })
})
