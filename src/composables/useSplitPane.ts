import { computed, readonly, ref } from 'vue'
import type { Ref } from 'vue'
import { useLocalStorage } from './useLocalStorage'

const DEFAULT_RATIO = 0.5
const MIN_RATIO = 0.2
const MAX_RATIO = 0.8
const KEYBOARD_STEP = 0.02
const LARGE_KEYBOARD_STEP = 0.1

interface UseSplitPaneOptions {
  containerRef: Ref<HTMLElement | null>
  storageKey?: string
}

function clampRatio(value: number): number {
  const clamped = Math.min(MAX_RATIO, Math.max(MIN_RATIO, value))
  return Math.round(clamped * 10_000) / 10_000
}

export function useSplitPane(options: UseSplitPaneOptions) {
  const storage = useLocalStorage()
  const storedRatio = storage.getNumber(options.storageKey ?? '', DEFAULT_RATIO)
  const ratio = ref(clampRatio(storedRatio))
  const isResizing = ref(false)
  let onMove: ((event: MouseEvent) => void) | null = null
  let onUp: (() => void) | null = null

  const editPaneStyle = computed(() => ({
    flexBasis: `calc(${ratio.value * 100}% - 4px)`,
  }))

  function persist(): void {
    if (options.storageKey) {
      storage.setItem(options.storageKey, String(ratio.value))
    }
  }

  function updateFromClientX(clientX: number): void {
    const container = options.containerRef.value
    if (!container) return
    const bounds = container.getBoundingClientRect()
    if (bounds.width <= 0) return
    ratio.value = clampRatio((clientX - bounds.left) / bounds.width)
  }

  function stopResizing(): void {
    if (onMove) document.removeEventListener('mousemove', onMove)
    if (onUp) document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    isResizing.value = false
    onMove = null
    onUp = null
  }

  function onMouseDown(event: MouseEvent): void {
    event.preventDefault()
    stopResizing()
    isResizing.value = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    onMove = (moveEvent: MouseEvent) => updateFromClientX(moveEvent.clientX)
    onUp = () => {
      persist()
      stopResizing()
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowLeft' ? -1 : 1
    const step = event.shiftKey ? LARGE_KEYBOARD_STEP : KEYBOARD_STEP
    ratio.value = clampRatio(ratio.value + direction * step)
    persist()
  }

  function reset(): void {
    ratio.value = DEFAULT_RATIO
    persist()
  }

  function cleanup(): void {
    stopResizing()
  }

  return {
    state: readonly({ ratio, isResizing }),
    editPaneStyle,
    onMouseDown,
    onKeyDown,
    reset,
    cleanup,
  }
}
