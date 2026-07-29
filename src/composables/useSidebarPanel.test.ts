import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

// Mock useLocalStorage to avoid actual localStorage dependency
const mockGetNumber = vi.fn((_key: string, fallback: number) => fallback)
const mockGetBoolean = vi.fn((_key: string, fallback: boolean) => fallback)
const mockSetItem = vi.fn()

vi.mock('./useLocalStorage', () => ({
  useLocalStorage: () => ({
    getItem: vi.fn(),
    setItem: mockSetItem,
    getNumber: mockGetNumber,
    getBoolean: mockGetBoolean,
    available: true,
    resetAvailable: vi.fn(),
  }),
}))

// Mock document for useResizable
let listeners: Record<string, Array<(event: MouseEvent) => void>>

function makeMockDocument() {
  const listenerMap: Record<string, Array<(event: Event) => void>> = {}
  const bodyStyle: Record<string, string> = { cursor: '', userSelect: '' }
  return {
    addEventListener: vi.fn((type: string, f: (event: Event) => void) => {
      if (!listenerMap[type]) listenerMap[type] = []
      listenerMap[type].push(f)
    }),
    removeEventListener: vi.fn((type: string, f: (event: Event) => void) => {
      if (listenerMap[type]) {
        listenerMap[type] = listenerMap[type].filter((l) => l !== f)
      }
    }),
    createElement: vi.fn((tag: string) => {
      const el: Record<string, unknown> = {
        tagName: tag.toUpperCase(),
        style: {},
        setAttribute: vi.fn(),
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        classList: { add: vi.fn(), remove: vi.fn() },
      }
      return el
    }),
    createTextNode: vi.fn((text: string) => ({ textContent: text })),
    head: { appendChild: vi.fn() },
    body: {
      style: {
        get cursor() { return bodyStyle.cursor },
        set cursor(v: string) { bodyStyle.cursor = v },
        get userSelect() { return bodyStyle.userSelect },
        set userSelect(v: string) { bodyStyle.userSelect = v },
      },
    },
  }
}

beforeEach(() => {
  listeners = {}
  vi.stubGlobal('document', makeMockDocument())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// Dynamic import to get fresh module each time
async function getUseSidebarPanel() {
  const mod = await import('../composables/useSidebarPanel')
  const panel = mod.useSidebarPanel()
  return { ...mod, panel }
}

describe('useSidebarPanel', () => {
  it('default state: width=210, collapsed=false', async () => {
    const { panel } = await getUseSidebarPanel()
    expect(panel.state.width).toBe(210)
    expect(panel.state.collapsed).toBe(false)
    panel.cleanup()
  })

  it('collapse sets collapsed to true and saves previousWidth', async () => {
    const { panel } = await getUseSidebarPanel()
    panel.collapse()
    expect(panel.state.collapsed).toBe(true)
    expect(panel.state.width).toBe(210) // width unchanged, CSS handles visual
    panel.cleanup()
  })

  it('expand restores previousWidth', async () => {
    const { panel } = await getUseSidebarPanel()
    panel.collapse()
    panel.expand()
    expect(panel.state.collapsed).toBe(false)
    expect(panel.state.width).toBe(210)
    panel.cleanup()
  })

  it('toggle round-trip: expanded → collapsed → expanded', async () => {
    const { panel } = await getUseSidebarPanel()
    expect(panel.state.collapsed).toBe(false)

    panel.toggle()
    expect(panel.state.collapsed).toBe(true)

    panel.toggle()
    expect(panel.state.collapsed).toBe(false)
    expect(panel.state.width).toBe(210)
    panel.cleanup()
  })

  it('collapse is idempotent', async () => {
    const { panel } = await getUseSidebarPanel()
    panel.collapse()
    panel.collapse() // second call should be no-op
    expect(panel.state.collapsed).toBe(true)
    panel.cleanup()
  })

  it('expand is idempotent when already expanded', async () => {
    const { panel } = await getUseSidebarPanel()
    panel.expand() // no-op
    expect(panel.state.collapsed).toBe(false)
    panel.cleanup()
  })

  it('persists collapsed state on toggle', async () => {
    mockSetItem.mockClear()
    const { panel } = await getUseSidebarPanel()
    panel.toggle()
    expect(mockSetItem).toHaveBeenCalledWith(
      'flowdesk:sidebar:collapsed',
      String(true),
    )
    panel.cleanup()
  })

  it('initializes from localStorage', async () => {
    mockGetNumber.mockReturnValueOnce(280)
    mockGetBoolean.mockReturnValueOnce(true)
    // Reset module to re-trigger the import-time state
    vi.resetModules()
    const { panel } = await getUseSidebarPanel()
    expect(panel.state.width).toBe(280)
    expect(panel.state.collapsed).toBe(true)
    panel.cleanup()
  })

  it('clamps width to min on init', async () => {
    mockGetNumber.mockReturnValueOnce(40) // below MIN_WIDTH of 56
    vi.resetModules()
    const { panel } = await getUseSidebarPanel()
    expect(panel.state.width).toBe(56)
    panel.cleanup()
  })

  it('clamps width to max on init', async () => {
    mockGetNumber.mockReturnValueOnce(999) // above MAX_WIDTH of 360
    vi.resetModules()
    const { panel } = await getUseSidebarPanel()
    expect(panel.state.width).toBe(360)
    panel.cleanup()
  })

  it('provides resizeState from useResizable', async () => {
    const { panel } = await getUseSidebarPanel()
    expect(panel.resizeState.isResizing).toBe(false)
    panel.cleanup()
  })

  it('cleanup resets for test isolation', async () => {
    const { panel } = await getUseSidebarPanel()
    panel.collapse()
    panel.cleanup()

    // After cleanup + fresh call, should get defaults again
    mockGetNumber.mockReturnValue(210)
    mockGetBoolean.mockReturnValue(false)
    vi.resetModules()
    const { panel: panel2 } = await getUseSidebarPanel()
    expect(panel2.state.collapsed).toBe(false)
    panel2.cleanup()
  })
})
