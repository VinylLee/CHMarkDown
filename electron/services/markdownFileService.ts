import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown'])

export interface MarkdownFileDocument {
  filePath: string
  fileName: string
  content: string
}

export function isMarkdownFilePath(filePath: string): boolean {
  return MARKDOWN_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

export function createMarkdownDefaultName(suggestedName: string): string {
  const safeName = path.basename(suggestedName)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim()

  if (!safeName) {
    return '未命名.md'
  }
  return isMarkdownFilePath(safeName) ? safeName : `${safeName}.md`
}

function assertMarkdownFilePath(filePath: string): void {
  if (!isMarkdownFilePath(filePath)) {
    throw new Error('仅支持 .md 或 .markdown 文件')
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function readMarkdownFile(filePath: string): MarkdownFileDocument {
  assertMarkdownFilePath(filePath)
  try {
    return {
      filePath,
      fileName: path.basename(filePath),
      content: readFileSync(filePath, 'utf8'),
    }
  } catch (error) {
    throw new Error(`打开 Markdown 文件失败：${errorMessage(error)}`)
  }
}

export function writeMarkdownFile(filePath: string, content: string): MarkdownFileDocument {
  assertMarkdownFilePath(filePath)
  try {
    writeFileSync(filePath, content, 'utf8')
    return {
      filePath,
      fileName: path.basename(filePath),
      content,
    }
  } catch (error) {
    throw new Error(`保存 Markdown 文件失败：${errorMessage(error)}`)
  }
}

function getDocumentDir(filePath: string): string {
  return path.dirname(path.resolve(filePath))
}

function assertResourceDirectoryName(resourceDirectoryName: string): void {
  if (
    !resourceDirectoryName ||
    resourceDirectoryName === '.' ||
    resourceDirectoryName === '..' ||
    path.basename(resourceDirectoryName) !== resourceDirectoryName
  ) {
    throw new Error('图片资源目录名称无效')
  }
}

function ensureExternalImagesDir(fileDir: string, resourceDirectoryName: string): string {
  assertResourceDirectoryName(resourceDirectoryName)
  const imagesDir = path.join(fileDir, resourceDirectoryName)
  if (!existsSync(imagesDir)) {
    mkdirSync(imagesDir, { recursive: true })
  }
  const resolvedFileDir = realpathSync(fileDir)
  const resolvedImagesDir = realpathSync(imagesDir)
  if (!isSafeSubPath(resolvedFileDir, resolvedImagesDir) || !statSync(resolvedImagesDir).isDirectory()) {
    throw new Error('图片资源目录必须位于 Markdown 文档目录内')
  }
  return resolvedImagesDir
}

function isSafeSubPath(baseDir: string, targetPath: string): boolean {
  const resolvedBase = path.resolve(baseDir)
  const resolvedTarget = path.resolve(targetPath)
  const relative = path.relative(resolvedBase, resolvedTarget)
  if (relative === '' || relative.startsWith('..')) {
    return false
  }
  return !path.isAbsolute(relative)
}

export function resolveExternalImagePath(fileDir: string, relativePath: string): string | null {
  if (!relativePath) return null

  try {
    const decodedPath = decodeURIComponent(relativePath).replace(/[\\/]/g, path.sep)
    const resolvedBase = realpathSync(path.resolve(fileDir))
    const resolvedPath = path.resolve(resolvedBase, decodedPath)
    if (!isSafeSubPath(resolvedBase, resolvedPath) || !existsSync(resolvedPath)) return null

    const realPath = realpathSync(resolvedPath)
    if (!isSafeSubPath(resolvedBase, realPath) || !statSync(realPath).isFile()) return null
    return realPath
  } catch {
    return null
  }
}

export function copyImageToExternalDir(
  sourcePath: string,
  filePath: string,
  resourceDirectoryName = 'images',
): { absolutePath: string; relativePath: string } {
  const fileDir = getDocumentDir(filePath)
  const imagesDir = ensureExternalImagesDir(fileDir, resourceDirectoryName)

  const ext = path.extname(sourcePath) || '.png'
  const filename = `${crypto.randomUUID()}${ext}`
  const destPath = path.join(imagesDir, filename)

  copyFileSync(sourcePath, destPath)

  return {
    absolutePath: destPath,
    relativePath: `${resourceDirectoryName}/${filename}`,
  }
}

export function saveImageBufferToExternalDir(
  buffer: Buffer,
  mimeType: string,
  filePath: string,
  resourceDirectoryName = 'images',
): { absolutePath: string; relativePath: string } {
  const fileDir = getDocumentDir(filePath)
  const imagesDir = ensureExternalImagesDir(fileDir, resourceDirectoryName)

  const extMap: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
  }
  const ext = extMap[mimeType] || '.png'
  const filename = `${crypto.randomUUID()}${ext}`
  const destPath = path.join(imagesDir, filename)

  writeFileSync(destPath, buffer)

  return {
    absolutePath: destPath,
    relativePath: `${resourceDirectoryName}/${filename}`,
  }
}

export function copyImagesDirForSaveAs(
  sourceFilePath: string,
  destFilePath: string,
  resourceDirectoryName = 'images',
): string | null {
  assertResourceDirectoryName(resourceDirectoryName)
  const sourceDir = getDocumentDir(sourceFilePath)
  const sourceImagesDir = path.join(sourceDir, resourceDirectoryName)
  if (!existsSync(sourceImagesDir)) return null

  const destDir = getDocumentDir(destFilePath)
  const destImagesDir = path.join(destDir, resourceDirectoryName)
  if (path.resolve(sourceImagesDir).toLowerCase() === path.resolve(destImagesDir).toLowerCase()) {
    return null
  }
  if (existsSync(destImagesDir)) {
    throw new Error(`目标位置已存在 ${resourceDirectoryName} 文件夹，请选择其他目录以避免覆盖资源`)
  }

  try {
    cpSync(sourceImagesDir, destImagesDir, {
      recursive: true,
      errorOnExist: true,
      force: false,
    })
    return destImagesDir
  } catch (error) {
    rmSync(destImagesDir, { recursive: true, force: true })
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`复制 Markdown 图片资源失败：${message}`)
  }
}
