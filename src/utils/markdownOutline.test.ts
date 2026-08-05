import { describe, expect, it } from 'vitest'
import {
  applySameLevelCollapse,
  buildOutlineTree,
  collectVisibleOutlineItems,
  extractMarkdownHeadings,
} from './markdownOutline'

describe('markdownOutline', () => {
  it('extracts ATX headings with their exact levels and source lines', () => {
    expect(extractMarkdownHeadings('# One\ntext\n### Three\n## Two')).toEqual([
      { level: 1, text: 'One', line: 1 },
      { level: 3, text: 'Three', line: 3 },
      { level: 2, text: 'Two', line: 4 },
    ])
  })

  it('supports Setext headings and inline Markdown text', () => {
    expect(extractMarkdownHeadings('Main *title*\n===\nA **section** with [link](https://example.com)\n---')).toEqual([
      { level: 1, text: 'Main title', line: 1 },
      { level: 2, text: 'A section with link', line: 3 },
    ])
  })

  it('ignores heading-looking text inside fenced code blocks', () => {
    expect(extractMarkdownHeadings('```md\n# Not a heading\n```\n## Real')).toEqual([
      { level: 2, text: 'Real', line: 4 },
    ])
  })

  it('updates directly from the current Markdown content', () => {
    expect(extractMarkdownHeadings('# Before')).toHaveLength(1)
    expect(extractMarkdownHeadings('# Before\n## After')).toHaveLength(2)
  })
})

describe('buildOutlineTree', () => {
  it('builds nested structure by heading levels', () => {
    const tree = buildOutlineTree([
      { level: 1, text: 'A', line: 1 },
      { level: 2, text: 'A1', line: 2 },
      { level: 3, text: 'A1a', line: 3 },
      { level: 2, text: 'A2', line: 4 },
      { level: 1, text: 'B', line: 5 },
    ])
    expect(tree.map((node) => node.heading.text)).toEqual(['A', 'B'])
    expect(tree[0].children.map((node) => node.heading.text)).toEqual(['A1', 'A2'])
    expect(tree[0].children[0].children.map((node) => node.heading.text)).toEqual(['A1a'])
    expect(tree[1].children).toEqual([])
  })

  it('treats level jumps without intermediate headings as children', () => {
    const tree = buildOutlineTree([
      { level: 1, text: 'Top', line: 1 },
      { level: 3, text: 'Deep', line: 2 },
    ])
    expect(tree[0].children[0].heading.text).toBe('Deep')
  })
})

describe('collectVisibleOutlineItems', () => {
  it('shows all items and marks parents when nothing is collapsed', () => {
    const tree = buildOutlineTree([
      { level: 1, text: 'A', line: 1 },
      { level: 2, text: 'A1', line: 2 },
    ])
    const visible = collectVisibleOutlineItems(tree, new Set())
    expect(visible.map((item) => item.heading.text)).toEqual(['A', 'A1'])
    expect(visible[0].hasChildren).toBe(true)
    expect(visible[1].hasChildren).toBe(false)
  })

  it('hides the whole subtree of a collapsed heading', () => {
    const tree = buildOutlineTree([
      { level: 1, text: 'A', line: 1 },
      { level: 2, text: 'A1', line: 2 },
      { level: 3, text: 'A1a', line: 3 },
      { level: 1, text: 'B', line: 4 },
    ])
    const visible = collectVisibleOutlineItems(tree, new Set([1]))
    expect(visible.map((item) => item.heading.text)).toEqual(['A', 'B'])
  })

  it('collapsing a leaf heading keeps it and its siblings visible', () => {
    const tree = buildOutlineTree([
      { level: 1, text: 'A', line: 1 },
      { level: 2, text: 'A1', line: 2 },
      { level: 2, text: 'A2', line: 3 },
    ])
    const visible = collectVisibleOutlineItems(tree, new Set([2]))
    expect(visible.map((item) => item.heading.text)).toEqual(['A', 'A1', 'A2'])
  })

  it('collapsing a child only hides its own subtree', () => {
    const tree = buildOutlineTree([
      { level: 1, text: 'A', line: 1 },
      { level: 2, text: 'A1', line: 2 },
      { level: 3, text: 'A1a', line: 3 },
      { level: 2, text: 'A2', line: 4 },
    ])
    const visible = collectVisibleOutlineItems(tree, new Set([2]))
    expect(visible.map((item) => item.heading.text)).toEqual(['A', 'A1', 'A2'])
  })
})

describe('applySameLevelCollapse', () => {
  const headings = [
    { level: 1, text: 'A', line: 1 },
    { level: 2, text: 'A1', line: 2 },
    { level: 1, text: 'B', line: 3 },
    { level: 2, text: 'B1', line: 4 },
  ]

  it('expands every heading of the same level when the target is collapsed', () => {
    const next = applySameLevelCollapse(headings, 1, new Set([1, 3]))
    expect(next.has(1)).toBe(false)
    expect(next.has(3)).toBe(false)
    expect(next.has(2)).toBe(false)
    expect(next.has(4)).toBe(false)
  })

  it('collapses every heading of the same level when the target is expanded', () => {
    const next = applySameLevelCollapse(headings, 1, new Set())
    expect(next.has(1)).toBe(true)
    expect(next.has(3)).toBe(true)
    expect(next.has(2)).toBe(false)
    expect(next.has(4)).toBe(false)
  })

  it('operates only on the same level and keeps other levels untouched', () => {
    const next = applySameLevelCollapse(headings, 2, new Set([1]))
    expect(next.has(1)).toBe(true)
    expect(next.has(2)).toBe(true)
    expect(next.has(4)).toBe(true)
    expect(next.has(3)).toBe(false)
  })

  it('removes only same-level lines when expanding', () => {
    const next = applySameLevelCollapse(headings, 1, new Set([1, 2, 3]))
    expect(next.has(1)).toBe(false)
    expect(next.has(3)).toBe(false)
    expect(next.has(2)).toBe(true)
  })

  it('returns the same set for an unknown target line', () => {
    const next = applySameLevelCollapse(headings, 99, new Set([1]))
    expect([...next]).toEqual([1])
  })
})
