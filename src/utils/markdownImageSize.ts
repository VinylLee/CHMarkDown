import type MarkdownIt from 'markdown-it'

export const MIN_IMAGE_WIDTH = 10
export const MAX_IMAGE_WIDTH = 100

export interface MarkdownImageSizeMatch {
  start: number
  end: number
  width: number | null
  source: string
  alt: string
  format: 'html' | 'markdown'
}

export interface ExportedManagedImages {
  content: string
  imageFiles: string[]
}

interface MarkdownRenderEnvironment {
  selectedImageIndex?: number | null
}

interface ManagedImageTokenMeta {
  managedHtmlImage: true
  width: number | null
}

const SIZE_SUFFIX_PATTERN = /^\{width=(\d{1,3})%\}/
const HTML_IMAGE_TAG_PATTERN = /^<img\b(?:\s+(?:[a-z_:][\w:.-]*)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>/i
const HTML_ATTRIBUTE_PATTERN = /([a-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
const ZOOM_STYLE_PATTERN = /(?:^|;)\s*zoom\s*:\s*(\d{1,3})%\s*(?:;|$)/i
const WIDTH_STYLE_PATTERN = /(?:^|;)\s*width\s*:\s*(\d{1,3})%\s*(?:;|$)/i
const MANAGED_IMAGE_SOURCE_PATTERN = /^chmarkdown:\/\/images\/([^/?#\\]+)$/i

function isEscaped(source: string, index: number): boolean {
  let slashCount = 0
  for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor -= 1) {
    slashCount += 1
  }
  return slashCount % 2 === 1
}

function findClosingBracket(source: string, start: number): number {
  let depth = 1

  for (let cursor = start; cursor < source.length; cursor += 1) {
    if (isEscaped(source, cursor)) continue
    if (source[cursor] === '[') depth += 1
    if (source[cursor] === ']') {
      depth -= 1
      if (depth === 0) return cursor
    }
  }

  return -1
}

function findClosingParenthesis(source: string, start: number): number {
  let depth = 1

  for (let cursor = start; cursor < source.length; cursor += 1) {
    if (isEscaped(source, cursor)) continue
    if (source[cursor] === '(') depth += 1
    if (source[cursor] === ')') {
      depth -= 1
      if (depth === 0) return cursor
    }
  }

  return -1
}

function createIgnoredCharacterMap(source: string): Uint8Array {
  const ignored = new Uint8Array(source.length)
  let fenceMarker = ''
  let fenceLength = 0
  let lineStart = 0

  while (lineStart < source.length) {
    const newlineIndex = source.indexOf('\n', lineStart)
    const lineEnd = newlineIndex === -1 ? source.length : newlineIndex + 1
    const line = source.slice(lineStart, lineEnd)
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/)

    if (fenceMarker) {
      ignored.fill(1, lineStart, lineEnd)
      if (
        fenceMatch &&
        fenceMatch[1][0] === fenceMarker &&
        fenceMatch[1].length >= fenceLength
      ) {
        fenceMarker = ''
        fenceLength = 0
      }
    } else if (fenceMatch) {
      fenceMarker = fenceMatch[1][0]
      fenceLength = fenceMatch[1].length
      ignored.fill(1, lineStart, lineEnd)
    }

    lineStart = lineEnd
  }

  for (let cursor = 0; cursor < source.length; cursor += 1) {
    if (ignored[cursor] || source[cursor] !== '`' || isEscaped(source, cursor)) continue

    let markerLength = 1
    while (source[cursor + markerLength] === '`') markerLength += 1
    const marker = '`'.repeat(markerLength)
    const closingIndex = source.indexOf(marker, cursor + markerLength)
    if (closingIndex === -1) {
      cursor += markerLength - 1
      continue
    }

    ignored.fill(1, cursor, closingIndex + markerLength)
    cursor = closingIndex + markerLength - 1
  }

  return ignored
}

function parseValidWidth(value: string | undefined): number | null {
  if (value === undefined) return null
  const width = Number(value)
  return width >= MIN_IMAGE_WIDTH && width <= MAX_IMAGE_WIDTH ? width : null
}

function readHtmlAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>()
  HTML_ATTRIBUTE_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = HTML_ATTRIBUTE_PATTERN.exec(tag)) !== null) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? '')
  }

  return attributes
}

