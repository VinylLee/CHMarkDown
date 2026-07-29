// @vitest-environment jsdom

import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { useScrollSync } from './useScrollSync'

describe('useScrollSync', () => {
  let textareaRef: Ref<HTMLTextAreaElement | null>
  let previewRef: Ref<HTMLElement | null>
  let enabled: Ref<boolean>

  function createTextarea(value: string, selectionStart: number): HTMLTextAreaElement {
    const el = document.createElement('textarea')
    el.value = value
    el.selectionStart = selectionStart
    el.selectionEnd = selectionStart
    // Mock getComputedStyle results
    vi.spyOn(el, 'clientHeight', 'get').mockReturnValue(400)
    return el
  }

  beforeEach(() => {
    textareaRef = ref(null) as unknown as Ref<HTMLTextAreaElement | null>
    previewRef = ref(null) as unknown as Ref<HTMLElement | null>
    enabled = ref(true) as unknown as Ref<boolean>
    // jsdom does not implement scrollIntoView
    if (!HTMLElement.prototype.scrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        value: vi.fn(),
        writable: true,
        configurable: true,
      })
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getCurrentEditorLine', () => {
    it('returns 1 for empty textarea', () => {
      textareaRef.value = createTextarea('', 0)
      const { getCurrentEditorLine } = useScrollSync({ textareaRef, previewRef, enabled })
      expect(getCurrentEditorLine()).toBe(1)
    })

    it('returns 1 for first line', () => {
      textareaRef.value = createTextarea('line1\nline2\nline3', 3) // cursor on line1
      const { getCurrentEditorLine } = useScrollSync({ textareaRef, previewRef, enabled })
      expect(getCurrentEditorLine()).toBe(1)
    })

    it('returns correct line from cursor position', () => {
      // 'line1\nline2\nline3' — cursor at position 8 is on 'line2'
      textareaRef.value = createTextarea('line1\nline2\nline3', 8)
      const { getCurrentEditorLine } = useScrollSync({ textareaRef, previewRef, enabled })
      expect(getCurrentEditorLine()).toBe(2)
    })

    it('returns 1 when textareaRef is null', () => {
      const { getCurrentEditorLine } = useScrollSync({ textareaRef, previewRef, enabled })
      expect(getCurrentEditorLine()).toBe(1)
    })
  })

  describe('scrollEditorToLine', () => {
    it('sets scrollTop on textarea', () => {
      const ta = createTextarea('line1\nline2\nline3\nline4\nline5', 0)
      // Mock getComputedStyle for line-height calculation
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        fontSize: '13.5px',
        lineHeight: '25px',
        paddingTop: '16px',
      } as CSSStyleDeclaration)
      textareaRef.value = ta

      const { scrollEditorToLine } = useScrollSync({ textareaRef, previewRef, enabled })
      scrollEditorToLine(5)
      // line 5 at 25px each: (5-1)*25 + 16 = 116, viewport 400/3 ≈ 133, offset = max(0, 116-133) = 0
      // Actually line 5: targetY = 4 * 25 + 16 = 116, offset = max(0, 116 - 133) = 0
      expect(ta.scrollTop).toBe(0)
    })

    it('scrolls correctly for a line far down', () => {
      const ta = createTextarea(Array(50).fill('x').join('\n'), 0)
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        fontSize: '13.5px',
        lineHeight: '25px',
        paddingTop: '16px',
      } as CSSStyleDeclaration)
      textareaRef.value = ta

      const { scrollEditorToLine } = useScrollSync({ textareaRef, previewRef, enabled })
      scrollEditorToLine(30)
      // targetY = 29 * 25 + 16 = 741, viewport 400/3 ≈ 133, offset = 741 - 133 = 608
      expect(ta.scrollTop).toBeGreaterThan(500)
    })

    it('returns early when textareaRef is null', () => {
      const { scrollEditorToLine } = useScrollSync({ textareaRef, previewRef, enabled })
      expect(() => scrollEditorToLine(5)).not.toThrow()
    })
  })

  describe('scrollPreviewToLine', () => {
    it('calls scrollIntoView on matching element', () => {
      const container = document.createElement('div')
      const target = document.createElement('p')
      target.setAttribute('data-source-line', '3')
      target.scrollIntoView = vi.fn()
      container.appendChild(target)
      previewRef.value = container

      const { scrollPreviewToLine } = useScrollSync({ textareaRef, previewRef, enabled })
      scrollPreviewToLine(3)
      expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    })

    it('returns early when previewRef is null', () => {
      const { scrollPreviewToLine } = useScrollSync({ textareaRef, previewRef, enabled })
      expect(() => scrollPreviewToLine(5)).not.toThrow()
    })
  })

  describe('highlightEditorLine', () => {
    it('selects text for the target line', () => {
      const ta = createTextarea('line1\nline2\nline3', 0)
      textareaRef.value = ta

      const { highlightEditorLine } = useScrollSync({ textareaRef, previewRef, enabled })
      highlightEditorLine(2)
      // line2 starts at position 6 (after 'line1\n'), ends at 11 (6 + 5)
      expect(ta.selectionStart).toBe(6)
      expect(ta.selectionEnd).toBe(11)
    })

    it('returns early when textareaRef is null', () => {
      const { highlightEditorLine } = useScrollSync({ textareaRef, previewRef, enabled })
      expect(() => highlightEditorLine(2)).not.toThrow()
    })
  })

  describe('highlightPreviewBlock', () => {
    it('adds source-line-highlight class to target element', () => {
      const container = document.createElement('div')
      const target = document.createElement('p')
      target.setAttribute('data-source-line', '2')
      container.appendChild(target)
      previewRef.value = container

      const { highlightPreviewBlock } = useScrollSync({ textareaRef, previewRef, enabled })
      highlightPreviewBlock(2)
      expect(target.classList.contains('source-line-highlight')).toBe(true)
    })

    it('removes class after timeout', () => {
      vi.useFakeTimers()
      const container = document.createElement('div')
      const target = document.createElement('p')
      target.setAttribute('data-source-line', '1')
      container.appendChild(target)
      previewRef.value = container

      const { highlightPreviewBlock } = useScrollSync({ textareaRef, previewRef, enabled })
      highlightPreviewBlock(1)
      expect(target.classList.contains('source-line-highlight')).toBe(true)

      vi.advanceTimersByTime(1500)
      expect(target.classList.contains('source-line-highlight')).toBe(false)
      vi.useRealTimers()
    })

    it('clears previous timer before setting new one', () => {
      vi.useFakeTimers()
      const container = document.createElement('div')
      const el1 = document.createElement('p')
      el1.setAttribute('data-source-line', '1')
      const el2 = document.createElement('p')
      el2.setAttribute('data-source-line', '2')
      container.appendChild(el1)
      container.appendChild(el2)
      previewRef.value = container

      const { highlightPreviewBlock } = useScrollSync({ textareaRef, previewRef, enabled })
      highlightPreviewBlock(1)
      highlightPreviewBlock(2) // should cancel first timer

      // Only el2 should be highlighted
      expect(el1.classList.contains('source-line-highlight')).toBe(false)
      expect(el2.classList.contains('source-line-highlight')).toBe(true)

      vi.useRealTimers()
    })

    it('returns early when previewRef is null', () => {
      const { highlightPreviewBlock } = useScrollSync({ textareaRef, previewRef, enabled })
      expect(() => highlightPreviewBlock(1)).not.toThrow()
    })
  })
})
