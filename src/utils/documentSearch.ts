export interface SearchOptions {
  caseSensitive: boolean
  wholeWord: boolean
}

export interface TextMatch {
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
