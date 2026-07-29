import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { reactive } from 'vue'
import { useResizable } from './useResizable'

describe('useResizable', () => {
  let state: { width: number }
  let listeners: Record<string, Array<(event: MouseEvent) => void>>

  beforeEach(() => {
    state = reactive({ width: 260 })
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

  function simulateMouseDown(clientX: number): ReturnType<typeof useResizable> {
    const resizable = useResizable({
      state,
      minWidth: 180,
      maxWidth: 420,
    })
    resizable.onMouseDown({ clientX, preventDefault: () => {} } as unknown as MouseEvent)
    return resizable
  }

  function simulateMouseMove(clientX: number): void {
    const moveListeners = listeners['mousemove'] || []
    moveListeners.forEach((fn) => fn({ clientX } as MouseEvent))
  }

  function simulateMouseUp(): void {
    const upListeners = listeners['mouseup'] || []
    upListeners.forEach((fn) => fn({} as MouseEvent))
  }

  it('sets isResizing to true on mousedown', () => {
    const resizable = simulateMouseDown(300)
    expect(resizable.state.isResizing).toBe(true)
  })

  it('registers mousemove and mouseup listeners on mousedown', () => {
    simulateMouseDown(300)
    expect(document.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(document.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function))
  })

  it('updates width on mousemove (drag right)', () => {
    simulateMouseDown(300)
    simulateMouseMove(350)
    expect(state.width).toBe(310) // startWidth 260 + delta 50
  })

  it('updates width on mousemove (drag left)', () => {
    simulateMouseDown(300)
    simulateMouseMove(250)
    expect(state.width).toBe(210) // startWidth 260 + delta -50
  })

  it('clamps width to minWidth', () => {
    simulateMouseDown(300)
    simulateMouseMove(50) // attempt to drag far left
    expect(state.width).toBe(180) // clamped to minWidth
  })

  it('clamps width to maxWidth', () => {
    simulateMouseDown(300)
    simulateMouseMove(800) // attempt to drag far right
    expect(state.width).toBe(420) // clamped to maxWidth
  })

  it('sets isResizing to false on mouseup', () => {
    const resizable = simulateMouseDown(300)
    simulateMouseMove(350)
    simulateMouseUp()
    expect(resizable.state.isResizing).toBe(false)
  })

  it('removes event listeners on mouseup', () => {
    simulateMouseDown(300)
    simulateMouseUp()
    expect(document.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function))
  })

  it('calls onDragEnd on mouseup with final width', () => {
    const onDragEnd = vi.fn()
    const resizable = useResizable({
      state,
      minWidth: 180,
      maxWidth: 420,
      onDragEnd,
    })
    resizable.onMouseDown({ clientX: 300, preventDefault: () => {} } as unknown as MouseEvent)
    simulateMouseMove(350)
    simulateMouseUp()
    expect(onDragEnd).toHaveBeenCalledWith(310)
  })

  it('does not call onDragEnd during mousemove', () => {
    const onDragEnd = vi.fn()
    const resizable = useResizable({
      state,
      minWidth: 180,
      maxWidth: 420,
      onDragEnd,
    })
    resizable.onMouseDown({ clientX: 300, preventDefault: () => {} } as unknown as MouseEvent)
    simulateMouseMove(320)
    expect(onDragEnd).not.toHaveBeenCalled()
    resizable.cleanup()
  })

  it('cleanup removes all listeners even mid-drag', () => {
    const resizable = simulateMouseDown(300)
    simulateMouseMove(320)
    resizable.cleanup()
    expect(document.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function))
  })

  it('cleanup resets isResizing to false', () => {
    const resizable = simulateMouseDown(300)
    resizable.cleanup()
    expect(resizable.state.isResizing).toBe(false)
  })

  it('multiple instances are independent', () => {
    const state2 = reactive({ width: 210 })
    const r1 = useResizable({ state, minWidth: 180, maxWidth: 420 })
    const r2 = useResizable({ state: state2, minWidth: 160, maxWidth: 360 })

    r1.onMouseDown({ clientX: 300, preventDefault: () => {} } as unknown as MouseEvent)
    expect(r1.state.isResizing).toBe(true)
    expect(r2.state.isResizing).toBe(false)

    r1.cleanup()
    r2.cleanup()
  })
})
