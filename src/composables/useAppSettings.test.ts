// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_APP_SETTINGS,
  initializeAppSettings,
  useAppSettings,
} from './useAppSettings'

describe('useAppSettings', () => {
  beforeEach(() => {
    const mediaQuery = {
      matches: true,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } satisfies MediaQueryList
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => mediaQuery),
    })
  })

  it('uses preview view as the default editor mode for new installs', () => {
    expect(DEFAULT_APP_SETTINGS.defaultEditorMode).toBe('preview')
    expect(DEFAULT_APP_SETTINGS.defaultSyncEnabled).toBe(true)
  })

  it('loads persisted settings, resolves the system theme, and applies saved updates', async () => {
    const persisted: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      editorFontFamily: 'Consolas',
      editorFontSize: 16,
    }
    const save = vi.fn(async (settings: AppSettings) => settings)
    window.electronAPI = {
      settings: {
        get: vi.fn(async () => ({ settings: persisted, warning: 'recovered' })),
        save,
      },
    } as unknown as Window['electronAPI']

    expect(await initializeAppSettings()).toBe('recovered')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(useAppSettings().settings.editorFontSize).toBe(16)

    await useAppSettings().saveSettings({ ...persisted, theme: 'light', wordWrap: false })

    expect(save).toHaveBeenCalledOnce()
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(useAppSettings().settings.wordWrap).toBe(false)
  })
})
