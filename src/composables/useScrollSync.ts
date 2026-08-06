import type { Ref } from 'vue'
import { watch } from 'vue'
import { findElementByLine } from '../utils/markdownSourceMap'

const HIGHLIGHT_CLASS = 'source-line-highlight'
const HIGHLIGHT_DURATION_MS = 1500
const VIEWPORT_ANCHOR_RATIO = 1 / 3
const EDGE_TOLERANCE_PX = 2
const SMOOTH_NAVIGATION_SUPPRESS_MS = 800

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
  /** Reactive flag controlling whether live sync is active */
  enabled: Ref<boolean>
}

export interface UseScrollSyncReturn {
  /**
   * Scroll the preview pane so that the element corresponding to `line`
   * is centered vertically. Used for explicit navigation.
   */
  scrollPreviewToLine: (line: number) => void

  /**
   * Scroll the textarea so that `line` is visible in the upper third
   * of the viewport. Uses precise editor layout measurement when available.
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

  /** Invalidate the cached editor layout measurement (call when content or metrics change). */
  invalidateEditorMeasurement: () => void

  /** Detach live scroll listeners and remove the measurement mirror. */
  dispose: () => void
}

interface EditorMirrorState {
  signature: string
  lineStartOffsets: number[]
}

export function useScrollSync(options: UseScrollSyncOptions): UseScrollSyncReturn {
  let previewHighlightTimer: ReturnType<typeof setTimeout> | null = null
  let pendingFeedbackSource: 'editor' | 'preview' | null = null
  let navigationSuppressUntil = 0
  let scrollListenersAttached = false
  let editorSyncFrame: number | null = null
  let previewSyncFrame: number | null = null
  let editorMirror: HTMLDivElement | null = null
  let editorMirrorState: EditorMirrorState | null = null

  const requestFrame = typeof requestAnimationFrame === 'function'
    ? (callback: FrameRequestCallback) => requestAnimationFrame(callback)
    : (callback: FrameRequestCallback) => {
      callback(0)
      return 0
    }
  const cancelFrame = typeof cancelAnimationFrame === 'function'
    ? (id: number) => cancelAnimationFrame(id)
    : () => {}

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

  function applyScroll(
    element: HTMLElement,
    scrollTop: number,
    source: 'editor' | 'preview',
  ): void {
    if (Math.abs(element.scrollTop - scrollTop) < 1) return
    pendingFeedbackSource = source
    // 浏览器会自动把 scrollTop 限制在有效滚动范围内。
    element.scrollTop = scrollTop
  }

  function restoreFallbackPosition(
    element: HTMLElement,
    position: ScrollPositionSnapshot,
    source: 'editor' | 'preview',
  ): boolean {
    const maxScroll = getMaxScroll(element)
    if (position.edge === 'start') {
      applyScroll(element, 0, source)
      return true
    }
    if (position.edge === 'end') {
      applyScroll(element, maxScroll, source)
      return true
    }
    if (position.line === null) {
      applyScroll(element, maxScroll * position.ratio, source)
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

  function getPaddingTop(textarea: HTMLTextAreaElement): number {
    return parseFloat(getComputedStyle(textarea).paddingTop) || 16
  }

  function wrapsTextarea(textarea: HTMLTextAreaElement): boolean {
    return textarea.wrap !== 'off'
  }

  function computeLineStartOffsets(content: string): number[] {
    const offsets: number[] = [0]
    for (let i = 0; i < content.length; i += 1) {
      if (content.charCodeAt(i) === 10) offsets.push(i + 1)
    }
    return offsets
  }

  function getEditorMirror(textarea: HTMLTextAreaElement): HTMLDivElement | null {
    if (!editorMirror) {
      const mirror = document.createElement('div')
      mirror.setAttribute('aria-hidden', 'true')
      mirror.style.position = 'fixed'
      mirror.style.left = '-100000px'
      mirror.style.top = '0'
      mirror.style.visibility = 'hidden'
      mirror.style.pointerEvents = 'none'
      mirror.style.whiteSpace = 'pre-wrap'
      mirror.style.overflowWrap = 'break-word'
      mirror.style.zIndex = '-1'
      document.body.appendChild(mirror)
      editorMirror = mirror
    }
    return editorMirror
  }

  function refreshEditorMirror(textarea: HTMLTextAreaElement): void {
    const mirror = getEditorMirror(textarea)
    if (!mirror) return
    const style = getComputedStyle(textarea)
    const contentWidth = Math.max(
      0,
      textarea.clientWidth
        - (parseFloat(style.paddingLeft) || 0)
        - (parseFloat(style.paddingRight) || 0),
    )
    const signature = [
      contentWidth,
      style.fontFamily,
      style.fontSize,
      style.lineHeight,
      style.paddingTop,
      style.paddingRight,
      style.paddingBottom,
      style.paddingLeft,
      style.tabSize,
      style.letterSpacing,
    ].join('|')
    mirror.textContent = textarea.value
    mirror.style.width = `${contentWidth}px`
    mirror.style.fontFamily = style.fontFamily
    mirror.style.fontSize = style.fontSize
    mirror.style.lineHeight = style.lineHeight
    mirror.style.padding = `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`
    mirror.style.tabSize = style.tabSize
    mirror.style.letterSpacing = style.letterSpacing
    editorMirrorState = {
      signature,
      lineStartOffsets: computeLineStartOffsets(textarea.value),
    }
  }

  function ensureEditorMirrorFresh(textarea: HTMLTextAreaElement): void {
    if (editorMirrorState === null) {
      refreshEditorMirror(textarea)
      return
    }
    const style = getComputedStyle(textarea)
    const contentWidth = Math.max(
      0,
      textarea.clientWidth
        - (parseFloat(style.paddingLeft) || 0)
        - (parseFloat(style.paddingRight) || 0),
    )
    const signature = [
      contentWidth,
      style.fontFamily,
      style.fontSize,
      style.lineHeight,
      style.paddingTop,
      style.paddingRight,
      style.paddingBottom,
      style.paddingLeft,
      style.tabSize,
      style.letterSpacing,
    ].join('|')
    if (editorMirrorState.signature !== signature) {
      refreshEditorMirror(textarea)
    }
  }

  /**
   * Measure the pixel Y position of the start of a 1-based source line in
   * the editor, using a hidden layout mirror that wraps exactly like the
   * textarea. Returns null when measurement is unavailable.
   */
  function measureEditorLineY(
    textarea: HTMLTextAreaElement,
    line: number,
  ): number | null {
    if (!wrapsTextarea(textarea)) return null
    ensureEditorMirrorFresh(textarea)
    const mirror = editorMirror
    const state = editorMirrorState
    if (!mirror || !state) return null
    if (line < 1 || line > state.lineStartOffsets.length) return null

    const textNode = mirror.firstChild
    if (!textNode) return line === 1 ? 0 : null
    const offset = Math.min(state.lineStartOffsets[line - 1], mirror.textContent?.length ?? 0)
    const range = document.createRange()
    range.setStart(textNode, offset)
    range.collapse(true)
    if (typeof range.getBoundingClientRect !== 'function') return null
    const rect = range.getBoundingClientRect()
    const mirrorRect = mirror.getBoundingClientRect()
    if (mirrorRect.width === 0 && mirrorRect.height === 0) return null
    return Math.max(0, rect.top - mirrorRect.top)
  }

  function computeEditorAnchorLine(textarea: HTMLTextAreaElement): number {
    const anchorY = textarea.scrollTop + textarea.clientHeight * VIEWPORT_ANCHOR_RATIO
    const lineCount = textarea.value.split('\n').length

    const fallbackMath = (): number => {
      const lineHeight = getLineHeight(textarea)
      const paddingTop = getPaddingTop(textarea)
      return Math.max(
        1,
        Math.min(lineCount, Math.floor((anchorY - paddingTop) / lineHeight) + 1),
      )
    }

    if (!wrapsTextarea(textarea)) return fallbackMath()

    const firstLineY = measureEditorLineY(textarea, 1)
    if (firstLineY === null) return fallbackMath()

    let lo = 1
    let hi = lineCount
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2)
      const midY = measureEditorLineY(textarea, mid) ?? firstLineY
      if (midY <= anchorY) {
        lo = mid
      } else {
        hi = mid - 1
      }
    }
    return lo
  }

  function scrollPreviewToLineAtAnchor(line: number): void {
    const container = options.previewRef.value
    if (!container) return
    const element = findElementByLine(container, line)
    if (!element) return

    const containerRect = container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const anchorOffset = container.clientHeight * VIEWPORT_ANCHOR_RATIO
    const target = container.scrollTop + elementRect.top - containerRect.top - anchorOffset
    applyScroll(container, target, 'preview')
  }

  function scrollPreviewToLine(line: number): void {
    const container = options.previewRef.value
    if (!container) return
    const element = findElementByLine(container, line)
    if (!element) return
    navigationSuppressUntil = Date.now() + SMOOTH_NAVIGATION_SUPPRESS_MS
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function scrollEditorToLine(line: number): void {
    const textarea = options.textareaRef.value
    if (!textarea) return

    const measuredY = measureEditorLineY(textarea, line)
    const targetY = measuredY ?? (
      (line - 1) * getLineHeight(textarea) + getPaddingTop(textarea)
    )
    const viewportHeight = textarea.clientHeight
    const offset = Math.max(0, targetY - viewportHeight * VIEWPORT_ANCHOR_RATIO)
    applyScroll(textarea, offset, 'editor')
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
    const line = computeEditorAnchorLine(textarea)
    return getScrollPosition(textarea, line)
  }

  function findPreviewAnchorLine(container: HTMLElement): number | null {
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

    return closestLine
  }

  function capturePreviewPosition(): ScrollPositionSnapshot | null {
    const container = options.previewRef.value
    if (!container) return null
    return getScrollPosition(container, findPreviewAnchorLine(container))
  }

  function restoreEditorPosition(position: ScrollPositionSnapshot | null): void {
    const textarea = options.textareaRef.value
    if (!textarea || !position) return
    if (restoreFallbackPosition(textarea, position, 'editor')) return
    if (position.line !== null) {
      scrollEditorToLine(position.line)
    }
  }

  function restorePreviewPosition(position: ScrollPositionSnapshot | null): void {
    const container = options.previewRef.value
    if (!container || !position) return
    if (restoreFallbackPosition(container, position, 'preview')) return
    if (position.line === null) return

    const element = findElementByLine(container, position.line)
    if (!element) {
      applyScroll(container, getMaxScroll(container) * position.ratio, 'preview')
      return
    }

    const containerRect = container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const anchorOffset = container.clientHeight * VIEWPORT_ANCHOR_RATIO
    const target = container.scrollTop + elementRect.top - containerRect.top - anchorOffset
    applyScroll(container, target, 'preview')
  }

  function highlightEditorLine(line: number): void {
    const textarea = options.textareaRef.value
    if (!textarea) return
    const lines = textarea.value.split('\n')
    if (line < 1 || line > lines.length) return

    let charStart = 0
    for (let i = 0; i < line - 1; i += 1) {
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

    if (previewHighlightTimer !== null) {
      clearTimeout(previewHighlightTimer)
      previewHighlightTimer = null
    }

    const prev = container.querySelector(`.${HIGHLIGHT_CLASS}`)
    if (prev) prev.classList.remove(HIGHLIGHT_CLASS)

    element.classList.add(HIGHLIGHT_CLASS)
    previewHighlightTimer = setTimeout(() => {
      element.classList.remove(HIGHLIGHT_CLASS)
      previewHighlightTimer = null
    }, HIGHLIGHT_DURATION_MS)
  }

  function syncPreviewFromEditor(): void {
    const textarea = options.textareaRef.value
    const container = options.previewRef.value
    if (!textarea || !container) return
    scrollPreviewToLineAtAnchor(computeEditorAnchorLine(textarea))
  }

  function syncEditorFromPreview(): void {
    const textarea = options.textareaRef.value
    const container = options.previewRef.value
    if (!textarea || !container) return
    const line = findPreviewAnchorLine(container)
    if (line !== null) scrollEditorToLine(line)
  }

  function handleEditorScroll(): void {
    if (Date.now() < navigationSuppressUntil) return
    if (pendingFeedbackSource === 'editor') {
      pendingFeedbackSource = null
      return
    }
    if (editorSyncFrame !== null) return
    editorSyncFrame = requestFrame(() => {
      editorSyncFrame = null
      syncPreviewFromEditor()
    })
  }

  function handlePreviewScroll(): void {
    if (Date.now() < navigationSuppressUntil) return
    if (pendingFeedbackSource === 'preview') {
      pendingFeedbackSource = null
      return
    }
    if (previewSyncFrame !== null) return
    previewSyncFrame = requestFrame(() => {
      previewSyncFrame = null
      syncEditorFromPreview()
    })
  }

  function detachScrollListeners(): void {
    if (!scrollListenersAttached) return
    const textarea = options.textareaRef.value
    const container = options.previewRef.value
    textarea?.removeEventListener('scroll', handleEditorScroll)
    container?.removeEventListener('scroll', handlePreviewScroll)
    scrollListenersAttached = false
  }

  function refreshScrollListeners(): void {
    detachScrollListeners()
    if (!options.enabled.value) return
    const textarea = options.textareaRef.value
    const container = options.previewRef.value
    if (!textarea || !container) return
    textarea.addEventListener('scroll', handleEditorScroll)
    container.addEventListener('scroll', handlePreviewScroll)
    scrollListenersAttached = true
  }

  watch(
    [options.enabled, options.textareaRef, options.previewRef],
    refreshScrollListeners,
    { immediate: true },
  )

  function invalidateEditorMeasurement(): void {
    editorMirrorState = null
  }

  function dispose(): void {
    detachScrollListeners()
    if (editorSyncFrame !== null) {
      cancelFrame(editorSyncFrame)
      editorSyncFrame = null
    }
    if (previewSyncFrame !== null) {
      cancelFrame(previewSyncFrame)
      previewSyncFrame = null
    }
    if (editorMirror) {
      editorMirror.remove()
      editorMirror = null
    }
    editorMirrorState = null
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
    invalidateEditorMeasurement,
    dispose,
  }
}
