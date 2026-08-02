import { describe, expect, it } from 'vitest'
import {
  findTextMatches,
  findAdjacentMatchIndex,
  findSelectedMatchIndex,
  getSelectedSearchQuery,
  replaceAllTextMatches,
  replaceTextMatch,
} from './documentSearch'

const insensitive = { caseSensitive: false, wholeWord: false }

describe('documentSearch', () => {
  it('finds literal text without treating regex symbols specially', () => {
    expect(findTextMatches('a.b A.B a-b', 'a.b', insensitive)).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
    ])
  })

  it('supports case-sensitive matching', () => {
    expect(findTextMatches('Markdown markdown', 'Markdown', {
      caseSensitive: true,
      wholeWord: false,
    })).toEqual([{ start: 0, end: 8 }])
  })

  it('supports Unicode-aware whole-word boundaries', () => {
    expect(findTextMatches('cat scatter cat 猫 猫咪 猫', 'cat', {
      caseSensitive: false,
      wholeWord: true,
    })).toEqual([
      { start: 0, end: 3 },
      { start: 12, end: 15 },
    ])
    expect(findTextMatches('猫 猫咪 猫', '猫', {
      caseSensitive: true,
      wholeWord: true,
    })).toEqual([
      { start: 0, end: 1 },
      { start: 5, end: 6 },
    ])
    expect(findTextMatches('tag.md other.md', '.md', {
      caseSensitive: true,
      wholeWord: true,
    })).toHaveLength(2)
  })

  it('replaces exactly one selected match', () => {
    expect(replaceTextMatch('one two one', { start: 8, end: 11 }, 'three'))
      .toBe('one two three')
  })

  it('replaces all matches without shifting later offsets', () => {
    const content = 'a **a** a'
    const matches = findTextMatches(content, 'a', insensitive)
    expect(replaceAllTextMatches(content, matches, 'long')).toBe('long **long** long')
  })

  it('finds the next match after the current cursor or selection', () => {
    const matches = findTextMatches('one one one', 'one', insensitive)

    expect(findAdjacentMatchIndex(matches, { start: 4, end: 4 }, 1)).toBe(1)
    expect(findAdjacentMatchIndex(matches, { start: 4, end: 7 }, 1)).toBe(2)
  })

  it('finds the previous match before the current cursor or selection', () => {
    const matches = findTextMatches('one one one', 'one', insensitive)

    expect(findAdjacentMatchIndex(matches, { start: 8, end: 8 }, -1)).toBe(1)
    expect(findAdjacentMatchIndex(matches, { start: 4, end: 7 }, -1)).toBe(0)
  })

  it('wraps at the start and end of the document', () => {
    const matches = findTextMatches('one two one', 'one', insensitive)

    expect(findAdjacentMatchIndex(matches, { start: 11, end: 11 }, 1)).toBe(0)
    expect(findAdjacentMatchIndex(matches, { start: 0, end: 0 }, -1)).toBe(1)
  })

  it('uses the current non-empty editor selection as the search query', () => {
    expect(getSelectedSearchQuery('first second third', { start: 6, end: 12 }))
      .toBe('second')
    expect(getSelectedSearchQuery('first second', { start: 5, end: 5 })).toBeNull()
  })

  it('identifies which repeated match is currently selected', () => {
    const matches = findTextMatches('word other word', 'word', insensitive)

    expect(findSelectedMatchIndex(matches, { start: 11, end: 15 })).toBe(1)
    expect(findSelectedMatchIndex(matches, { start: 5, end: 5 })).toBe(-1)
  })
})