function parseHtmlImageAt(source: string, start: number): MarkdownImageSizeMatch | null {
  const tagMatch = source.slice(start).match(HTML_IMAGE_TAG_PATTERN)
  if (!tagMatch) return null

  const tag = tagMatch[0]
  const attributes = readHtmlAttributes(tag)
  const imageSource = attributes.get('src') ?? ''
  if (!MANAGED_IMAGE_SOURCE_PATTERN.test(imageSource)) return null

  const style = attributes.get('style') ?? ''
  const scaleMatch = style.match(ZOOM_STYLE_PATTERN) ?? style.match(WIDTH_STYLE_PATTERN)

  return {
    start,
    end: start + tag.length,
    width: parseValidWidth(scaleMatch?.[1]),
    source: imageSource,
    alt: attributes.get('alt') ?? '图片',
    format: 'html',
  }
}

function parseMarkdownImageAt(source: string, start: number): MarkdownImageSizeMatch | null {
  if (
    source[start] !== '!' ||
    source[start + 1] !== '[' ||
    isEscaped(source, start)
  ) {
    return null
  }

  const altEnd = findClosingBracket(source, start + 2)
  if (altEnd === -1 || source[altEnd + 1] !== '(') return null

  const destinationEnd = findClosingParenthesis(source, altEnd + 2)
  if (destinationEnd === -1) return null

  const imageSource = source.slice(altEnd + 2, destinationEnd).trim()
  if (!MANAGED_IMAGE_SOURCE_PATTERN.test(imageSource)) return null

  const syntaxEnd = destinationEnd + 1
  const suffixMatch = source.slice(syntaxEnd).match(SIZE_SUFFIX_PATTERN)

  return {
    start,
    end: syntaxEnd + (suffixMatch?.[0].length ?? 0),
    width: parseValidWidth(suffixMatch?.[1]),
    source: imageSource,
    alt: source.slice(start + 2, altEnd) || '图片',
    format: 'markdown',
  }
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeMarkdownAlt(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/([\[\]])/g, '\\$1')
}

function normalizeWidth(width: number | null): number | null {
  return width === null
    ? null
    : Math.min(MAX_IMAGE_WIDTH, Math.max(MIN_IMAGE_WIDTH, Math.round(width)))
}

export function createManagedImageHtml(
  source: string,
  alt = '图片',
  width: number | null = null
): string {
  if (!MANAGED_IMAGE_SOURCE_PATTERN.test(source)) {
    throw new Error('不是有效的 CHMarkDown 图片地址')
  }

  const normalizedWidth = normalizeWidth(width)
  const style = normalizedWidth === null
    ? ''
    : ` style="zoom:${normalizedWidth}%;"`

  return `<img src="${escapeHtmlAttribute(source)}" alt="${escapeHtmlAttribute(alt)}"${style} />`
}

function createMarkdownImage(
  source: string,
  alt: string,
  width: number | null,
): string {
  const normalizedWidth = normalizeWidth(width)
  const sizeSuffix = normalizedWidth === null ? '' : `{width=${normalizedWidth}%}`
  return `![${escapeMarkdownAlt(alt)}](${source})${sizeSuffix}`
}

export function createManagedImageMarkdown(
  source: string,
  alt = '图片',
  width: number | null = null,
): string {
  if (!MANAGED_IMAGE_SOURCE_PATTERN.test(source)) {
    throw new Error('不是有效的 CHMarkDown 图片地址')
  }
  return createMarkdownImage(source, alt, width)
}

export function findResizableMarkdownImages(source: string): MarkdownImageSizeMatch[] {
  const images: MarkdownImageSizeMatch[] = []
  const ignored = createIgnoredCharacterMap(source)

  for (let cursor = 0; cursor < source.length; cursor += 1) {
    if (ignored[cursor]) continue

    const image = source[cursor] === '<'
      ? parseHtmlImageAt(source, cursor)
      : parseMarkdownImageAt(source, cursor)
    if (!image) continue

    images.push(image)
    cursor = image.end - 1
  }

  return images
}

