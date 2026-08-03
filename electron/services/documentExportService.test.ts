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
  prepareDocumentExport,
  writeDocumentExport,
} from './documentExportService'

describe('documentExportService', () => {
  let testDirectory = ''
  let managedImagesDir = ''

  beforeEach(() => {
    testDirectory = mkdtempSync(path.join(os.tmpdir(), 'chmarkdown-export-'))
    managedImagesDir = path.join(testDirectory, 'managed-images')
    mkdirSync(managedImagesDir)
  })

  afterEach(() => {
    if (testDirectory.startsWith(os.tmpdir())) {
      rmSync(testDirectory, { recursive: true, force: true })
    }
  })

  it('exports a document without images as Markdown', async () => {
    const plan = prepareDocumentExport({
      title: '项目:计划.md',
      content: '# Plan\n',
    }, managedImagesDir)
    const destination = path.join(testDirectory, 'export.md')

    expect(plan).toMatchObject({
      kind: 'markdown',
      defaultFileName: '项目_计划.md',
      markdownFileName: '项目_计划.md',
      assets: [],
    })
    await writeDocumentExport(plan, destination)
    expect(readFileSync(destination, 'utf8')).toBe('# Plan\n')
  })

  it('packages managed note images and rewrites their URLs', () => {
    writeFileSync(path.join(managedImagesDir, 'photo.png'), 'image')
    const plan = prepareDocumentExport({
      title: 'Note',
      content: '<img src="chmarkdown://images/photo.png" alt="图" />',
    }, managedImagesDir)

    expect(plan.kind).toBe('zip')
    expect(plan.content).toContain('src="images/photo.png"')
    expect(plan.assets).toEqual([{
      absolutePath: path.join(managedImagesDir, 'photo.png'),
      archivePath: 'images/photo.png',
    }])
  })

  it('packages relative external images and deduplicates repeated references', () => {
    const documentDir = path.join(testDirectory, 'document')
    const imagesDir = path.join(documentDir, 'images')
    mkdirSync(imagesDir, { recursive: true })
    const documentPath = path.join(documentDir, 'note.md')
    const imagePath = path.join(imagesDir, 'same.png')
    writeFileSync(documentPath, '# Note')
    writeFileSync(imagePath, 'image')

    const plan = prepareDocumentExport({
      title: 'note.md',
      sourceFilePath: documentPath,
      content: '![one](images/same.png)\n![two](./images/same.png)',
    }, managedImagesDir)

    expect(plan.kind).toBe('zip')
    expect(plan.assets).toEqual([{
      absolutePath: imagePath,
      archivePath: 'images/same.png',
    }])
  })

  it('resolves URL-encoded relative image paths', () => {
    const documentDir = path.join(testDirectory, 'encoded-document')
    const imagesDir = path.join(documentDir, 'images')
    mkdirSync(imagesDir, { recursive: true })
    const documentPath = path.join(documentDir, 'note.md')
    const imagePath = path.join(imagesDir, 'my photo.png')
    writeFileSync(documentPath, '# Note')
    writeFileSync(imagePath, 'image')

    const plan = prepareDocumentExport({
      title: 'note.md',
      sourceFilePath: documentPath,
      content: '![photo](<images/my photo.png>)',
    }, managedImagesDir)

    expect(plan.assets).toEqual([{
      absolutePath: imagePath,
      archivePath: 'images/my photo.png',
    }])
  })

  it('creates a ZIP even when the document only contains remote images', async () => {
    const content = '![remote](https://example.com/photo.png)'
    const plan = prepareDocumentExport({ title: 'Remote', content }, managedImagesDir)
    const destination = path.join(testDirectory, 'remote.zip')

    expect(plan.kind).toBe('zip')
    expect(plan.content).toBe(content)
    expect(plan.assets).toEqual([])
    await writeDocumentExport(plan, destination)
    expect(readFileSync(destination).subarray(0, 2).toString()).toBe('PK')
  })

  it('fails before export when a local image is missing', () => {
    const documentPath = path.join(testDirectory, 'note.md')
    writeFileSync(documentPath, '# Note')

    expect(() => prepareDocumentExport({
      title: 'Note',
      sourceFilePath: documentPath,
      content: '![missing](images/missing.png)',
    }, managedImagesDir)).toThrow('图片资源不存在或无法读取')
  })

  it('rejects relative images that escape the document directory', () => {
    const documentDir = path.join(testDirectory, 'document')
    mkdirSync(documentDir)
    const documentPath = path.join(documentDir, 'note.md')
    const outsideImage = path.join(testDirectory, 'outside.png')
    writeFileSync(documentPath, '# Note')
    writeFileSync(outsideImage, 'image')

    expect(() => prepareDocumentExport({
      title: 'Note',
      sourceFilePath: documentPath,
      content: '![outside](../outside.png)',
    }, managedImagesDir)).toThrow('图片路径超出 Markdown 文档目录')
  })

  it('does not leave a destination file when validation fails', () => {
    const destination = path.join(testDirectory, 'failed.zip')

    expect(() => prepareDocumentExport({
      title: 'Note',
      content: '![unknown](relative.png)',
    }, managedImagesDir)).toThrow('无法确定相对图片的来源目录')
    expect(existsSync(destination)).toBe(false)
  })
})
