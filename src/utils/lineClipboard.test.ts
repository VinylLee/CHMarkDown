import { describe, expect, it } from 'vitest'
import {
  cutCurrentLine,
  getLineClipboardPayload,
  pasteLineAbove,
} from './lineClipboard'

describe('line clipboard', () => {
  it('copies the complete current line with its line break', () => {
    expect(getLineClipboardPayload('first\nsecond\nthird', 8)).toEqual({
      start: 6,
      end: 13,
      text: 'second\n',
    })
  })

  it('adds a line break when copying the final line', () => {
    expect(getLineClipboardPayload('first\nlast', 9).text).toBe('last\n')
  })

  it('cuts a middle line without leaving a blank line', () => {
    expect(cutCurrentLine('first\nsecond\nthird', 8)).toEqual({
      content: 'first\nthird',
      cursor: 6,
    })
  })

  it('cuts the final line together with its preceding separator', () => {
    expect(cutCurrentLine('first\nlast', 9)).toEqual({
      content: 'first',
      cursor: 5,
    })
  })

  it('cuts the only line to an empty document', () => {
    expect(cutCurrentLine('only line', 4)).toEqual({
      content: '',
      cursor: 0,
    })
  })

  it('cuts an empty final line by removing its preceding separator', () => {
    expect(cutCurrentLine('first\n', 6)).toEqual({
      content: 'first',
      cursor: 5,
    })
  })

  it('pastes a copied line above the current line and preserves the column', () => {
    expect(pasteLineAbove('first\ncurrent\nlast', 9, 'copied\n')).toEqual({
      content: 'first\ncopied\ncurrent\nlast',
      cursor: 16,
    })
  })

  it('normalizes line clipboard text without a trailing line break', () => {
    expect(pasteLineAbove('current', 3, 'copied')).toEqual({
      content: 'copied\ncurrent',
      cursor: 10,
    })
  })
})
