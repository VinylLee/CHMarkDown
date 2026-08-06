declare module 'markdown-it-texmath' {
  import type MarkdownIt from 'markdown-it'
  import type { KatexOptions } from 'katex'

  interface TexMathOptions {
    engine: {
      renderToString: (tex: string, options?: KatexOptions) => string
    }
    delimiters?: string | string[]
    katexOptions?: KatexOptions
    macros?: Record<string, string>
    outerSpace?: boolean
    containerTag?: string
    containerClass?: string
  }

  function texmath(md: MarkdownIt, options?: TexMathOptions): void

  export default texmath
}
