import type { Ref } from 'vue'
import { findElementByLine } from '../utils/markdownSourceMap'

const HIGHLIGHT_CLASS = 'source-line-highlight'
const HIGHLIGHT_DURATION_MS = 1500
const VIEWPORT_ANCHOR_RATIO = 1 / 3
const EDGE_TOLERANCE_PX = 2

export interface ScrollPositionSnapshot {
  line: number | null
  ratio: number
  edge: 'start' | 'end' | null
}

export interface UseScrollSyncOptions {
  /** Template ref to the textarea element */
  textareaRef: Ref<HTMLTextAreaElement | null>
  /** Template ref to the preview container element */
  previewRef: Ref<HTMLElement | null>
  /** Reactive flag controlling whether sync is active */
  enabled: Ref<boolean>
}

export interface UseScrollSyncReturn {
  /**
   * Scroll the preview pane so that the element corresponding to `line`
   * is centered vertically.
   */
  scrollPreviewToLine: (line: number) => void

  /**
   * Scroll the textarea so that `line` is visible in the upper third
   * of the viewport.
   */
  scrollEditorToLine: (line: number) => void

  /** Return the 1-based line number of the textarea cursor. */
  getCurrentEditorLine: () => number

  /** Briefly select the text of `line` in the textarea. */
  highlightEditorLine: (line: number) => void

  /** Add highlight class to the preview element matching `line`, then remove after delay. */
  highlightPreviewBlock: (line: number) => void

  /** Capture the Markdown line currently shown near the editor viewport anchor. */
  captureEditorPosition: () => ScrollPositionSnapshot | null

  /** Capture the Markdown line currently shown near the preview viewport anchor. */
  capturePreviewPosition: () => ScrollPositionSnapshot | null

  /** Restore an editor viewport captured before a mode switch. */
  restoreEditorPosition: (position: ScrollPositionSnapshot | null) => void

  /** Restore a preview viewport captured before a mode switch. */
  restorePreviewPosition: (position: ScrollPositionSnapshot | null) => void
}

