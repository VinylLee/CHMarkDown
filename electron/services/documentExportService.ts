import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { convertManagedImagesForExport } from '../../src/utils/markdownImageSize'
import { extractMarkdownImageSources } from '../../src/utils/markdownImageReferences'

export interface DocumentExportInput {
  title: string
  content: string
  sourceFilePath?: string | null
}

export interface DocumentExportAsset {
  absolutePath: string
  archivePath: string
}

export interface DocumentExportPlan {
  kind: 'markdown' | 'zip'
  defaultFileName: string
  markdownFileName: string
  content: string
  assets: DocumentExportAsset[]
}

function safeDocumentName(title: string): string {
  const sanitized = title.trim().replace(/[<>:"/\\|?*]/g, '_')
  return sanitized.replace(/\.(?:md|markdown)$/i, '') || '未命名笔记'
}

function ensureReadableFile(filePath: string, displayPath: string): void {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`图片资源不存在或无法读取：${displayPath}`)
  }
}

function isPathInside(baseDir: string, targetPath: string): boolean {
  const relative = path.relative(path.resolve(baseDir), path.resolve(targetPath))
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}

function decodeLocalImagePath(source: string): string {
  const pathWithoutSuffix = source.split(/[?#]/, 1)[0]
  try {
    return decodeURIComponent(pathWithoutSuffix)
  } catch {
    throw new Error(`图片路径编码无效：${source}`)
  }
}

function isRemoteOrEmbeddedImage(source: string): boolean {
  return /^(?:https?:)?\/\//i.test(source) || /^data:/i.test(source)
}

function normalizeArchivePath(relativePath: string): string {
  return relativePath.split(path.sep).join('/').replace(/^\.\//, '')
}

export function prepareDocumentExport(
  input: DocumentExportInput,
  managedImagesDir: string,
): DocumentExportPlan {
  const documentName = safeDocumentName(input.title)
  const managed = convertManagedImagesForExport(input.content)
  const markdownSources = extractMarkdownImageSources(input.content)
  const hasImages = managed.imageFiles.length > 0 || markdownSources.length > 0
  const assetsByPath = new Map<string, DocumentExportAsset>()

  for (const imageFile of managed.imageFiles) {
    const absolutePath = path.resolve(managedImagesDir, imageFile)
    if (!isPathInside(managedImagesDir, absolutePath)) {
      throw new Error(`图片路径超出应用资源目录：${imageFile}`)
    }
    ensureReadableFile(absolutePath, imageFile)
    assetsByPath.set(absolutePath.toLowerCase(), {
      absolutePath,
      archivePath: `images/${imageFile}`,
    })
  }

  for (const source of markdownSources) {
    if (isRemoteOrEmbeddedImage(source) || source.startsWith('#')) continue
    if (/^chmarkdown:/i.test(source)) continue
    if (/^[a-z][a-z\d+.-]*:/i.test(source) || path.isAbsolute(source)) {
      throw new Error(`不支持导出绝对路径或未知协议图片：${source}`)
    }
    if (!input.sourceFilePath) {
      throw new Error(`无法确定相对图片的来源目录：${source}`)
    }

    const documentDir = path.dirname(path.resolve(input.sourceFilePath))
    const decodedPath = decodeLocalImagePath(source).replace(/[\\/]/g, path.sep)
    const absolutePath = path.resolve(documentDir, decodedPath)
    if (!isPathInside(documentDir, absolutePath)) {
      throw new Error(`图片路径超出 Markdown 文档目录：${source}`)
    }
    ensureReadableFile(absolutePath, source)

    const relativePath = path.relative(documentDir, absolutePath)
    assetsByPath.set(absolutePath.toLowerCase(), {
      absolutePath,
      archivePath: normalizeArchivePath(relativePath),
    })
  }

  return {
    kind: hasImages ? 'zip' : 'markdown',
    defaultFileName: `${documentName}.${hasImages ? 'zip' : 'md'}`,
    markdownFileName: `${documentName}.md`,
    content: managed.content,
    assets: [...assetsByPath.values()],
  }
}

async function writeZip(plan: DocumentExportPlan, outputPath: string): Promise<void> {
  const { ZipArchive } = await import('archiver')
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(outputPath)
    const archive = new ZipArchive({ zlib: { level: 9 } })
    let settled = false

    const fail = (error: Error): void => {
      if (settled) return
      settled = true
      output.destroy()
      reject(error)
    }

    output.on('close', () => {
      if (settled) return
      settled = true
      resolve()
    })
    output.on('error', fail)
    archive.on('error', fail)
    archive.pipe(output)
    archive.append(plan.content, { name: plan.markdownFileName })
    for (const asset of plan.assets) {
      archive.file(asset.absolutePath, { name: asset.archivePath })
    }
    void archive.finalize().catch(fail)
  })
}

export async function writeDocumentExport(
  plan: DocumentExportPlan,
  destinationPath: string,
): Promise<void> {
  const resolvedDestination = path.resolve(destinationPath)
  const temporaryPath = `${resolvedDestination}.chmarkdown-${crypto.randomUUID()}.tmp`

  try {
    if (plan.kind === 'zip') {
      await writeZip(plan, temporaryPath)
    } else {
      fs.writeFileSync(temporaryPath, plan.content, 'utf8')
    }
    fs.rmSync(resolvedDestination, { force: true })
    fs.renameSync(temporaryPath, resolvedDestination)
  } catch (error) {
    fs.rmSync(temporaryPath, { force: true })
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`导出文档失败：${message}`)
  }
}
