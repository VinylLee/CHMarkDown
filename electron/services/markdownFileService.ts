import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

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
