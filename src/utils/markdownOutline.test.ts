import { describe, expect, it } from 'vitest'
import { extractMarkdownHeadings } from './markdownOutline'

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
