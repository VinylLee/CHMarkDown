import type MarkdownIt from 'markdown-it'

const ATTR_NAME = 'data-source-line'

/**
 * Register a core rule that attaches data-source-line to every opening
 * or self-closing block token. Line numbers are 1-based, derived from
 * token.map[0].
 */
export function configureMarkdownSourceMap(md: MarkdownIt): void {
  md.core.ruler.push('flowdesk_source_map', (state) => {
    for (const token of state.tokens) {
      if (token.nesting === -1 || token.map === null) continue
      token.attrSet(ATTR_NAME, String(token.map[0] + 1))
    }
  })
}

/**
 * Walk up the DOM tree from `element` and return the value of the
 * first data-source-line attribute found, as a 1-based integer.
 * Returns null if no ancestor has the attribute.
 */
export function findSourceLine(element: HTMLElement): number | null {
  for (let el: HTMLElement | null = element; el !== null; el = el.parentElement) {
    const raw = el.dataset.sourceLine
    if (raw === undefined) continue
    const line = Number(raw)
    if (Number.isInteger(line) && line > 0) return line
  }
  return null
}

/**
 * Search the preview container for an element whose data-source-line
 * matches `targetLine`. Prefers exact match; falls back to the element
 * with the largest line number that is <= targetLine.
 * Returns null if no matching element exists.
 */
export function findElementByLine(
  container: HTMLElement,
  targetLine: number,
): HTMLElement | null {
  // Try exact match first
  const exact = container.querySelector(`[${ATTR_NAME}="${targetLine}"]`)
  if (exact instanceof HTMLElement) return exact

  // Fallback: find nearest preceding element
  const all = container.querySelectorAll(`[${ATTR_NAME}]`)
  let best: HTMLElement | null = null
  let bestLine = 0

  for (const el of all) {
    if (!(el instanceof HTMLElement)) continue
    const raw = el.dataset.sourceLine
    if (raw === undefined) continue
    const line = Number(raw)
    if (!Number.isInteger(line)) continue
    if (line <= targetLine && line > bestLine) {
      bestLine = line
      best = el
    }
  }

  return best
}
