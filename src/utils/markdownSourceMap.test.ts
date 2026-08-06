// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import MarkdownIt from 'markdown-it'
import {
  configureMarkdownSourceMap,
  findSourceLine,
  findElementByLine,
  findSourceRange,
  resolveSourceLineFromPreviewClick,
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

  it('injects data-source-end-line on a multi-line paragraph', () => {
    const html = renderWithSourceMap('First line\nsecond line')
    expect(html).toContain('data-source-line="1"')
    expect(html).toContain('data-source-end-line="2"')
  })

  it('keeps end line equal to start line for single-line blocks', () => {
    const html = renderWithSourceMap('# Title')
    expect(html).toContain('data-source-line="1"')
    expect(html).toContain('data-source-end-line="1"')
  })

  it('injects data-source-end-line on multi-line list items', () => {
    const html = renderWithSourceMap('- item 1\n  continued')
    expect(html).toContain('data-source-line="1"')
    expect(html).toContain('data-source-end-line="2"')
  })

  it('injects data-source-end-line on multi-line blockquotes', () => {
    const html = renderWithSourceMap('> quote 1\n> quote 2')
    expect(html).toContain('data-source-line="1"')
    expect(html).toContain('data-source-end-line="2"')
  })

  it('injects data-source-end-line on fence code blocks', () => {
    const html = renderWithSourceMap('```js\nconst a = 1\nconst b = 2\n```')
    expect(html).toContain('data-source-line="1"')
    expect(html).toContain('data-source-end-line="4"')
  })

  it('injects data-source-end-line on tables', () => {
    const html = renderWithSourceMap('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('data-source-line="1"')
    expect(html).toContain('data-source-end-line="3"')
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

describe('findSourceRange', () => {
  it('returns start and end line from the element itself', () => {
    const div = document.createElement('div')
    div.setAttribute('data-source-line', '10')
    div.setAttribute('data-source-end-line', '14')
    const range = findSourceRange(div)
    expect(range).toEqual({ element: div, startLine: 10, endLine: 14 })
  })

  it('walks up to an ancestor', () => {
    const parent = document.createElement('div')
    parent.setAttribute('data-source-line', '3')
    parent.setAttribute('data-source-end-line', '6')
    const child = document.createElement('span')
    parent.appendChild(child)
    const range = findSourceRange(child)
    expect(range?.startLine).toBe(3)
    expect(range?.endLine).toBe(6)
    expect(range?.element).toBe(parent)
  })

  it('falls back to start line when end attribute is missing', () => {
    const div = document.createElement('div')
    div.setAttribute('data-source-line', '5')
    expect(findSourceRange(div)?.endLine).toBe(5)
  })

  it('treats an invalid end smaller than start as start', () => {
    const div = document.createElement('div')
    div.setAttribute('data-source-line', '8')
    div.setAttribute('data-source-end-line', '2')
    expect(findSourceRange(div)?.endLine).toBe(8)
  })

  it('skips invalid start values and returns null without ancestors', () => {
    const div = document.createElement('div')
    div.setAttribute('data-source-line', 'abc')
    expect(findSourceRange(div)).toBeNull()
  })
})

describe('resolveSourceLineFromPreviewClick', () => {
  function makeBlock(attrs: Record<string, string>, tag = 'div'): HTMLElement {
    const el = document.createElement(tag)
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value)
    }
    return el
  }

  function mockRect(el: HTMLElement, rect: Partial<DOMRect>): void {
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0,
      x: 0, y: 0, toJSON: () => ({}),
      ...rect,
    } as DOMRect)
  }

  it('maps top, middle and bottom clicks inside a 100-120 block', () => {
    const block = makeBlock({ 'data-source-line': '100', 'data-source-end-line': '120' })
    mockRect(block, { top: 0, bottom: 200, height: 200 })
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      paddingTop: '0px',
      paddingBottom: '0px',
    } as CSSStyleDeclaration)

    expect(resolveSourceLineFromPreviewClick(block, 0)).toBe(100)
    expect(resolveSourceLineFromPreviewClick(block, 100)).toBe(110)
    expect(resolveSourceLineFromPreviewClick(block, 200)).toBe(120)
  })

  it('clamps clicks outside the block to its range', () => {
    const block = makeBlock({ 'data-source-line': '100', 'data-source-end-line': '120' })
    mockRect(block, { top: 0, bottom: 200, height: 200 })
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      paddingTop: '0px',
      paddingBottom: '0px',
    } as CSSStyleDeclaration)

    expect(resolveSourceLineFromPreviewClick(block, -50)).toBe(100)
    expect(resolveSourceLineFromPreviewClick(block, 300)).toBe(120)
  })

  it('falls back to start line when no end attribute exists', () => {
    const block = makeBlock({ 'data-source-line': '100' })
    mockRect(block, { top: 0, bottom: 200, height: 200 })
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      paddingTop: '0px',
      paddingBottom: '0px',
    } as CSSStyleDeclaration)

    expect(resolveSourceLineFromPreviewClick(block, 150)).toBe(100)
  })

  it('does not divide by zero when the block has no height', () => {
    const block = makeBlock({ 'data-source-line': '100', 'data-source-end-line': '120' })
    mockRect(block, { top: 0, bottom: 0, height: 0 })

    expect(resolveSourceLineFromPreviewClick(block, 10)).toBe(100)
  })

  it('excludes PRE padding from the click mapping', () => {
    const pre = makeBlock(
      { 'data-source-line': '100', 'data-source-end-line': '120' },
      'pre',
    )
    mockRect(pre, { top: 0, bottom: 200, height: 200 })
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      paddingTop: '20px',
      paddingBottom: '20px',
    } as CSSStyleDeclaration)

    expect(resolveSourceLineFromPreviewClick(pre, 20)).toBe(100)
    expect(resolveSourceLineFromPreviewClick(pre, 100)).toBe(110)
    expect(resolveSourceLineFromPreviewClick(pre, 180)).toBe(120)
  })

  it('resolves through a nested child element', () => {
    const block = makeBlock({ 'data-source-line': '100', 'data-source-end-line': '120' })
    mockRect(block, { top: 0, bottom: 200, height: 200 })
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      paddingTop: '0px',
      paddingBottom: '0px',
    } as CSSStyleDeclaration)
    const child = document.createElement('span')
    block.appendChild(child)

    expect(resolveSourceLineFromPreviewClick(child, 100)).toBe(110)
  })
})
