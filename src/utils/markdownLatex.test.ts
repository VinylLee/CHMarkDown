// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import MarkdownIt from 'markdown-it'
import { configureMarkdownLatex } from './markdownLatex'

function createMarkdown(): MarkdownIt {
  const md = new MarkdownIt({ html: false, linkify: true, breaks: true })
  configureMarkdownLatex(md)
  return md
}

describe('configureMarkdownLatex', () => {
  it('renders inline math with $...$', () => {
    const md = createMarkdown()
    const html = md.render('能量公式 $E=mc^2$ 很重要')
    expect(html).toContain('katex')
    expect(html).not.toContain('class="katex-display"')
  })

  it('renders block math with $$...$$ as display mode', () => {
    const md = createMarkdown()
    const html = md.render('$$\\int_0^1 x\\,dx$$')
    expect(html).toContain('katex-display')
    expect(html).toContain('katex')
  })

  it('renders nested formulas and special symbols', () => {
    const md = createMarkdown()
    const html = md.render('$$\\frac{1}{2}\\sum_{i=1}^{n} i$$')
    expect(html).toContain('katex-display')
  })

  it('renders inline math with \\(...\\)', () => {
    const md = createMarkdown()
    const html = md.render('括号公式 \\(\\frac{a}{b}\\) 结束')
    expect(html).toContain('katex')
    expect(html).not.toContain('katex-display')
  })

  it('renders block math with \\[...\\] as display mode', () => {
    const md = createMarkdown()
    const html = md.render('\\[\\sum_{i=1}^{n} i^2\\]')
    expect(html).toContain('katex-display')
  })

  it('renders multi-line $$...$$ formulas', () => {
    const md = createMarkdown()
    const html = md.render([
      '$$',
      'a = ',
      'b + c + d +',
      'e + f',
      '$$',
    ].join('\n'))
    expect(html).toContain('katex-display')
  })

  it('renders multi-line \\[...\\] formulas', () => {
    const md = createMarkdown()
    const html = md.render([
      '\\[',
      '\\begin{aligned}',
      'a &= b + c \\\\',
      'd &= e + f',
      '\\end{aligned}',
      '\\]',
    ].join('\n'))
    expect(html).toContain('katex-display')
  })

  it('does not throw on invalid LaTeX', () => {
    const md = createMarkdown()
    expect(() => md.render('$\\invalid_{}$')).not.toThrow()
  })

  it('keeps plain text without dollar signs unchanged', () => {
    const md = createMarkdown()
    const html = md.render('普通文本，没有公式')
    expect(html).not.toContain('katex')
  })
})
