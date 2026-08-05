import { reactive, readonly } from 'vue'

export interface UseVerticalResizableOptions {
  /** The reactive state object whose .height will be mutated during drag */
  state: { height: number }
  minHeight: number
  maxHeight: number
  /** Called when a drag ends with the final height */
  onDragEnd?: (height: number) => void
}

export interface ResizeDragState {
  readonly isResizing: boolean
}

export interface UseVerticalResizableReturn {
  readonly state: ResizeDragState
  onMouseDown: (event: MouseEvent) => void
  cleanup: () => void
}

export function useVerticalResizable(
  options: UseVerticalResizableOptions,
): UseVerticalResizableReturn {
  const dragState = reactive<{ isResizing: boolean }>({ isResizing: false })
  const readonlyState = readonly(dragState)
  let startY = 0
  let startHeight = 0
  let onMove: ((e: MouseEvent) => void) | null = null
  let onUp: (() => void) | null = null

  function onMouseDown(event: MouseEvent): void {
    event.preventDefault()
    startY = event.clientY
    startHeight = options.state.height
    dragState.isResizing = true

    onMove = (e: MouseEvent): void => {
      const delta = e.clientY - startY
      const newHeight = Math.min(
        options.maxHeight,
        Math.max(options.minHeight, startHeight + delta),
      )
      options.state.height = newHeight
    }

    onUp = (): void => {
      dragState.isResizing = false
      document.removeEventListener('mousemove', onMove!)
      document.removeEventListener('mouseup', onUp!)
      onMove = null
      onUp = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      options.onDragEnd?.(options.state.height)
    }

    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function cleanup(): void {
    if (onMove) document.removeEventListener('mousemove', onMove)
    if (onUp) document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    dragState.isResizing = false
    onMove = null
    onUp = null
  }

  return {
    state: readonlyState,
    onMouseDown,
    cleanup,
  }
}
