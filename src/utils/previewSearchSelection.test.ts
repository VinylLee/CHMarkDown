// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { getContainedSelectionText } from './documentSearch'

function selectContents(node: Node): Selection {
  const selection = window.getSelection()
  if (!selection) throw new Error('Selection API is unavailable')
  selection.removeAllRanges()
  const range = document.createRange()
  range.selectNodeContents(node)
  selection.addRange(range)
  return selection
}

afterEach(() => {
  window.getSelection()?.removeAllRanges()
  document.body.replaceChildren()
})

describe('preview search selection', () => {
  it('reads selected text contained by the Markdown preview', () => {
    const preview = document.createElement('div')
    preview.innerHTML = '<p>first <strong>selected</strong> text</p>'
    document.body.append(preview)

    const selection = selectContents(preview.querySelector('strong')!)

    expect(getContainedSelectionText(preview, selection)).toBe('selected')
  })

  it('reads a selection spanning multiple preview elements', () => {
    const preview = document.createElement('div')
    preview.innerHTML = '<p>first</p><p>second</p>'
    document.body.append(preview)

    const selection = selectContents(preview)

    expect(getContainedSelectionText(preview, selection)).toBe('firstsecond')
  })

  it('ignores collapsed and external selections', () => {
    const preview = document.createElement('div')
    preview.textContent = 'preview text'
    const searchInput = document.createElement('input')
    searchInput.value = 'search query'
    document.body.append(preview, searchInput)

    const collapsed = window.getSelection()!
    const collapsedRange = document.createRange()
    collapsedRange.setStart(preview.firstChild!, 2)
    collapsedRange.collapse(true)
    collapsed.addRange(collapsedRange)
    expect(getContainedSelectionText(preview, collapsed)).toBeNull()

    const externalSelection = selectContents(searchInput)
    expect(getContainedSelectionText(preview, externalSelection)).toBeNull()
  })
})
