import { describe, expect, it, vi } from 'vitest'
import { resolveUnsavedChanges } from './resolveUnsavedChanges'

describe('resolveUnsavedChanges', () => {
  it('allows navigation without prompting when clean', async () => {
    const choose = vi.fn()
    const save = vi.fn()

    await expect(resolveUnsavedChanges({ dirty: false, choose, save })).resolves.toBe(true)
    expect(choose).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
  })

  it('allows navigation after a successful save', async () => {
    const save = vi.fn().mockResolvedValue(true)

    await expect(
      resolveUnsavedChanges({
        dirty: true,
        choose: async () => 'confirm',
        save,
      })
    ).resolves.toBe(true)
    expect(save).toHaveBeenCalledOnce()
  })

  it('blocks navigation after a failed save', async () => {
    await expect(
      resolveUnsavedChanges({
        dirty: true,
        choose: async () => 'confirm',
        save: async () => false,
      })
    ).resolves.toBe(false)
  })

  it('allows navigation without saving when changes are discarded', async () => {
    const save = vi.fn()

    await expect(
      resolveUnsavedChanges({
        dirty: true,
        choose: async () => 'secondary',
        save,
      })
    ).resolves.toBe(true)
    expect(save).not.toHaveBeenCalled()
  })

  it('blocks navigation without saving when cancelled', async () => {
    const save = vi.fn()

    await expect(
      resolveUnsavedChanges({
        dirty: true,
        choose: async () => 'cancel',
        save,
      })
    ).resolves.toBe(false)
    expect(save).not.toHaveBeenCalled()
  })
})