export function useScrollSync(options: UseScrollSyncOptions): UseScrollSyncReturn {
  let previewHighlightTimer: ReturnType<typeof setTimeout> | null = null

  function getMaxScroll(element: HTMLElement): number {
    return Math.max(0, element.scrollHeight - element.clientHeight)
  }

  function getScrollPosition(
    element: HTMLElement,
    line: number | null,
  ): ScrollPositionSnapshot {
    const maxScroll = getMaxScroll(element)
    const ratio = maxScroll > 0
      ? Math.min(1, Math.max(0, element.scrollTop / maxScroll))
      : 0
    let edge: ScrollPositionSnapshot['edge'] = null
    if (element.scrollTop <= EDGE_TOLERANCE_PX) {
      edge = 'start'
    } else if (maxScroll - element.scrollTop <= EDGE_TOLERANCE_PX) {
      edge = 'end'
    }
    return { line, ratio, edge }
  }

  function restoreFallbackPosition(
    element: HTMLElement,
    position: ScrollPositionSnapshot,
  ): boolean {
    const maxScroll = getMaxScroll(element)
    if (position.edge === 'start') {
      element.scrollTop = 0
      return true
    }
    if (position.edge === 'end') {
      element.scrollTop = maxScroll
      return true
    }
    if (position.line === null) {
      element.scrollTop = maxScroll * position.ratio
      return true
    }
    return false
  }

  function getLineHeight(textarea: HTMLTextAreaElement): number {
    const style = getComputedStyle(textarea)
    const fontSize = parseFloat(style.fontSize) || 13.5
    const lineHeight = parseFloat(style.lineHeight)
    if (!Number.isNaN(lineHeight)) return lineHeight
    // Fallback matching .content-textarea CSS: line-height 1.85 × font-size 13.5px
    return 1.85 * fontSize
  }

  function scrollPreviewToLine(line: number): void {
    const container = options.previewRef.value
    if (!container) return
    const element = findElementByLine(container, line)
    if (!element) return
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function scrollEditorToLine(line: number): void {
    const textarea = options.textareaRef.value
    if (!textarea) return

    const computedLineHeight = getLineHeight(textarea)
    const paddingTop = parseFloat(getComputedStyle(textarea).paddingTop) || 16

    // line is 1-based; scroll to show it in the upper third
    const targetY = (line - 1) * computedLineHeight + paddingTop
    const viewportHeight = textarea.clientHeight
    const offset = Math.max(0, targetY - viewportHeight / 3)

    textarea.scrollTop = offset
  }

  function getCurrentEditorLine(): number {
    const textarea = options.textareaRef.value
    if (!textarea) return 1
    const textBefore = textarea.value.substring(0, textarea.selectionStart)
    return textBefore.split('\n').length
  }

  function captureEditorPosition(): ScrollPositionSnapshot | null {
    const textarea = options.textareaRef.value
    if (!textarea) return null

    const computedLineHeight = getLineHeight(textarea)
    const paddingTop = parseFloat(getComputedStyle(textarea).paddingTop) || 16
    const anchorY = textarea.scrollTop + textarea.clientHeight * VIEWPORT_ANCHOR_RATIO
    const line = Math.max(1, Math.floor((anchorY - paddingTop) / computedLineHeight) + 1)
    const lineCount = textarea.value.split('\n').length
    return getScrollPosition(textarea, Math.min(line, lineCount))
  }

  function capturePreviewPosition(): ScrollPositionSnapshot | null {
    const container = options.previewRef.value
    if (!container) return null

    const containerRect = container.getBoundingClientRect()
    const anchorY = containerRect.top + container.clientHeight * VIEWPORT_ANCHOR_RATIO
    const elements = container.querySelectorAll<HTMLElement>('[data-source-line]')
    let closestLine: number | null = null
    let closestDistance = Number.POSITIVE_INFINITY
    let closestTopDistance = Number.POSITIVE_INFINITY

    for (const element of elements) {
      const rawLine = Number(element.dataset.sourceLine)
      if (!Number.isInteger(rawLine) || rawLine < 1) continue
      const rect = element.getBoundingClientRect()
      const distance = anchorY < rect.top
        ? rect.top - anchorY
        : anchorY > rect.bottom
          ? anchorY - rect.bottom
          : 0
      const topDistance = Math.abs(anchorY - rect.top)
      if (
        distance < closestDistance ||
        (distance === closestDistance && topDistance < closestTopDistance)
      ) {
        closestDistance = distance
        closestTopDistance = topDistance
        closestLine = rawLine
      }
    }

    return getScrollPosition(container, closestLine)
  }

  function restoreEditorPosition(position: ScrollPositionSnapshot | null): void {
    const textarea = options.textareaRef.value
    if (!textarea || !position) return
    if (restoreFallbackPosition(textarea, position)) return
    if (position.line !== null) {
      scrollEditorToLine(position.line)
    }
  }

  function restorePreviewPosition(position: ScrollPositionSnapshot | null): void {
    const container = options.previewRef.value
    if (!container || !position) return
    if (restoreFallbackPosition(container, position)) return
    if (position.line === null) return

    const element = findElementByLine(container, position.line)
    if (!element) {
      container.scrollTop = getMaxScroll(container) * position.ratio
      return
    }

    const containerRect = container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const anchorOffset = container.clientHeight * VIEWPORT_ANCHOR_RATIO
    const target = container.scrollTop + elementRect.top - containerRect.top - anchorOffset
    container.scrollTop = Math.min(getMaxScroll(container), Math.max(0, target))
  }

  function highlightEditorLine(line: number): void {
    const textarea = options.textareaRef.value
    if (!textarea) return
    const lines = textarea.value.split('\n')
    if (line < 1 || line > lines.length) return

    let charStart = 0
    for (let i = 0; i < line - 1; i++) {
      charStart += lines[i].length + 1 // +1 for the newline character
    }
    const charEnd = charStart + lines[line - 1].length
    textarea.setSelectionRange(charStart, charEnd)
    textarea.focus()
  }

  function highlightPreviewBlock(line: number): void {
    const container = options.previewRef.value
    if (!container) return

    const element = findElementByLine(container, line)
    if (!element) return

    // Clear previous timer
    if (previewHighlightTimer !== null) {
      clearTimeout(previewHighlightTimer)
      previewHighlightTimer = null
    }

    // Remove class from any previously highlighted element
    const prev = container.querySelector(`.${HIGHLIGHT_CLASS}`)
    if (prev) prev.classList.remove(HIGHLIGHT_CLASS)

    element.classList.add(HIGHLIGHT_CLASS)
    previewHighlightTimer = setTimeout(() => {
      element.classList.remove(HIGHLIGHT_CLASS)
      previewHighlightTimer = null
    }, HIGHLIGHT_DURATION_MS)
  }

  return {
    scrollPreviewToLine,
    scrollEditorToLine,
    getCurrentEditorLine,
    highlightEditorLine,
    highlightPreviewBlock,
    captureEditorPosition,
    capturePreviewPosition,
    restoreEditorPosition,
    restorePreviewPosition,
  }
}
