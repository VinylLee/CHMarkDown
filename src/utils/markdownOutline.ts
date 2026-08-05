import MarkdownIt from 'markdown-it'

export interface MarkdownHeading {
  level: number
  text: string
  line: number
}

export interface OutlineNode {
  heading: MarkdownHeading
  children: OutlineNode[]
}

export interface VisibleOutlineItem {
  heading: MarkdownHeading
  hasChildren: boolean
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

/**
 * 把扁平的标题列表按层级构造成树。
 *
 * 一个标题的子树由它之后所有层级更深、且未被同级或更浅标题打断的标题组成。
 */
export function buildOutlineTree(headings: MarkdownHeading[]): OutlineNode[] {
  const root: OutlineNode[] = []
  const stack: OutlineNode[] = []

  for (const heading of headings) {
    const node: OutlineNode = { heading, children: [] }
    while (stack.length > 0 && stack[stack.length - 1].heading.level >= heading.level) {
      stack.pop()
    }
    if (stack.length === 0) {
      root.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }
    stack.push(node)
  }

  return root
}

/**
 * 根据折叠集合计算当前可见的大纲条目。
 *
 * 被折叠标题的整棵子树都会隐藏；其他标题不受影响。
 */
export function collectVisibleOutlineItems(
  tree: OutlineNode[],
  collapsedLines: ReadonlySet<number>,
): VisibleOutlineItem[] {
  const visible: VisibleOutlineItem[] = []

  const walk = (nodes: OutlineNode[], hidden: boolean): void => {
    for (const node of nodes) {
      if (hidden) continue
      visible.push({
        heading: node.heading,
        hasChildren: node.children.length > 0,
      })
      if (collapsedLines.has(node.heading.line)) continue
      walk(node.children, false)
    }
  }

  walk(tree, false)
  return visible
}

/**
 * Shift+点击折叠箭头：对同一层级的所有标题执行与目标标题相同的展开/收起操作。
 *
 * 目标标题当前被折叠时执行展开，否则执行收起；只影响同层级标题，不影响其他层级。
 */
export function applySameLevelCollapse(
  headings: MarkdownHeading[],
  targetLine: number,
  collapsedLines: ReadonlySet<number>,
): Set<number> {
  const target = headings.find((heading) => heading.line === targetLine)
  if (!target) return new Set(collapsedLines)

  const expanding = collapsedLines.has(targetLine)
  const next = new Set(collapsedLines)
  for (const heading of headings) {
    if (heading.level !== target.level) continue
    if (expanding) {
      next.delete(heading.line)
    } else {
      next.add(heading.line)
    }
  }
  return next
}
