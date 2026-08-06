import type MarkdownIt from 'markdown-it'

const SOURCE_START_ATTR = 'data-source-line'
const SOURCE_END_ATTR = 'data-source-end-line'

export interface SourceRange {
  element: HTMLElement
  startLine: number
  endLine: number
}

/**
 * Register a core rule that attaches data-source-line and data-source-end-line
 * to every opening or self-closing block token. Line numbers are 1-based:
 * token.map is [start, end) with 0-based bounds, so the inclusive 1-based end
 * equals the exclusive 0-based end.
 */
export function configureMarkdownSourceMap(md: MarkdownIt): void {
  md.core.ruler.push('chmarkdown_source_map', (state) => {
    for (const token of state.tokens) {
      if (token.nesting === -1 || token.map === null) continue
      const [startZeroBased, endExclusiveZeroBased] = token.map
      const startLine = startZeroBased + 1
      const endLineInclusive = Math.max(startLine, endExclusiveZeroBased)
      token.attrSet(SOURCE_START_ATTR, String(startLine))
      token.attrSet(SOURCE_END_ATTR, String(endLineInclusive))
    }
  })
}

/**
 * Walk up the DOM tree from `element` and return the source range of the
 * first ancestor carrying data-source-line. Returns null if no ancestor
 * has a valid range.
 */
export function findSourceRange(element: HTMLElement): SourceRange | null {
  for (let current: HTMLElement | null = element; current !== null; current = current.parentElement) {
    const start = Number(current.dataset.sourceLine)
    if (!Number.isInteger(start) || start < 1) continue

    const rawEnd = Number(current.dataset.sourceEndLine)
    const end = Number.isInteger(rawEnd) && rawEnd >= start ? rawEnd : start

    return {
      element: current,
      startLine: start,
      endLine: end,
    }
  }
  return null
}

/**
 * Walk up the DOM tree from `element` and return the value of the first
 * data-source-line attribute found, as a 1-based integer.
 * Returns null if no ancestor has the attribute.
 */
export function findSourceLine(element: HTMLElement): number | null {
  return findSourceRange(element)?.startLine ?? null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Resolve the source line for a click inside the preview. Uses the clicked
 * block's source range (start/end line) and the vertical position of the
 * click inside the block, so clicking the lower half of a long block maps to
 * a later source line instead of always jumping to the block start.
 *
 * `clientY` is a viewport coordinate; it is compared directly with
 * `getBoundingClientRect()` which also returns viewport coordinates.
 */
export function resolveSourceLineFromPreviewClick(
  target: HTMLElement,
  clientY: number,
): number | null {
  const range = findSourceRange(target)
  if (!range) return null
  if (range.endLine <= range.startLine) return range.startLine

  const rect = range.element.getBoundingClientRect()
  if (rect.height <= 0) return range.startLine

  const style = getComputedStyle(range.element)
  let contentTop = rect.top
  let contentBottom = rect.bottom

  // PRE 的上下 padding 不应直接映射为代码源码行。
  if (range.element.tagName === 'PRE') {
    contentTop += parseFloat(style.paddingTop) || 0
    contentBottom -= parseFloat(style.paddingBottom) || 0
  }

  const contentHeight = Math.max(1, contentBottom - contentTop)
  const ratio = clamp((clientY - contentTop) / contentHeight, 0, 1)

  return clamp(
    Math.round(range.startLine + ratio * (range.endLine - range.startLine)),
    range.startLine,
    range.endLine,
  )
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
  const exact = container.querySelector(`[${SOURCE_START_ATTR}="${targetLine}"]`)
  if (exact instanceof HTMLElement) return exact

  // Fallback: find nearest preceding element
  const all = container.querySelectorAll(`[${SOURCE_START_ATTR}]`)
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
