import { describe, expect, it } from 'vitest'
import { resolveSelectionWrap } from './selectionWrap'

describe('resolveSelectionWrap', () => {
  const content = '你好，世界 hello world'

  it('wraps the selection with double quotes', () => {
    expect(resolveSelectionWrap(content, 3, 5, '"')).toEqual({
      content: '你好，"世界" hello world',
      selectionStart: 4,
      selectionEnd: 6,
    })
  })

  it('wraps the selection with parentheses for both opening and closing keys', () => {
    expect(resolveSelectionWrap(content, 3, 5, '(')).toEqual({
      content: '你好，(世界) hello world',
      selectionStart: 4,
      selectionEnd: 6,
    })
    expect(resolveSelectionWrap(content, 3, 5, ')')).toEqual({
      content: '你好，(世界) hello world',
      selectionStart: 4,
      selectionEnd: 6,
    })
  })

  it('wraps with square brackets and braces', () => {
    expect(resolveSelectionWrap('abc', 0, 3, '[')?.content).toBe('[abc]')
    expect(resolveSelectionWrap('abc', 0, 3, '{')?.content).toBe('{abc}')
  })

  it('wraps with full-width paired symbols', () => {
    expect(resolveSelectionWrap('abc', 0, 3, '（')?.content).toBe('（abc）')
    expect(resolveSelectionWrap('abc', 0, 3, '）')?.content).toBe('（abc）')
    expect(resolveSelectionWrap('abc', 0, 3, '“')?.content).toBe('“abc”')
    expect(resolveSelectionWrap('abc', 0, 3, '”')?.content).toBe('“abc”')
    expect(resolveSelectionWrap('abc', 0, 3, '《')?.content).toBe('《abc》')
    expect(resolveSelectionWrap('abc', 0, 3, '「')?.content).toBe('「abc」')
    expect(resolveSelectionWrap('abc', 0, 3, '『')?.content).toBe('『abc』')
    expect(resolveSelectionWrap('abc', 0, 3, '‘')?.content).toBe('‘abc’')
    expect(resolveSelectionWrap('abc', 0, 3, '［')?.content).toBe('［abc］')
    expect(resolveSelectionWrap('abc', 0, 3, '｛')?.content).toBe('｛abc｝')
  })

  it('handles backward selections', () => {
    const result = resolveSelectionWrap(content, 5, 3, "'")
    expect(result?.content).toBe("你好，'世界' hello world")
    expect(result?.selectionStart).toBe(4)
    expect(result?.selectionEnd).toBe(6)
  })

  it('wraps selections at the very start and end of the content', () => {
    expect(resolveSelectionWrap('abc', 0, 2, '(')).toEqual({
      content: '(ab)c',
      selectionStart: 1,
      selectionEnd: 3,
    })
    expect(resolveSelectionWrap('abc', 1, 3, '(')).toEqual({
      content: 'a(bc)',
      selectionStart: 2,
      selectionEnd: 4,
    })
  })

  it('returns null for plain keys without selection', () => {
    expect(resolveSelectionWrap(content, 4, 6, 'a')).toBeNull()
    expect(resolveSelectionWrap(content, 4, 4, '(')).toBeNull()
    expect(resolveSelectionWrap(content, 4, 4, '"')).toBeNull()
  })

  it('returns null for empty content', () => {
    expect(resolveSelectionWrap('', 0, 0, '(')).toBeNull()
  })
})
