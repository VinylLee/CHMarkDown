import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({ html: false })

export function extractMarkdownImageSources(content: string): string[] {
  const sources: string[] = []
  const tokens = markdown.parse(content, {})

  for (const token of tokens) {
    if (!token.children) continue
    for (const child of token.children) {
      if (child.type !== 'image') continue
      const source = child.attrGet('src')?.trim()
      if (source) sources.push(source)
    }
  }

  return sources
}
