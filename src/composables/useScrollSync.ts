import type { Ref } from 'vue'
import { findElementByLine } from '../utils/markdownSourceMap'

const HIGHLIGHT_CLASS = 'source-line-highlight'
const HIGHLIGHT_DURATION_MS = 1500

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
}

export function useScrollSync(options: UseScrollSyncOptions): UseScrollSyncReturn {
  let previewHighlightTimer: ReturnType<typeof setTimeout> | null = null

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
  }
}
