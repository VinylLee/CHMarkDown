import { describe, expect, it } from 'vitest'
import { resolveWindowCloseAction } from './windowClosePolicy'

describe('window close policy', () => {
  it('hides an ordinary close when the tray is available', () => {
    expect(resolveWindowCloseAction({
      systemSessionEnding: false,
      quitting: false,
      trayAvailable: true,
      rendererReady: true,
    })).toBe('hide')
  })

  it('asks the renderer before an explicit exit', () => {
    expect(resolveWindowCloseAction({
      systemSessionEnding: false,
      quitting: true,
      trayAvailable: true,
      rendererReady: true,
    })).toBe('confirm')
  })

  it('asks the renderer before closing without a tray', () => {
    expect(resolveWindowCloseAction({
      systemSessionEnding: false,
      quitting: false,
      trayAvailable: false,
      rendererReady: true,
    })).toBe('confirm')
  })

  it('allows close when the renderer is unavailable', () => {
    expect(resolveWindowCloseAction({
      systemSessionEnding: false,
      quitting: false,
      trayAvailable: false,
      rendererReady: false,
    })).toBe('allow')
  })

  it('never blocks Windows logout or shutdown', () => {
    expect(resolveWindowCloseAction({
      systemSessionEnding: true,
      quitting: false,
      trayAvailable: true,
      rendererReady: true,
    })).toBe('allow')
  })
})
