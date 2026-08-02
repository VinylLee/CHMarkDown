export interface SearchOptions {
  caseSensitive: boolean
  wholeWord: boolean
}

export interface TextMatch {
  start: number
  end: number
}

export interface TextSelection {
  start: number
  end: number
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isWordCharacter(value: string | undefined): boolean {
  return value !== undefined && /[\p{L}\p{N}_]/u.test(value)
}

function isWholeWord(content: string, query: string, match: TextMatch): boolean {
  const needsStartBoundary = isWordCharacter(query[0])
  const needsEndBoundary = isWordCharacter(query[query.length - 1])
  return (
    (!needsStartBoundary || !isWordCharacter(content[match.start - 1])) &&
    (!needsEndBoundary || !isWordCharacter(content[match.end]))
  )
}

export function findTextMatches(
  content: string,
  query: string,
  options: SearchOptions,
): TextMatch[] {
  if (!query) return []

  const expression = new RegExp(
    escapeRegExp(query),
    options.caseSensitive ? 'gu' : 'giu',
  )
  const matches: TextMatch[] = []
  for (const match of content.matchAll(expression)) {
    const start = match.index
    const text = match[0]
    if (start === undefined || text.length === 0) continue
    const candidate = { start, end: start + text.length }
    if (!options.wholeWord || isWholeWord(content, query, candidate)) {
      matches.push(candidate)
    }
  }
  return matches
}

export function replaceTextMatch(
  content: string,
  match: TextMatch,
  replacement: string,
): string {
  return content.slice(0, match.start) + replacement + content.slice(match.end)
}

export function replaceAllTextMatches(
  content: string,
  matches: TextMatch[],
  replacement: string,
): string {
  let result = content
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    result = replaceTextMatch(result, matches[index], replacement)
  }
  return result
}

export function findAdjacentMatchIndex(
  matches: TextMatch[],
  selection: TextSelection,
  direction: -1 | 1,
): number {
  if (matches.length === 0) return -1

  if (direction === 1) {
    const anchor = selection.start === selection.end ? selection.start : selection.end
    const nextIndex = matches.findIndex((match) => match.start >= anchor)
    return nextIndex >= 0 ? nextIndex : 0
  }

  const anchor = selection.start
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    if (matches[index].end <= anchor) return index
  }
  return matches.length - 1
}

export function getSelectedSearchQuery(
  content: string,
  selection: TextSelection,
): string | null {
  const start = Math.max(0, Math.min(selection.start, content.length))
  const end = Math.max(start, Math.min(selection.end, content.length))
  return end > start ? content.slice(start, end) : null
}

export function getContainedSelectionText(
  container: HTMLElement,
  selection: Selection | null,
): string | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null

  const range = selection.getRangeAt(0)
  const commonAncestor = range.commonAncestorContainer
  if (commonAncestor !== container && !container.contains(commonAncestor)) return null

  const selectedText = selection.toString()
  return selectedText.length > 0 ? selectedText : null
}

export function findSelectedMatchIndex(
  matches: TextMatch[],
  selection: TextSelection,
): number {
  return matches.findIndex(
    (match) => match.start === selection.start && match.end === selection.end,
  )
}
