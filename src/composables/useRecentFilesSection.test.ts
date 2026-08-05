import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_RECENT_FILES_HEIGHT,
  MAX_RECENT_FILES_HEIGHT,
  MIN_RECENT_FILES_HEIGHT,
  RECENT_FILES_COLLAPSED_KEY,
  RECENT_FILES_HEIGHT_KEY,
  useRecentFilesSection,
} from './useRecentFilesSection'

const mockGetBoolean = vi.fn()
const mockGetNumber = vi.fn()
const mockSetItem = vi.fn()

vi.mock('./useLocalStorage', () => ({
  useLocalStorage: () => ({
    getBoolean: mockGetBoolean,
    getNumber: mockGetNumber,
    setItem: mockSetItem,
  }),
}))

describe('useRecentFilesSection', () => {
  beforeEach(() => {
    mockGetBoolean.mockReset()
    mockGetNumber.mockReset()
    mockSetItem.mockReset()
    mockGetNumber.mockReturnValue(DEFAULT_RECENT_FILES_HEIGHT)
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

  it('uses the default recent-files height when no preference has been saved', () => {
    const section = useRecentFilesSection()
    expect(mockGetNumber).toHaveBeenCalledWith(RECENT_FILES_HEIGHT_KEY, DEFAULT_RECENT_FILES_HEIGHT)
    expect(section.state.height).toBe(DEFAULT_RECENT_FILES_HEIGHT)
  })

  it('restores a saved height and clamps out-of-range values', () => {
    mockGetNumber.mockReturnValueOnce(999)
    expect(useRecentFilesSection().state.height).toBe(MAX_RECENT_FILES_HEIGHT)

    mockGetNumber.mockReturnValueOnce(10)
    expect(useRecentFilesSection().state.height).toBe(MIN_RECENT_FILES_HEIGHT)
  })
})
