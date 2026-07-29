import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createMarkdownDefaultName,
  readMarkdownFile,
  writeMarkdownFile,
} from './markdownFileService'

describe('markdownFileService', () => {
  let testDirectory = ''

  beforeEach(() => {
    testDirectory = mkdtempSync(path.join(os.tmpdir(), 'chmarkdown-file-service-'))
  })

  afterEach(() => {
    if (testDirectory.startsWith(os.tmpdir())) {
      rmSync(testDirectory, { recursive: true, force: true })
    }
  })

  it('reads UTF-8 Markdown without changing its content', () => {
    const filePath = path.join(testDirectory, '灵感.markdown')
    const content = '# 标题\n\n你好，Markdown！\n'
    writeFileSync(filePath, content, 'utf8')

    expect(readMarkdownFile(filePath)).toEqual({
      filePath,
      fileName: '灵感.markdown',
      content,
    })
  })

  it('writes the exact content to an existing Markdown path', () => {
    const filePath = path.join(testDirectory, 'note.md')
    const content = '# Updated\n\n- one\n- two\n'

    expect(writeMarkdownFile(filePath, content)).toEqual({
      filePath,
      fileName: 'note.md',
      content,
    })
    expect(readFileSync(filePath, 'utf8')).toBe(content)
  })

  it('rejects unsupported file extensions', () => {
    const filePath = path.join(testDirectory, 'note.txt')

    expect(() => readMarkdownFile(filePath)).toThrow('仅支持 .md 或 .markdown 文件')
    expect(() => writeMarkdownFile(filePath, 'content')).toThrow(
      '仅支持 .md 或 .markdown 文件'
    )
  })

  it('creates a safe Markdown default file name', () => {
    expect(createMarkdownDefaultName('项目:计划')).toBe('项目_计划.md')
    expect(createMarkdownDefaultName('README.markdown')).toBe('README.markdown')
    expect(createMarkdownDefaultName('...')).toBe('未命名.md')
  })

  it('reports a readable error when the source file does not exist', () => {
    const filePath = path.join(testDirectory, 'missing.md')

    expect(() => readMarkdownFile(filePath)).toThrow('打开 Markdown 文件失败')
  })
})
