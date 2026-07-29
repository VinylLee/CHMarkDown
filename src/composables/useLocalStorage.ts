import { reactive } from 'vue'

interface LocalStorageState {
  available: boolean
}

const state = reactive<LocalStorageState>({
  available: checkAvailability(),
})

function checkAvailability(): boolean {
  try {
    const key = '__flowdesk_test__'
    localStorage.setItem(key, key)
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export function useLocalStorage() {
  function getItem(key: string): string | null {
    if (!state.available) return null
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }

  function setItem(key: string, value: string): void {
    if (!state.available) return
    try {
      localStorage.setItem(key, value)
    } catch {
      // Storage full or unavailable — silently fail
    }
  }

  function getNumber(key: string, fallback: number): number {
    const raw = getItem(key)
    if (raw === null) return fallback
    const num = Number(raw)
    if (!Number.isFinite(num)) return fallback
    return num
  }

  function getBoolean(key: string, fallback: boolean): boolean {
    const raw = getItem(key)
    if (raw === null) return fallback
    return raw === 'true'
  }

  /** Reset the availability check (for testing) */
  function resetAvailable(): void {
    state.available = checkAvailability()
  }

  return {
    getItem,
    setItem,
    getNumber,
    getBoolean,
    available: state.available,
    resetAvailable,
  }
}
