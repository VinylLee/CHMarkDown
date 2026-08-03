import { describe, expect, it } from 'vitest'
import { extractMarkdownImageSources } from './markdownImageReferences'

describe('extractMarkdownImageSources', () => {
  it('extracts local and remote Markdown image sources', () => {
    expect(extractMarkdownImageSources([
      '![local](images/photo.png)',
      '![remote](https://example.com/photo.png)',
    ].join('\n'))).toEqual([
      'images/photo.png',
      'https://example.com/photo.png',
    ])
  })

  it('supports paths containing spaces, parentheses and optional titles', () => {
    expect(extractMarkdownImageSources(
      '![diagram](<assets/my diagram (final).png> "Diagram")',
    )).toEqual(['assets/my%20diagram%20(final).png'])
  })

  it('ignores image syntax inside inline and fenced code', () => {
    const content = [
      '`![inline](images/inline.png)`',
      '```md',
      '![fenced](images/fenced.png)',
      '```',
      '![real](images/real.png)',
    ].join('\n')

    expect(extractMarkdownImageSources(content)).toEqual(['images/real.png'])
  })

  it('keeps duplicate references for the export planner to deduplicate by file', () => {
    expect(extractMarkdownImageSources(
      '![one](images/same.png)\n![two](images/same.png)',
    )).toEqual(['images/same.png', 'images/same.png'])
  })
})
