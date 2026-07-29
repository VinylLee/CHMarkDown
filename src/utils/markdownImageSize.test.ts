import { describe, expect, it } from 'vitest'
import MarkdownIt from 'markdown-it'
import {
  configureMarkdownImageSizing,
  convertFlowdeskImagesForExport,
  createFlowdeskImageHtml,
  findResizableMarkdownImages,
  hasFlowdeskImages,
  updateMarkdownImageWidth,
} from './markdownImageSize'

describe('markdown image sizing', () => {
  it('reads HTML images and remains compatible with the previous Markdown format', () => {
    const markdown = [
      '<img src="flowdesk://images/first.png" alt="第一张" />',
      '<img src="flowdesk://images/second.png" alt="第二张" style="width:60%; height:auto;" />',
      '![](flowdesk://images/legacy.png){width=40%}',
    ].join('\n')

    const images = findResizableMarkdownImages(markdown)
    expect(images.map((image) => image.width)).toEqual([null, 60, 40])
    expect(images.map((image) => image.format)).toEqual(['html', 'html', 'markdown'])
  })

  it('creates the FlowDesk HTML image syntax with zoom', () => {
    expect(createFlowdeskImageHtml('flowdesk://images/photo.png', '图片', 50)).toBe(
      '<img src="flowdesk://images/photo.png" alt="图片" style="zoom:50%;" />'
    )
  })

  it('updates only the selected occurrence when an image is repeated', () => {
    const image = createFlowdeskImageHtml('flowdesk://images/repeated.png')
    const markdown = `${image}\n${image}`

    expect(updateMarkdownImageWidth(markdown, 1, 50)).toBe(
      `${image}\n<img src="flowdesk://images/repeated.png" alt="图片" style="zoom:50%;" />`
    )
  })

  it('converts a legacy Markdown image to HTML when its size changes', () => {
    const markdown = '![旧图片](flowdesk://images/legacy.png){width=75%}'

    expect(updateMarkdownImageWidth(markdown, 0, 25)).toBe(
      '<img src="flowdesk://images/legacy.png" alt="旧图片" style="zoom:25%;" />'
    )
  })

  it('converts an existing width style to zoom and can remove the scale', () => {
    const html = '<img src="flowdesk://images/photo.png" alt="图片" style="width:75%; height:auto;" />'

    expect(updateMarkdownImageWidth(html, 0, 25)).toContain('style="zoom:25%;"')
    expect(updateMarkdownImageWidth(html, 0, null)).toBe(
      '<img src="flowdesk://images/photo.png" alt="图片" />'
    )
  })

  it('clamps widths to the supported range', () => {
    const html = createFlowdeskImageHtml('flowdesk://images/photo.png')

    expect(updateMarkdownImageWidth(html, 0, 2)).toContain('zoom:10%')
    expect(updateMarkdownImageWidth(html, 0, 180)).toContain('zoom:100%')
  })

  it('ignores image-looking text inside code', () => {
    const markdown = [
      '`<img src="flowdesk://images/inline.png" alt="图片" />`',
      '```html',
      '<img src="flowdesk://images/fenced.png" alt="图片" />',
      '```',
      '<img src="flowdesk://images/real.png" alt="图片" />',
    ].join('\n')

    expect(findResizableMarkdownImages(markdown)).toHaveLength(1)
    expect(updateMarkdownImageWidth(markdown, 0, 40)).toContain(
      '<img src="flowdesk://images/real.png" alt="图片" style="zoom:40%;" />'
    )
  })

  it('renders the controlled HTML syntax with sizing metadata', () => {
    const markdown = new MarkdownIt({ html: false })
    configureMarkdownImageSizing(markdown)

    const rendered = markdown.render(
      '<img src="flowdesk://images/photo.png" alt="图片" style="zoom:60%;" />',
      { selectedImageIndex: 0 }
    )

    expect(rendered).toContain('src="flowdesk://images/photo.png"')
    expect(rendered).toContain('data-image-index="0"')
    expect(rendered).toContain('data-image-width="60"')
    expect(rendered).toContain('zoom:60%')
    expect(rendered).toContain('flowdesk-resizable-image--selected')
    expect(rendered).not.toContain('&lt;img')
  })

  it('keeps arbitrary HTML disabled', () => {
    const markdown = new MarkdownIt({ html: false })
    configureMarkdownImageSizing(markdown)

    const rendered = markdown.render('<img src="https://example.com/remote.png" onerror="alert(1)" />')

    expect(rendered).toContain('&lt;img')
    expect(rendered).not.toContain('<img src="https://example.com')
  })

  it('uses the shared parser to decide whether export must create a zip', () => {
    expect(hasFlowdeskImages(
      '<img src="flowdesk://images/photo.png" alt="图片" style="zoom:50%;" />'
    )).toBe(true)
    expect(hasFlowdeskImages(
      '<img src="flowdesk://images/legacy-width.png" alt="图片" style="width:75%; height:auto;" />'
    )).toBe(true)
    expect(hasFlowdeskImages('![](flowdesk://images/legacy.png)')).toBe(true)
    expect(hasFlowdeskImages('没有本地图片')).toBe(false)
  })

  it('exports FlowDesk HTML as relative Typora-compatible HTML', () => {
    const source = [
      '<img src="flowdesk://images/photo.png" alt="风景" style="width:50%; height:auto;" />',
      '<img src="flowdesk://images/original.png" alt="原图" />',
      '![](flowdesk://images/legacy.png){width=75%}',
    ].join('\n')

    const exported = convertFlowdeskImagesForExport(source)

    expect(exported.imageFiles).toEqual(['photo.png', 'original.png', 'legacy.png'])
    expect(exported.content).toContain(
      '<img src="images/photo.png" alt="风景" style="zoom:50%;" />'
    )
    expect(exported.content).toContain('<img src="images/original.png" alt="原图" />')
    expect(exported.content).toContain(
      '<img src="images/legacy.png" alt="图片" style="zoom:75%;" />'
    )
    expect(exported.content).not.toContain('flowdesk://')
  })

  it('deduplicates image files during export', () => {
    const image = '<img src="flowdesk://images/repeated.png" alt="图片" />'
    const exported = convertFlowdeskImagesForExport(`${image}\n${image}`)

    expect(exported.imageFiles).toEqual(['repeated.png'])
  })
})
