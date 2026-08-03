import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_APP_SETTINGS,
  createAppSettingsStore,
  normalizeAppSettings,
  normalizeImageDirectoryName,
  readAppSettings,
  writeAppSettings,
} from './settingsService'

describe('settingsService', () => {
  let testDirectory = ''
  let storagePath = ''

  beforeEach(() => {
    testDirectory = mkdtempSync(path.join(os.tmpdir(), 'chmarkdown-settings-'))
    storagePath = path.join(testDirectory, 'settings.json')
  })

  afterEach(() => {
    if (testDirectory.startsWith(os.tmpdir())) {
      rmSync(testDirectory, { recursive: true, force: true })
    }
  })

  it('uses safe defaults before the settings file exists', () => {
    expect(readAppSettings(storagePath)).toEqual({
      settings: DEFAULT_APP_SETTINGS,
      warning: null,
    })
  })

  it('persists and reloads validated settings', () => {
    const settings = writeAppSettings(storagePath, {
      ...DEFAULT_APP_SETTINGS,
      theme: 'dark',
      editorFontFamily: 'Consolas',
      editorFontSize: 17,
      defaultEditorMode: 'preview',
      wordWrap: false,
      imageDirectoryName: 'assets',
      showTrayIcon: false,
    })

    expect(readAppSettings(storagePath)).toEqual({ settings, warning: null })
    expect(JSON.parse(readFileSync(storagePath, 'utf8'))).toEqual(settings)
  })

  it('falls back to defaults and reports corrupted JSON', () => {
    writeFileSync(storagePath, '{invalid', 'utf8')

    const result = readAppSettings(storagePath)
    expect(result.settings).toEqual(DEFAULT_APP_SETTINGS)
    expect(result.warning).toContain('已恢复安全默认值')
  })

  it('enables the tray when migrating settings saved by v0.6.0', () => {
    const legacySettings = { ...DEFAULT_APP_SETTINGS } as Partial<typeof DEFAULT_APP_SETTINGS>
    delete legacySettings.showTrayIcon

    expect(normalizeAppSettings(legacySettings).showTrayIcon).toBe(true)
  })

  it('rejects out-of-range and unknown preference values', () => {
    expect(() => normalizeAppSettings({
      ...DEFAULT_APP_SETTINGS,
      editorFontSize: 40,
    })).toThrow('设置格式无效')
    expect(() => normalizeAppSettings({
      ...DEFAULT_APP_SETTINGS,
      theme: 'midnight',
    })).toThrow('设置格式无效')
  })

  it('accepts a single safe resource directory name', () => {
    expect(normalizeImageDirectoryName(' assets ')).toBe('assets')
    expect(normalizeImageDirectoryName('插图')).toBe('插图')
  })

  it('rejects resource directory traversal and Windows reserved names', () => {
    expect(() => normalizeImageDirectoryName('../assets')).toThrow('图片资源目录名称无效')
    expect(() => normalizeImageDirectoryName('images\\nested')).toThrow('图片资源目录名称无效')
    expect(() => normalizeImageDirectoryName('CON')).toThrow('图片资源目录名称无效')
  })

  it('does not leave a temporary file after saving', () => {
    writeAppSettings(storagePath, DEFAULT_APP_SETTINGS)
    expect(existsSync(`${storagePath}.${process.pid}.tmp`)).toBe(false)
  })

  it('replaces an existing settings file on later saves', () => {
    writeAppSettings(storagePath, DEFAULT_APP_SETTINGS)
    const updated = writeAppSettings(storagePath, {
      ...DEFAULT_APP_SETTINGS,
      theme: 'dark',
    })

    expect(readAppSettings(storagePath).settings).toEqual(updated)
  })

  it('caches validated settings and refreshes the cache after saving', () => {
    const store = createAppSettingsStore(storagePath)
    const first = store.read()

    writeFileSync(storagePath, JSON.stringify({
      ...DEFAULT_APP_SETTINGS,
      theme: 'dark',
    }), 'utf8')

    expect(store.read()).toEqual(first)
    expect(store.write({ ...DEFAULT_APP_SETTINGS, theme: 'light' }).theme).toBe('light')
    expect(store.read().settings.theme).toBe('light')
  })
})
