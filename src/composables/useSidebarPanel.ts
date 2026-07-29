import { reactive, readonly } from 'vue'
import { useResizable } from './useResizable'
import { useLocalStorage } from './useLocalStorage'
import type { UseResizableReturn } from './useResizable'

const STORAGE_KEY_WIDTH = 'flowdesk:sidebar:width'
const STORAGE_KEY_COLLAPSED = 'flowdesk:sidebar:collapsed'
const MIN_WIDTH = 56
const MAX_WIDTH = 360
const DEFAULT_WIDTH = 210

interface SidebarPanelState {
  width: number
  collapsed: boolean
}

const state = reactive<SidebarPanelState>({
  width: DEFAULT_WIDTH,
  collapsed: false,
})

let resizeHandler: UseResizableReturn | null = null
let previousWidth = DEFAULT_WIDTH
let initialized = false

const { getNumber, getBoolean, setItem } = useLocalStorage()

function ensureInitialized(): void {
  if (initialized) return
  initialized = true
  state.width = getNumber(STORAGE_KEY_WIDTH, DEFAULT_WIDTH)
  state.width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, state.width))
  state.collapsed = getBoolean(STORAGE_KEY_COLLAPSED, false)
  if (state.collapsed) {
    previousWidth = state.width
  }
}

function persistWidth(): void {
  setItem(STORAGE_KEY_WIDTH, String(state.width))
}

function persistCollapsed(): void {
  setItem(STORAGE_KEY_COLLAPSED, String(state.collapsed))
}

function getOrCreateResizeHandler(): UseResizableReturn {
  if (!resizeHandler) {
    resizeHandler = useResizable({
      state,
      minWidth: MIN_WIDTH,
      maxWidth: MAX_WIDTH,
      onDragEnd: persistWidth,
    })
  }
  return resizeHandler
}

export function useSidebarPanel() {
  ensureInitialized()
  const handler = getOrCreateResizeHandler()

  function toggle(): void {
    if (state.collapsed) {
      state.width = previousWidth
      state.collapsed = false
    } else {
      previousWidth = state.width
      state.collapsed = true
    }
    persistCollapsed()
  }

  function collapse(): void {
    if (state.collapsed) return
    previousWidth = state.width
    state.collapsed = true
    persistCollapsed()
  }

  function expand(): void {
    if (!state.collapsed) return
    state.width = previousWidth
    state.collapsed = false
    persistCollapsed()
  }

  function cleanup(): void {
    resizeHandler?.cleanup()
    resizeHandler = null
    initialized = false
  }

  return {
    state: readonly(state),
    resizeState: handler.state,
    toggle,
    collapse,
    expand,
    onResizeMouseDown: handler.onMouseDown,
    cleanup,
  }
}
