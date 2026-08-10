import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCoalescedTask } from './coalescedTask'

afterEach(() => {
  vi.useRealTimers()
})

describe('createCoalescedTask', () => {
  it('merges a burst into one trailing execution', () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const task = createCoalescedTask(callback, { delayMs: 80, maxWaitMs: 240 })

    task.schedule()
    vi.advanceTimersByTime(50)
    task.schedule()
    vi.advanceTimersByTime(79)
    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(task.pending()).toBe(false)
  })

  it('runs by maxWait during uninterrupted activity', () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const task = createCoalescedTask(callback, { delayMs: 80, maxWaitMs: 240 })

    for (let elapsed = 0; elapsed < 240; elapsed += 40) {
      task.schedule()
      vi.advanceTimersByTime(40)
    }

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('supports immediate flush and cancellation', () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const task = createCoalescedTask(callback, { delayMs: 80, maxWaitMs: 240 })

    task.schedule()
    task.flush()
    expect(callback).toHaveBeenCalledTimes(1)

    task.schedule()
    task.cancel()
    vi.runAllTimers()
    expect(callback).toHaveBeenCalledTimes(1)
  })
})
