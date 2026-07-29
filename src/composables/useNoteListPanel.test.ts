import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

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

function makeMockDocument() {
  const listenerMap: Record<string, Array<(event: Event) => void>> = {}
  const bodyStyle: Record<string, string> = { cursor: '', userSelect: '' }
  return {
    addEventListener: vi.fn((type: string, f: (event: Event) => void) => {
      if (!listenerMap[type]) listenerMap[type] = []
      listenerMap[type].push(f)
    }),
    removeEventListener: vi.fn(),
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
  vi.stubGlobal('document', makeMockDocument())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function getUseNoteListPanel() {
  const mod = await import('../composables/useNoteListPanel')
  const panel = mod.useNoteListPanel()
  return { ...mod, panel }
}

describe('useNoteListPanel', () => {
  it('default state: width=260, collapsed=false', async () => {
    const { panel } = await getUseNoteListPanel()
    expect(panel.state.width).toBe(260)
    expect(panel.state.collapsed).toBe(false)
    panel.cleanup()
  })

  it('collapse sets collapsed to true', async () => {
    const { panel } = await getUseNoteListPanel()
    panel.collapse()
    expect(panel.state.collapsed).toBe(true)
    panel.cleanup()
  })

  it('toggle round-trip', async () => {
    const { panel } = await getUseNoteListPanel()
    panel.toggle()
    expect(panel.state.collapsed).toBe(true)
    panel.toggle()
    expect(panel.state.collapsed).toBe(false)
    expect(panel.state.width).toBe(260)
    panel.cleanup()
  })

  it('expand restores previousWidth', async () => {
    const { panel } = await getUseNoteListPanel()
    panel.collapse()
    panel.expand()
    expect(panel.state.collapsed).toBe(false)
    expect(panel.state.width).toBe(260)
    panel.cleanup()
  })

  it('persists collapsed state on toggle', async () => {
    mockSetItem.mockClear()
    const { panel } = await getUseNoteListPanel()
    panel.toggle()
    expect(mockSetItem).toHaveBeenCalledWith(
      'flowdesk:notelist:collapsed',
      String(true),
    )
    panel.cleanup()
  })

  it('initializes from localStorage', async () => {
    mockGetNumber.mockReturnValueOnce(320)
    mockGetBoolean.mockReturnValueOnce(true)
    vi.resetModules()
    const { panel } = await getUseNoteListPanel()
    expect(panel.state.width).toBe(320)
    expect(panel.state.collapsed).toBe(true)
    panel.cleanup()
  })

  it('clamps width to min on init', async () => {
    mockGetNumber.mockReturnValueOnce(50)
    vi.resetModules()
    const { panel } = await getUseNoteListPanel()
    expect(panel.state.width).toBe(180)
    panel.cleanup()
  })

  it('clamps width to max on init', async () => {
    mockGetNumber.mockReturnValueOnce(999)
    vi.resetModules()
    const { panel } = await getUseNoteListPanel()
    expect(panel.state.width).toBe(420)
    panel.cleanup()
  })

  it('activate creates resize handler, deactivate cleans up', async () => {
    const { panel } = await getUseNoteListPanel()
    panel.activate()
    expect(panel.resizeState.isResizing).toBe(false)
    panel.deactivate()
    // Should not throw on deactivate
    panel.cleanup()
  })

  it('state persists across activate/deactivate cycles', async () => {
    const { panel } = await getUseNoteListPanel()
    panel.collapse()
    expect(panel.state.collapsed).toBe(true)
    panel.deactivate()
    panel.activate()
    expect(panel.state.collapsed).toBe(true)
    panel.cleanup()
  })

  it('cleanup resets for test isolation', async () => {
    const { panel } = await getUseNoteListPanel()
    panel.collapse()
    panel.cleanup()
    mockGetNumber.mockReturnValue(260)
    mockGetBoolean.mockReturnValue(false)
    vi.resetModules()
    const { panel: panel2 } = await getUseNoteListPanel()
    expect(panel2.state.collapsed).toBe(false)
    panel2.cleanup()
  })
})
