import { reactive } from 'vue'
import { useLocalStorage } from './useLocalStorage'

export const RECENT_FILES_COLLAPSED_KEY = 'chmarkdown:recent-files:collapsed'

export function useRecentFilesSection(
  storageKey = RECENT_FILES_COLLAPSED_KEY,
) {
  const storage = useLocalStorage()
  const state = reactive({
    collapsed: storage.getBoolean(storageKey, false),
  })

  function setCollapsed(collapsed: boolean): void {
    state.collapsed = collapsed
    storage.setItem(storageKey, String(collapsed))
  }

  function toggle(): void {
    setCollapsed(!state.collapsed)
  }

  return { state, setCollapsed, toggle }
}