export function hasManagedImages(source: string): boolean {
  return findResizableMarkdownImages(source).length > 0
}

export function updateMarkdownImageWidth(
  source: string,
  imageIndex: number,
  width: number | null
): string {
  const image = findResizableMarkdownImages(source)[imageIndex]
  if (!image) return source

  const replacement = createManagedImageMarkdown(image.source, image.alt, width)
  return `${source.slice(0, image.start)}${replacement}${source.slice(image.end)}`
}

export function convertManagedImagesForExport(source: string): ExportedManagedImages {
  const images = findResizableMarkdownImages(source)
  if (images.length === 0) return { content: source, imageFiles: [] }

  const imageFiles = new Set<string>()
  let content = ''
  let cursor = 0

  for (const image of images) {
    const sourceMatch = image.source.match(MANAGED_IMAGE_SOURCE_PATTERN)
    if (!sourceMatch) continue

    const filename = sourceMatch[1]
    imageFiles.add(filename)
    content += source.slice(cursor, image.start)
    content += createMarkdownImage(`images/${filename}`, image.alt, image.width)
    cursor = image.end
  }

  content += source.slice(cursor)
  return { content, imageFiles: [...imageFiles] }
}

export function configureMarkdownImageSizing(markdown: MarkdownIt): void {
  markdown.inline.ruler.before('emphasis', 'chmarkdown_html_image', (state, silent) => {
    if (state.src[state.pos] !== '<') return false

    const image = parseHtmlImageAt(state.src, state.pos)
    if (!image || image.end > state.posMax) return false
    if (silent) return true

    const imageToken = state.push('image', 'img', 0)
    const altToken = new state.Token('text', '', 0)
    altToken.content = image.alt
    imageToken.children = [altToken]
    imageToken.attrSet('src', image.source)
    imageToken.attrSet('alt', image.alt)
    imageToken.meta = {
      managedHtmlImage: true,
      width: image.width,
    } satisfies ManagedImageTokenMeta
    state.pos = image.end
    return true
  })

  markdown.core.ruler.after('inline', 'chmarkdown_image_sizing', (state) => {
    const environment = state.env as MarkdownRenderEnvironment
    let imageIndex = 0

    for (const blockToken of state.tokens) {
      const children = blockToken.children
      if (!children) continue

      for (let tokenIndex = 0; tokenIndex < children.length; tokenIndex += 1) {
        const imageToken = children[tokenIndex]
        if (imageToken.type !== 'image') continue

        const source = imageToken.attrGet('src') ?? ''
        if (!MANAGED_IMAGE_SOURCE_PATTERN.test(source)) continue

        const meta = imageToken.meta as ManagedImageTokenMeta | null
        let width = meta?.managedHtmlImage ? meta.width : null

        if (!meta?.managedHtmlImage) {
          const suffixToken = children[tokenIndex + 1]
          const suffixMatch = suffixToken?.type === 'text'
            ? suffixToken.content.match(SIZE_SUFFIX_PATTERN)
            : null
          width = parseValidWidth(suffixMatch?.[1])
          if (suffixMatch && width !== null) {
            suffixToken.content = suffixToken.content.slice(suffixMatch[0].length)
          }
        }

        imageToken.attrSet('data-image-index', String(imageIndex))
        imageToken.attrSet('data-image-width', width === null ? 'original' : String(width))
        imageToken.attrJoin('class', 'chmarkdown-resizable-image')
        imageToken.attrSet('title', '点击调整图片大小')

        if (width !== null) {
          imageToken.attrSet('style', `zoom:${width}%;max-width:100%`)
        }
        if (environment.selectedImageIndex === imageIndex) {
          imageToken.attrJoin('class', 'chmarkdown-resizable-image--selected')
        }

        imageIndex += 1
      }
    }
  })
}
