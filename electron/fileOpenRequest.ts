import path from 'node:path'
import { isMarkdownFilePath } from './services/markdownFileService'

function removeWrappingQuotes(value: string): string {
  const trimmed = value.trim()
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

export function extractMarkdownFilePath(argv: string[]): string | null {
  for (const argument of argv.slice(1)) {
    if (!argument || argument.startsWith('--')) continue
    const candidate = removeWrappingQuotes(argument)
    if (!isMarkdownFilePath(candidate)) continue
    return path.resolve(candidate)
  }
  return null
}
