import { describe, expect, it, vi } from 'vitest'
import { createWindowCloseCoordinator } from './windowCloseCoordinator'

describe('window close coordinator', () => {
  it('asks the renderer before the first close and ignores duplicate attempts', () => {
    const requestCloseCheck = vi.fn()
    const closeWindow = vi.fn()
    const coordinator = createWindowCloseCoordinator({ requestCloseCheck, closeWindow })
    const firstEvent = { preventDefault: vi.fn() }
    const secondEvent = { preventDefault: vi.fn() }

    coordinator.handleClose(firstEvent)
    coordinator.handleClose(secondEvent)

    expect(firstEvent.preventDefault).toHaveBeenCalledOnce()
    expect(secondEvent.preventDefault).toHaveBeenCalledOnce()
    expect(requestCloseCheck).toHaveBeenCalledOnce()
    expect(requestCloseCheck).toHaveBeenCalledWith(1)
  })

  it('keeps the window open when the renderer cancels', () => {
    const closeWindow = vi.fn()
    const onDecision = vi.fn()
    const coordinator = createWindowCloseCoordinator({
      requestCloseCheck: vi.fn(),
      closeWindow,
      onDecision,
    })

    coordinator.handleClose({ preventDefault: vi.fn() })
    coordinator.handleDecision(1, false)

    expect(closeWindow).not.toHaveBeenCalled()
    expect(onDecision).toHaveBeenCalledWith(false)
  })

  it('allows exactly one follow-up close after renderer approval', () => {
    const closeWindow = vi.fn()
    const onDecision = vi.fn()
    const coordinator = createWindowCloseCoordinator({
      requestCloseCheck: vi.fn(),
      closeWindow,
      onDecision,
    })

    coordinator.handleClose({ preventDefault: vi.fn() })
    coordinator.handleDecision(1, true)
    expect(closeWindow).toHaveBeenCalledOnce()
    expect(onDecision).toHaveBeenCalledWith(true)

    const approvedEvent = { preventDefault: vi.fn() }
    coordinator.handleClose(approvedEvent)
    expect(approvedEvent.preventDefault).not.toHaveBeenCalled()
  })

  it('ignores stale renderer responses', () => {
    const closeWindow = vi.fn()
    const coordinator = createWindowCloseCoordinator({
      requestCloseCheck: vi.fn(),
      closeWindow,
    })

    coordinator.handleClose({ preventDefault: vi.fn() })
    coordinator.handleDecision(99, true)

    expect(closeWindow).not.toHaveBeenCalled()
  })
})
