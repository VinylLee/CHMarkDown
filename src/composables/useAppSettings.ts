import { reactive, readonly } from 'vue'

export const DEFAULT_APP_SETTINGS: AppSettings = {
  version: 1,
  theme: 'system',
  editorFontFamily: 'Cascadia Code',
  editorFontSize: 14,
  defaultEditorMode: 'preview',
  wordWrap: true,
  defaultSyncEnabled: true,
  imageDirectoryName: 'images',
  showTrayIcon: true,
}

const settings = reactive<AppSettings>({ ...DEFAULT_APP_SETTINGS })
let initialization: Promise<string | null> | null = null
let systemThemeQuery: MediaQueryList | null = null

function resolvedTheme(theme: ThemePreference): 'light' | 'dark' {
  if (theme !== 'system') return theme
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(): void {
  const theme = resolvedTheme(settings.theme)
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

function handleSystemThemeChange(): void {
  if (settings.theme === 'system') applyTheme()
}

function updateSystemThemeListener(): void {
  systemThemeQuery?.removeEventListener('change', handleSystemThemeChange)
  systemThemeQuery = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null
  systemThemeQuery?.addEventListener('change', handleSystemThemeChange)
}

function applySettings(nextSettings: AppSettings): void {
  Object.assign(settings, nextSettings)
  updateSystemThemeListener()
  applyTheme()
}

export async function initializeAppSettings(): Promise<string | null> {
  if (!initialization) {
    initialization = window.electronAPI.settings.get()
      .then((result) => {
        applySettings(result.settings)
        return result.warning
      })
      .catch((error) => {
        applySettings({ ...DEFAULT_APP_SETTINGS })
        throw error
      })
  }
  return initialization
}

export function useAppSettings() {
  async function saveSettings(nextSettings: AppSettings): Promise<AppSettings> {
    const saved = await window.electronAPI.settings.save(nextSettings)
    applySettings(saved)
    return saved
  }

  return {
    settings: readonly(settings),
    saveSettings,
  }
}
