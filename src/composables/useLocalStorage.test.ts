import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

// We need to reset the module-level singleton between tests.
// The composable's state.available is set at import time, so we use
// vi.resetModules() and dynamic import to get a fresh instance.
// But for simplicity, we mock localStorage at the global level and
// call resetAvailable() between tests.

let mockStorage: Record<string, string>
let mockThrows: boolean

function createMockLocalStorage() {
  return {
    getItem: vi.fn((key: string) => {
      if (mockThrows) throw new Error('Storage unavailable')
      return mockStorage[key] ?? null
    }),
    setItem: vi.fn((key: string, value: string) => {
      if (mockThrows) throw new Error('Storage unavailable')
      mockStorage[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      if (mockThrows) throw new Error('Storage unavailable')
      delete mockStorage[key]
    }),
  }
}

describe('useLocalStorage', () => {
  beforeEach(async () => {
    mockStorage = {}
    mockThrows = false
    vi.stubGlobal('localStorage', createMockLocalStorage())

    // Dynamic import to get a fresh module with reset state
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function getUseLocalStorage() {
    const mod = await import('../composables/useLocalStorage')
    return mod.useLocalStorage()
  }

  it('getItem returns stored value', async () => {
    const ls = await getUseLocalStorage()
    ls.setItem('test-key', 'hello')
    expect(ls.getItem('test-key')).toBe('hello')
  })

  it('getItem returns null for missing key', async () => {
    const ls = await getUseLocalStorage()
    expect(ls.getItem('nonexistent')).toBeNull()
  })

  it('setItem stores a value', async () => {
    const ls = await getUseLocalStorage()
    ls.setItem('key', 'world')
    expect(mockStorage['key']).toBe('world')
  })

  it('getNumber returns parsed number', async () => {
    const ls = await getUseLocalStorage()
    ls.setItem('num-key', '42')
    expect(ls.getNumber('num-key', 0)).toBe(42)
  })

  it('getNumber returns fallback for missing key', async () => {
    const ls = await getUseLocalStorage()
    expect(ls.getNumber('missing', 100)).toBe(100)
  })

  it('getNumber returns fallback for non-numeric value', async () => {
    const ls = await getUseLocalStorage()
    ls.setItem('bad', 'xyz')
    expect(ls.getNumber('bad', 50)).toBe(50)
  })

  it('getNumber returns fallback for NaN', async () => {
    const ls = await getUseLocalStorage()
    ls.setItem('nan', 'NaN')
    expect(ls.getNumber('nan', 30)).toBe(30)
  })

  it('getBoolean returns true for "true"', async () => {
    const ls = await getUseLocalStorage()
    ls.setItem('bool', 'true')
    expect(ls.getBoolean('bool', false)).toBe(true)
  })

  it('getBoolean returns false for "false"', async () => {
    const ls = await getUseLocalStorage()
    ls.setItem('bool', 'false')
    expect(ls.getBoolean('bool', true)).toBe(false)
  })

  it('getBoolean returns fallback for missing key', async () => {
    const ls = await getUseLocalStorage()
    expect(ls.getBoolean('missing', true)).toBe(true)
    expect(ls.getBoolean('missing', false)).toBe(false)
  })

  it('available is true when localStorage works', async () => {
    const ls = await getUseLocalStorage()
    expect(ls.available).toBe(true)
  })

  it('setItem and getItem return null when storage throws', async () => {
    mockThrows = true
    const ls = await getUseLocalStorage()
    // The availability check runs at import time; if mockThrows is set
    // before import, available should be false.
    expect(ls.available).toBe(false)
    ls.setItem('any', 'val')
    expect(ls.getItem('any')).toBeNull()
  })

  it('getNumber returns fallback when storage is unavailable', async () => {
    mockThrows = true
    const ls = await getUseLocalStorage()
    expect(ls.getNumber('any', 99)).toBe(99)
  })

  it('getBoolean returns fallback when storage is unavailable', async () => {
    mockThrows = true
    const ls = await getUseLocalStorage()
    expect(ls.getBoolean('any', true)).toBe(true)
  })
})
