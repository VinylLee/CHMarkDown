import { describe, expect, it, vi } from 'vitest'
import { registerAppCloseGuard, runAppCloseGuard } from './useAppCloseGuard'

describe('app close guard registry', () => {
  it('allows closing when no page has registered a guard', async () => {
    await expect(runAppCloseGuard()).resolves.toBe(true)
  })

  it('runs the active page guard', async () => {
    const guard = vi.fn().mockResolvedValue(false)
    const unregister = registerAppCloseGuard(guard)

    await expect(runAppCloseGuard()).resolves.toBe(false)
    expect(guard).toHaveBeenCalledOnce()

    unregister()
    await expect(runAppCloseGuard()).resolves.toBe(true)
  })

  it('does not let an older page unregister a newer guard', async () => {
    const unregisterOld = registerAppCloseGuard(() => Promise.resolve(false))
    const unregisterCurrent = registerAppCloseGuard(() => Promise.resolve(true))

    unregisterOld()
    await expect(runAppCloseGuard()).resolves.toBe(true)

    unregisterCurrent()
  })
})
