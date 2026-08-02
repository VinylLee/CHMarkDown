import MarkdownIt from 'markdown-it'

export interface MarkdownHeading {
  level: number
  text: string
  line: number
}

const outlineMarkdown = new MarkdownIt({ html: false })

function inlineText(token: ReturnType<MarkdownIt['parse']>[number] | undefined): string {
  if (!token) return ''
  if (!token.children) return token.content.trim()
  return token.children.map((child) => {
    if (child.type === 'softbreak' || child.type === 'hardbreak') return ' '
    return child.content
  }).join('').trim()
}

export function extractMarkdownHeadings(content: string): MarkdownHeading[] {
  const tokens = outlineMarkdown.parse(content, {})
  const headings: MarkdownHeading[] = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token.type !== 'heading_open' || token.map === null) continue
    const level = Number(token.tag.slice(1))
    if (!Number.isInteger(level) || level < 1 || level > 6) continue
    headings.push({
      level,
      text: inlineText(tokens[index + 1]) || '未命名标题',
      line: token.map[0] + 1,
    })
  }

  return headings
}
