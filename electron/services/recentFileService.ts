import fs from 'node:fs'
import path from 'node:path'

const MAX_RECENT_FILES = 12

export interface RecentFile {
  filePath: string
  fileName: string
  lastOpenedAt: string
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isRecentFile(value: unknown): value is RecentFile {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<RecentFile>
  return (
    typeof candidate.filePath === 'string' &&
    candidate.filePath.length > 0 &&
    typeof candidate.fileName === 'string' &&
    candidate.fileName.length > 0 &&
    typeof candidate.lastOpenedAt === 'string' &&
    !Number.isNaN(Date.parse(candidate.lastOpenedAt))
  )
}

function samePath(left: string, right: string): boolean {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase()
}

export function readRecentFiles(storagePath: string): RecentFile[] {
  if (!fs.existsSync(storagePath)) return []

  try {
    const parsed = JSON.parse(fs.readFileSync(storagePath, 'utf8')) as unknown
    if (!Array.isArray(parsed)) {
      throw new Error('记录格式无效')
    }
    return parsed.filter(isRecentFile).slice(0, MAX_RECENT_FILES)
  } catch (error) {
    throw new Error(`读取最近文件记录失败：${errorMessage(error)}`)
  }
}

function writeRecentFiles(storagePath: string, files: RecentFile[]): void {
  try {
    fs.mkdirSync(path.dirname(storagePath), { recursive: true })
    fs.writeFileSync(storagePath, JSON.stringify(files, null, 2), 'utf8')
  } catch (error) {
    throw new Error(`保存最近文件记录失败：${errorMessage(error)}`)
  }
}

export function addRecentFile(
  storagePath: string,
  filePath: string,
  lastOpenedAt = new Date().toISOString(),
): RecentFile[] {
  const resolvedPath = path.resolve(filePath)
  const entry: RecentFile = {
    filePath: resolvedPath,
    fileName: path.basename(resolvedPath),
    lastOpenedAt,
  }
  const remaining = readRecentFiles(storagePath).filter(
    (file) => !samePath(file.filePath, resolvedPath),
  )
  const updated = [entry, ...remaining].slice(0, MAX_RECENT_FILES)
  writeRecentFiles(storagePath, updated)
  return updated
}

export function removeRecentFile(storagePath: string, filePath: string): RecentFile[] {
  const updated = readRecentFiles(storagePath).filter(
    (file) => !samePath(file.filePath, filePath),
  )
  writeRecentFiles(storagePath, updated)
  return updated
}

export function clearRecentFiles(storagePath: string): void {
  writeRecentFiles(storagePath, [])
}
