import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  copyImageToExternalDir,
  copyImagesDirForSaveAs,
  createMarkdownDefaultName,
  readMarkdownFile,
  resolveExternalImagePath,
  saveImageBufferToExternalDir,
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

  it('round-trips a large UTF-8 Markdown document without truncation', () => {
    const filePath = path.join(testDirectory, 'large-document.md')
    const section = '## 性能测试\n\n这是一个包含中文、emoji 🚀 和 `code` 的段落。\n\n'
    const content = `# Large document\n\n${section.repeat(120_000)}`

    writeMarkdownFile(filePath, content)
    const restored = readMarkdownFile(filePath)

    expect(Buffer.byteLength(content, 'utf8')).toBeGreaterThan(8 * 1024 * 1024)
    expect(restored.content).toBe(content)
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

  it('copies selected and pasted images beside an external document', () => {
    const documentPath = path.join(testDirectory, 'document', 'note.md')
    const sourceImage = path.join(testDirectory, 'source.png')
    mkdirSync(path.dirname(documentPath), { recursive: true })
    writeFileSync(documentPath, '# Note')
    writeFileSync(sourceImage, 'selected-image')

    const selected = copyImageToExternalDir(sourceImage, documentPath)
    const pasted = saveImageBufferToExternalDir(
      Buffer.from('pasted-image'),
      'image/jpeg',
      documentPath,
    )

    expect(selected.relativePath).toMatch(/^images\/[\w-]+\.png$/)
    expect(readFileSync(selected.absolutePath, 'utf8')).toBe('selected-image')
    expect(pasted.relativePath).toMatch(/^images\/[\w-]+\.jpg$/)
    expect(readFileSync(pasted.absolutePath, 'utf8')).toBe('pasted-image')
  })

  it('uses the configured resource directory for new external images', () => {
    const documentPath = path.join(testDirectory, 'document', 'note.md')
    const sourceImage = path.join(testDirectory, 'source.png')
    mkdirSync(path.dirname(documentPath), { recursive: true })
    writeFileSync(documentPath, '# Note')
    writeFileSync(sourceImage, 'selected-image')

    const selected = copyImageToExternalDir(sourceImage, documentPath, 'assets')
    const pasted = saveImageBufferToExternalDir(
      Buffer.from('pasted-image'),
      'image/png',
      documentPath,
      'assets',
    )

    expect(selected.relativePath).toMatch(/^assets\/[\w-]+\.png$/)
    expect(pasted.relativePath).toMatch(/^assets\/[\w-]+\.png$/)
    expect(path.dirname(selected.absolutePath)).toBe(path.join(path.dirname(documentPath), 'assets'))
  })

  it('resolves encoded image paths inside the document directory only', () => {
    const documentDir = path.join(testDirectory, 'document')
    const imagesDir = path.join(documentDir, 'images')
    const imagePath = path.join(imagesDir, 'my photo.png')
    const outsidePath = path.join(testDirectory, 'outside.png')
    mkdirSync(imagesDir, { recursive: true })
    writeFileSync(imagePath, 'image')
    writeFileSync(outsidePath, 'outside')

    expect(resolveExternalImagePath(documentDir, 'images/my%20photo.png')).toBe(imagePath)
    expect(resolveExternalImagePath(documentDir, '../outside.png')).toBeNull()
    expect(resolveExternalImagePath(documentDir, 'images/missing.png')).toBeNull()
  })

  it('copies nested image resources during save as', () => {
    const sourceDocument = path.join(testDirectory, 'source', 'note.md')
    const destinationDocument = path.join(testDirectory, 'destination', 'copy.md')
    const nestedImage = path.join(path.dirname(sourceDocument), 'images', 'nested', 'photo.png')
    mkdirSync(path.dirname(nestedImage), { recursive: true })
    mkdirSync(path.dirname(destinationDocument), { recursive: true })
    writeFileSync(sourceDocument, '# Note')
    writeFileSync(nestedImage, 'image')

    const copiedDir = copyImagesDirForSaveAs(sourceDocument, destinationDocument)
    const copiedImage = path.join(path.dirname(destinationDocument), 'images', 'nested', 'photo.png')

    expect(copiedDir).toBe(path.join(path.dirname(destinationDocument), 'images'))
    expect(readFileSync(copiedImage, 'utf8')).toBe('image')
  })

  it('does not overwrite an existing destination images directory', () => {
    const sourceDocument = path.join(testDirectory, 'source', 'note.md')
    const destinationDocument = path.join(testDirectory, 'destination', 'copy.md')
    const sourceImages = path.join(path.dirname(sourceDocument), 'images')
    const destinationImages = path.join(path.dirname(destinationDocument), 'images')
    mkdirSync(sourceImages, { recursive: true })
    mkdirSync(destinationImages, { recursive: true })
    writeFileSync(path.join(sourceImages, 'photo.png'), 'source')
    writeFileSync(path.join(destinationImages, 'photo.png'), 'existing')

    expect(() => copyImagesDirForSaveAs(sourceDocument, destinationDocument))
      .toThrow('目标位置已存在 images 文件夹')
    expect(existsSync(path.join(destinationImages, 'photo.png'))).toBe(true)
    expect(readFileSync(path.join(destinationImages, 'photo.png'), 'utf8')).toBe('existing')
  })

  it('copies a configured resource directory during save as', () => {
    const sourceDocument = path.join(testDirectory, 'source', 'note.md')
    const destinationDocument = path.join(testDirectory, 'destination', 'copy.md')
    const sourceAssets = path.join(path.dirname(sourceDocument), 'assets')
    mkdirSync(sourceAssets, { recursive: true })
    mkdirSync(path.dirname(destinationDocument), { recursive: true })
    writeFileSync(path.join(sourceAssets, 'photo.png'), 'image')

    copyImagesDirForSaveAs(sourceDocument, destinationDocument, 'assets')

    expect(readFileSync(path.join(path.dirname(destinationDocument), 'assets', 'photo.png'), 'utf8'))
      .toBe('image')
  })
})
