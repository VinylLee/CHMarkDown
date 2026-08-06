import type MarkdownIt from 'markdown-it'
import katex from 'katex'
import texmath from 'markdown-it-texmath'

/**
 * 为 markdown-it 接入 LaTeX 数学公式渲染（KaTeX）。
 * 支持行内公式 `$...$`、`\(...\)` 与块级公式 `$$...$$`、`\[...\]`。
 */
export function configureMarkdownLatex(md: MarkdownIt): void {
  md.use(texmath, {
    engine: katex,
    delimiters: ['dollars', 'brackets'],
    katexOptions: {
      throwOnError: false,
      strict: false,
    },
  })
}
