// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useSplitPane } from './useSplitPane'

describe('useSplitPane', () => {
  let container: HTMLElement

  beforeEach(() => {
    localStorage.clear()
    container = document.createElement('div')
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      width: 1000,
      right: 1100,
      top: 0,
      bottom: 600,
      height: 600,
      x: 100,
      y: 0,
      toJSON: () => ({}),
    })
  })

  afterEach(() => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    vi.restoreAllMocks()
  })

  function createSplitPane() {
    return useSplitPane({
      containerRef: ref(container),
      storageKey: 'test:split-ratio',
    })
  }

  it('starts with equal pane widths', () => {
    const splitPane = createSplitPane()

    expect(splitPane.state.ratio).toBe(0.5)
    expect(splitPane.editPaneStyle.value.flexBasis).toBe('calc(50% - 4px)')
  })

  it('updates the ratio from the pointer position and persists it on mouseup', () => {
    const splitPane = createSplitPane()

    splitPane.onMouseDown(new MouseEvent('mousedown', { clientX: 600 }))
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 750 }))

    expect(splitPane.state.isResizing).toBe(true)
    expect(splitPane.state.ratio).toBe(0.65)

    document.dispatchEvent(new MouseEvent('mouseup'))
    expect(splitPane.state.isResizing).toBe(false)
    expect(localStorage.getItem('test:split-ratio')).toBe('0.65')
  })

  it('keeps both panes between 20 and 80 percent', () => {
    const splitPane = createSplitPane()

    splitPane.onMouseDown(new MouseEvent('mousedown'))
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: -1000 }))
    expect(splitPane.state.ratio).toBe(0.2)

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 3000 }))
    expect(splitPane.state.ratio).toBe(0.8)
    document.dispatchEvent(new MouseEvent('mouseup'))
  })

  it('restores and clamps a saved ratio', () => {
    localStorage.setItem('test:split-ratio', '0.95')

    expect(createSplitPane().state.ratio).toBe(0.8)
  })

  it('supports keyboard adjustment and a larger shift step', () => {
    const splitPane = createSplitPane()

    splitPane.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(splitPane.state.ratio).toBe(0.52)

    splitPane.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true }))
    expect(splitPane.state.ratio).toBe(0.42)
    expect(localStorage.getItem('test:split-ratio')).toBe('0.42')
  })

  it('resets the divider to the center', () => {
    localStorage.setItem('test:split-ratio', '0.7')
    const splitPane = createSplitPane()

    splitPane.reset()

    expect(splitPane.state.ratio).toBe(0.5)
    expect(localStorage.getItem('test:split-ratio')).toBe('0.5')
  })

  it('cleans up document interaction state during an active drag', () => {
    const splitPane = createSplitPane()
    splitPane.onMouseDown(new MouseEvent('mousedown'))

    splitPane.cleanup()

    expect(splitPane.state.isResizing).toBe(false)
    expect(document.body.style.cursor).toBe('')
    expect(document.body.style.userSelect).toBe('')
  })
})
