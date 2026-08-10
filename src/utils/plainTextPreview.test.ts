import { describe, expect, it } from 'vitest'
import { escapeHtmlText, isPlainTextFilePath } from './plainTextPreview'

describe('isPlainTextFilePath', () => {
  it('accepts .txt and .json case-insensitively', () => {
    expect(isPlainTextFilePath('D:\\data\\note.txt')).toBe(true)
    expect(isPlainTextFilePath('D:\\data\\config.JSON')).toBe(true)
    expect(isPlainTextFilePath('notes.txt')).toBe(true)
  })

  it('rejects Markdown files and other extensions', () => {
    expect(isPlainTextFilePath('D:\\data\\note.md')).toBe(false)
    expect(isPlainTextFilePath('D:\\data\\note.markdown')).toBe(false)
    expect(isPlainTextFilePath('D:\\data\\note.bin')).toBe(false)
  })
})

describe('escapeHtmlText', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtmlText('<b>&"\'</b>')).toBe('&lt;b&gt;&amp;&quot;&#039;&lt;/b&gt;')
  })

  it('keeps plain text unchanged', () => {
    expect(escapeHtmlText('第 1 行内容')).toBe('第 1 行内容')
  })

  it('preserves newlines', () => {
    expect(escapeHtmlText('a\nb')).toBe('a\nb')
  })
})
