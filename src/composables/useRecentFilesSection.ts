import { reactive, readonly } from 'vue'
import { useLocalStorage } from './useLocalStorage'
import { useVerticalResizable } from './useVerticalResizable'
import type { UseVerticalResizableReturn } from './useVerticalResizable'

export const RECENT_FILES_COLLAPSED_KEY = 'chmarkdown:recent-files:collapsed'
export const RECENT_FILES_HEIGHT_KEY = 'chmarkdown:recent-files:height'
export const DEFAULT_RECENT_FILES_HEIGHT = 156
export const MIN_RECENT_FILES_HEIGHT = 60
export const MAX_RECENT_FILES_HEIGHT = 420

export function useRecentFilesSection(
  storageKey = RECENT_FILES_COLLAPSED_KEY,
) {
  const storage = useLocalStorage()
  const state = reactive({
    collapsed: storage.getBoolean(storageKey, false),
    height: storage.getNumber(RECENT_FILES_HEIGHT_KEY, DEFAULT_RECENT_FILES_HEIGHT),
  })
  state.height = Math.min(
    MAX_RECENT_FILES_HEIGHT,
    Math.max(MIN_RECENT_FILES_HEIGHT, state.height),
  )

  let resizeHandler: UseVerticalResizableReturn | null = null

  function persistHeight(): void {
    storage.setItem(RECENT_FILES_HEIGHT_KEY, String(state.height))
  }

  function getOrCreateResizeHandler(): UseVerticalResizableReturn {
    if (!resizeHandler) {
      resizeHandler = useVerticalResizable({
        state,
        minHeight: MIN_RECENT_FILES_HEIGHT,
        maxHeight: MAX_RECENT_FILES_HEIGHT,
        onDragEnd: persistHeight,
      })
    }
    return resizeHandler
  }

  function setCollapsed(collapsed: boolean): void {
    state.collapsed = collapsed
    storage.setItem(storageKey, String(collapsed))
  }

  function toggle(): void {
    setCollapsed(!state.collapsed)
  }

  function cleanup(): void {
    resizeHandler?.cleanup()
    resizeHandler = null
  }

  const handler = getOrCreateResizeHandler()

  return {
    state: readonly(state),
    resizeState: handler.state,
    setCollapsed,
    toggle,
    onResizeMouseDown: handler.onMouseDown,
    cleanup,
  }
}
