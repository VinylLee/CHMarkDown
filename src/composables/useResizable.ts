import { reactive, readonly } from 'vue'

export interface UseResizableOptions {
  /** The reactive state object whose .width will be mutated during drag */
  state: { width: number }
  minWidth: number
  maxWidth: number
  /** Called when a drag ends with the final width */
  onDragEnd?: (width: number) => void
}

export interface ResizeDragState {
  readonly isResizing: boolean
}

export interface UseResizableReturn {
  readonly state: ResizeDragState
  onMouseDown: (event: MouseEvent) => void
  cleanup: () => void
}

export function useResizable(options: UseResizableOptions): UseResizableReturn {
  const dragState = reactive<{ isResizing: boolean }>({ isResizing: false })
  const readonlyState = readonly(dragState)
  let startX = 0
  let startWidth = 0
  let onMove: ((e: MouseEvent) => void) | null = null
  let onUp: (() => void) | null = null

  function onMouseDown(event: MouseEvent): void {
    event.preventDefault()
    startX = event.clientX
    startWidth = options.state.width
    dragState.isResizing = true

    onMove = (e: MouseEvent): void => {
      const delta = e.clientX - startX
      const newWidth = Math.min(
        options.maxWidth,
        Math.max(options.minWidth, startWidth + delta),
      )
      options.state.width = newWidth
    }

    onUp = (): void => {
      dragState.isResizing = false
      document.removeEventListener('mousemove', onMove!)
      document.removeEventListener('mouseup', onUp!)
      onMove = null
      onUp = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      options.onDragEnd?.(options.state.width)
    }

    document.body.style.cursor = 'col-resize'
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
