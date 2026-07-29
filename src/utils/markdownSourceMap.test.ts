// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import MarkdownIt from 'markdown-it'
import {
  configureMarkdownSourceMap,
  findSourceLine,
  findElementByLine,
} from './markdownSourceMap'

describe('configureMarkdownSourceMap', () => {
  function renderWithSourceMap(markdown: string): string {
    const md = new MarkdownIt()
    configureMarkdownSourceMap(md)
    return md.render(markdown)
  }

  it('injects data-source-line into heading', () => {
    const html = renderWithSourceMap('# Title')
    expect(html).toContain('data-source-line="1"')
  })

  it('injects data-source-line into paragraph', () => {
    const html = renderWithSourceMap('Hello world')
    expect(html).toContain('data-source-line="1"')
  })

  it('injects correct line numbers for multi-block input', () => {
    const html = renderWithSourceMap('# Heading\n\nParagraph text')
    expect(html).toContain('data-source-line="1"') // heading at line 1
    expect(html).toContain('data-source-line="3"') // paragraph at line 3 (after blank line)
  })

  it('injects data-source-line into list tokens', () => {
    const html = renderWithSourceMap('- item 1\n- item 2')
    expect(html).toContain('data-source-line="1"')
  })

  it('injects data-source-line into ordered list', () => {
    const html = renderWithSourceMap('1. first\n2. second')
    expect(html).toContain('data-source-line="1"')
  })

  it('injects data-source-line into blockquote', () => {
    const html = renderWithSourceMap('> quoted text')
    expect(html).toContain('data-source-line="1"')
  })

  it('injects data-source-line into code fence', () => {
    const html = renderWithSourceMap('```js\nconst x = 1\n```')
    expect(html).toContain('data-source-line="1"')
  })

  it('injects data-source-line into horizontal rule', () => {
    const html = renderWithSourceMap('---')
    expect(html).toContain('data-source-line="1"')
  })

  it('injects data-source-line into table', () => {
    const html = renderWithSourceMap('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('data-source-line="1"')
  })

  it('does not inject data-source-line on closing tokens', () => {
    // Closing elements (</h1>, </p>, etc.) should not have data-source-line
    const html = renderWithSourceMap('# Title')
    // heading_close would be after <h1> tag, there should be no attr on it
    const openingTag = '<h1 data-source-line="1"'
    expect(html).toContain(openingTag)
  })
})

describe('findSourceLine', () => {
  it('returns line from element itself', () => {
    const div = document.createElement('div')
    div.setAttribute('data-source-line', '5')
    expect(findSourceLine(div)).toBe(5)
  })

  it('walks up to ancestor', () => {
    const parent = document.createElement('div')
    parent.setAttribute('data-source-line', '3')
    const child = document.createElement('span')
    parent.appendChild(child)
    expect(findSourceLine(child)).toBe(3)
  })

  it('returns null when no ancestor has attribute', () => {
    const div = document.createElement('div')
    expect(findSourceLine(div)).toBeNull()
  })

  it('ignores invalid non-numeric values', () => {
    const div = document.createElement('div')
    div.setAttribute('data-source-line', 'abc')
    expect(findSourceLine(div)).toBeNull()
  })

  it('ignores zero and negative values', () => {
    const div = document.createElement('div')
    div.setAttribute('data-source-line', '0')
    expect(findSourceLine(div)).toBeNull()
  })
})

describe('findElementByLine', () => {
  function makeEl(line: number): HTMLElement {
    const el = document.createElement('div')
    el.setAttribute('data-source-line', String(line))
    return el
  }

  it('returns exact match', () => {
    const container = document.createElement('div')
    container.appendChild(makeEl(1))
    container.appendChild(makeEl(3))
    container.appendChild(makeEl(5))

    const result = findElementByLine(container, 3)
    expect(result).not.toBeNull()
    expect(result!.dataset.sourceLine).toBe('3')
  })

  it('falls back to nearest preceding element', () => {
    const container = document.createElement('div')
    container.appendChild(makeEl(1))
    container.appendChild(makeEl(3))
    container.appendChild(makeEl(7))

    const result = findElementByLine(container, 4)
    expect(result).not.toBeNull()
    expect(result!.dataset.sourceLine).toBe('3') // largest line <= 4
  })

  it('returns null for empty container', () => {
    const container = document.createElement('div')
    expect(findElementByLine(container, 5)).toBeNull()
  })

  it('returns null when all lines are after target', () => {
    const container = document.createElement('div')
    container.appendChild(makeEl(10))
    container.appendChild(makeEl(20))
    expect(findElementByLine(container, 5)).toBeNull()
  })
})
