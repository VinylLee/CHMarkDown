import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RECENT_FILES_COLLAPSED_KEY, useRecentFilesSection } from './useRecentFilesSection'

const mockGetBoolean = vi.fn()
const mockSetItem = vi.fn()

vi.mock('./useLocalStorage', () => ({
  useLocalStorage: () => ({
    getBoolean: mockGetBoolean,
    setItem: mockSetItem,
  }),
}))

describe('useRecentFilesSection', () => {
  beforeEach(() => {
    mockGetBoolean.mockReset()
    mockSetItem.mockReset()
  })

  it('starts expanded when no preference has been saved', () => {
    mockGetBoolean.mockReturnValue(false)

    const section = useRecentFilesSection()

    expect(mockGetBoolean).toHaveBeenCalledWith(RECENT_FILES_COLLAPSED_KEY, false)
    expect(section.state.collapsed).toBe(false)
  })

  it('restores a collapsed section and persists later toggles', () => {
    mockGetBoolean.mockReturnValue(true)
    const section = useRecentFilesSection()

    expect(section.state.collapsed).toBe(true)
    section.toggle()

    expect(section.state.collapsed).toBe(false)
    expect(mockSetItem).toHaveBeenCalledWith(RECENT_FILES_COLLAPSED_KEY, 'false')
  })
})
