import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { reactive } from 'vue'
import { useVerticalResizable } from './useVerticalResizable'

describe('useVerticalResizable', () => {
  let state: { height: number }
  let listeners: Record<string, Array<(event: MouseEvent) => void>>

  beforeEach(() => {
    state = reactive({ height: 156 })
    listeners = {}

    const bodyStyle: Record<string, string> = { cursor: '', userSelect: '' }

    const mockDocument = {
      addEventListener: vi.fn((type: string, listener: (event: MouseEvent) => void) => {
        if (!listeners[type]) listeners[type] = []
        listeners[type].push(listener)
      }),
      removeEventListener: vi.fn((type: string, listener: (event: MouseEvent) => void) => {
        if (listeners[type]) {
          listeners[type] = listeners[type].filter((l) => l !== listener)
        }
      }),
      body: {
        style: {
          get cursor() { return bodyStyle.cursor },
          set cursor(v: string) { bodyStyle.cursor = v },
          get userSelect() { return bodyStyle.userSelect },
          set userSelect(v: string) { bodyStyle.userSelect = v },
        },
      },
    }

    vi.stubGlobal('document', mockDocument)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function simulateMouseDown(clientY: number): ReturnType<typeof useVerticalResizable> {
    const resizable = useVerticalResizable({
      state,
      minHeight: 60,
      maxHeight: 420,
    })
    resizable.onMouseDown({ clientY, preventDefault: () => {} } as unknown as MouseEvent)
    return resizable
  }

  function simulateMouseMove(clientY: number): void {
    const moveListeners = listeners['mousemove'] || []
    moveListeners.forEach((fn) => fn({ clientY } as MouseEvent))
  }

  function simulateMouseUp(): void {
    const upListeners = listeners['mouseup'] || []
    upListeners.forEach((fn) => fn({} as MouseEvent))
  }

  it('sets isResizing and uses a row-resize cursor on mousedown', () => {
    const resizable = simulateMouseDown(200)
    expect(resizable.state.isResizing).toBe(true)
    expect(document.body.style.cursor).toBe('row-resize')
  })

  it('updates height on mousemove (drag down)', () => {
    simulateMouseDown(200)
    simulateMouseMove(250)
    expect(state.height).toBe(206) // startHeight 156 + delta 50
  })

  it('updates height on mousemove (drag up)', () => {
    simulateMouseDown(200)
    simulateMouseMove(150)
    expect(state.height).toBe(106) // startHeight 156 + delta -50
  })

  it('clamps height to minHeight', () => {
    simulateMouseDown(200)
    simulateMouseMove(10) // attempt to drag far up
    expect(state.height).toBe(60)
  })

  it('clamps height to maxHeight', () => {
    simulateMouseDown(200)
    simulateMouseMove(900) // attempt to drag far down
    expect(state.height).toBe(420)
  })

  it('sets isResizing to false and removes listeners on mouseup', () => {
    const resizable = simulateMouseDown(200)
    simulateMouseMove(250)
    simulateMouseUp()
    expect(resizable.state.isResizing).toBe(false)
    expect(document.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function))
  })

  it('calls onDragEnd on mouseup with final height', () => {
    const onDragEnd = vi.fn()
    const resizable = useVerticalResizable({
      state,
      minHeight: 60,
      maxHeight: 420,
      onDragEnd,
    })
    resizable.onMouseDown({ clientY: 200, preventDefault: () => {} } as unknown as MouseEvent)
    simulateMouseMove(250)
    simulateMouseUp()
    expect(onDragEnd).toHaveBeenCalledWith(206)
  })

  it('cleanup removes all listeners even mid-drag', () => {
    const resizable = simulateMouseDown(200)
    simulateMouseMove(250)
    resizable.cleanup()
    expect(document.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function))
  })
})
