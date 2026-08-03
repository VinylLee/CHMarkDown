import fs from 'node:fs'
import path from 'node:path'

export type ThemePreference = 'light' | 'dark' | 'system'
export type EditorMode = 'edit' | 'split' | 'preview'
export type EditorFontFamily = 'Cascadia Code' | 'Consolas' | 'Microsoft YaHei' | 'system-ui'

export interface AppSettings {
  version: 1
  theme: ThemePreference
  editorFontFamily: EditorFontFamily
  editorFontSize: number
  defaultEditorMode: EditorMode
  wordWrap: boolean
  imageDirectoryName: string
  showTrayIcon: boolean
}

export interface SettingsLoadResult {
  settings: AppSettings
  warning: string | null
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  version: 1,
  theme: 'system',
  editorFontFamily: 'Cascadia Code',
  editorFontSize: 14,
  defaultEditorMode: 'split',
  wordWrap: true,
  imageDirectoryName: 'images',
  showTrayIcon: true,
}

const THEMES = new Set<ThemePreference>(['light', 'dark', 'system'])
const EDITOR_MODES = new Set<EditorMode>(['edit', 'split', 'preview'])
const EDITOR_FONTS = new Set<EditorFontFamily>([
  'Cascadia Code',
  'Consolas',
  'Microsoft YaHei',
  'system-ui',
])
const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i
const INVALID_DIRECTORY_CHARACTER = /[<>:"/\\|?*\u0000-\u001f]/

function cloneDefaultSettings(): AppSettings {
  return { ...DEFAULT_APP_SETTINGS }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function normalizeImageDirectoryName(value: unknown): string {
  if (typeof value !== 'string') throw new Error('图片资源目录名称无效')
  const name = value.trim()
  if (
    name.length === 0 ||
    name.length > 64 ||
    name === '.' ||
    name === '..' ||
    name.endsWith('.') ||
    INVALID_DIRECTORY_CHARACTER.test(name) ||
    WINDOWS_RESERVED_NAME.test(name)
  ) {
    throw new Error('图片资源目录名称无效')
  }
  return name
}

export function normalizeAppSettings(value: unknown): AppSettings {
  if (!value || typeof value !== 'object') throw new Error('设置格式无效')
  const candidate = value as Partial<AppSettings>
  if (
    candidate.version !== 1 ||
    !THEMES.has(candidate.theme as ThemePreference) ||
    !EDITOR_FONTS.has(candidate.editorFontFamily as EditorFontFamily) ||
    !Number.isInteger(candidate.editorFontSize) ||
    (candidate.editorFontSize as number) < 12 ||
    (candidate.editorFontSize as number) > 24 ||
    !EDITOR_MODES.has(candidate.defaultEditorMode as EditorMode) ||
    typeof candidate.wordWrap !== 'boolean' ||
    (candidate.showTrayIcon !== undefined && typeof candidate.showTrayIcon !== 'boolean')
  ) {
    throw new Error('设置格式无效')
  }

  return {
    version: 1,
    theme: candidate.theme as ThemePreference,
    editorFontFamily: candidate.editorFontFamily as EditorFontFamily,
    editorFontSize: candidate.editorFontSize as number,
    defaultEditorMode: candidate.defaultEditorMode as EditorMode,
    wordWrap: candidate.wordWrap,
    imageDirectoryName: normalizeImageDirectoryName(candidate.imageDirectoryName),
    showTrayIcon: candidate.showTrayIcon === undefined ? true : candidate.showTrayIcon,
  }
}

export function readAppSettings(storagePath: string): SettingsLoadResult {
  if (!fs.existsSync(storagePath)) {
    return { settings: cloneDefaultSettings(), warning: null }
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(storagePath, 'utf8')) as unknown
    return { settings: normalizeAppSettings(parsed), warning: null }
  } catch (error) {
    return {
      settings: cloneDefaultSettings(),
      warning: `读取偏好设置失败，已恢复安全默认值：${errorMessage(error)}`,
    }
  }
}

export function writeAppSettings(storagePath: string, value: unknown): AppSettings {
  const settings = normalizeAppSettings(value)
  const temporaryPath = `${storagePath}.${process.pid}.tmp`
  try {
    fs.mkdirSync(path.dirname(storagePath), { recursive: true })
    fs.writeFileSync(temporaryPath, JSON.stringify(settings, null, 2), 'utf8')
    fs.renameSync(temporaryPath, storagePath)
    return settings
  } catch (error) {
    try {
      fs.rmSync(temporaryPath, { force: true })
    } catch {
      // The original error is more useful than a cleanup failure.
    }
    throw new Error(`保存偏好设置失败：${errorMessage(error)}`)
  }
}
