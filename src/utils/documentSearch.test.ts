import { describe, expect, it } from 'vitest'
import {
  findTextMatches,
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
})
