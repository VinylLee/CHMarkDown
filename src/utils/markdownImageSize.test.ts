import { describe, expect, it } from 'vitest'
import MarkdownIt from 'markdown-it'
import {
  configureMarkdownImageSizing,
  convertManagedImagesForExport,
  createManagedImageHtml,
  createManagedImageMarkdown,
  findResizableMarkdownImages,
  hasManagedImages,
  removeMarkdownImage,
  updateMarkdownImageWidth,
} from './markdownImageSize'

describe('markdown image sizing', () => {
  it('reads HTML images and remains compatible with the previous Markdown format', () => {
    const markdown = [
      '<img src="chmarkdown://images/first.png" alt="第一张" />',
      '<img src="chmarkdown://images/second.png" alt="第二张" style="width:60%; height:auto;" />',
      '![](chmarkdown://images/legacy.png){width=40%}',
    ].join('\n')

    const images = findResizableMarkdownImages(markdown)
    expect(images.map((image) => image.width)).toEqual([null, 60, 40])
    expect(images.map((image) => image.format)).toEqual(['html', 'html', 'markdown'])
  })

  it('creates the legacy managed HTML image syntax for compatibility', () => {
    expect(createManagedImageHtml('chmarkdown://images/photo.png', '图片', 50)).toBe(
      '<img src="chmarkdown://images/photo.png" alt="图片" style="zoom:50%;" />'
    )
  })

  it('creates the canonical managed Markdown image syntax', () => {
    expect(createManagedImageMarkdown('chmarkdown://images/photo.png', '图片', 50)).toBe(
      '![图片](chmarkdown://images/photo.png){width=50%}'
    )
  })

  it('updates only the selected occurrence when an image is repeated', () => {
    const image = createManagedImageHtml('chmarkdown://images/repeated.png')
    const markdown = `${image}\n${image}`

    expect(updateMarkdownImageWidth(markdown, 1, 50)).toBe(
      `${image}\n![图片](chmarkdown://images/repeated.png){width=50%}`
    )
  })

  it('keeps Markdown image syntax when its size changes', () => {
    const markdown = '![旧图片](chmarkdown://images/legacy.png){width=75%}'

    expect(updateMarkdownImageWidth(markdown, 0, 25)).toBe(
      '![旧图片](chmarkdown://images/legacy.png){width=25%}'
    )
  })

  it('migrates legacy HTML to Markdown and can remove the scale', () => {
    const html = '<img src="chmarkdown://images/photo.png" alt="图片" style="width:75%; height:auto;" />'

    expect(updateMarkdownImageWidth(html, 0, 25)).toBe(
      '![图片](chmarkdown://images/photo.png){width=25%}'
    )
    expect(updateMarkdownImageWidth(html, 0, null)).toBe(
      '![图片](chmarkdown://images/photo.png)'
    )
  })

  it('clamps widths to the supported range', () => {
    const html = createManagedImageHtml('chmarkdown://images/photo.png')

    expect(updateMarkdownImageWidth(html, 0, 2)).toContain('{width=10%}')
    expect(updateMarkdownImageWidth(html, 0, 180)).toContain('{width=100%}')
  })

  it('recognizes relative-path images in external documents as resizable', () => {
    const markdown = '![风景](images/photo.png){width=50%}\n\n![另一张](./photos/a.png)'
    const images = findResizableMarkdownImages(markdown)
    expect(images.map((image) => image.source)).toEqual([
      'images/photo.png',
      './photos/a.png',
    ])
    expect(images.map((image) => image.width)).toEqual([50, null])
  })

  it('updates the width of a relative-path image', () => {
    expect(updateMarkdownImageWidth('![风景](images/photo.png)', 0, 40)).toBe(
      '![风景](images/photo.png){width=40%}'
    )
    expect(updateMarkdownImageWidth('![风景](images/photo.png){width=40%}', 0, null)).toBe(
      '![风景](images/photo.png)'
    )
  })

  it('removes a managed image including its size suffix', () => {
    expect(removeMarkdownImage('![图片](chmarkdown://images/photo.png){width=50%}', 0)).toBe('')
  })

  it('removes a relative-path image from external documents', () => {
    expect(removeMarkdownImage('第一行\n![风景](images/photo.png){width=40%}\n第三行', 0)).toBe(
      '第一行\n\n第三行'
    )
  })

  it('removes only the selected image when several exist', () => {
    const markdown = '![甲](images/a.png)\n![乙](images/b.png)'
    expect(removeMarkdownImage(markdown, 0)).toBe('\n![乙](images/b.png)')
    expect(removeMarkdownImage(markdown, 1)).toBe('![甲](images/a.png)\n')
  })

  it('returns the source unchanged for an invalid image index', () => {
    expect(removeMarkdownImage('![甲](images/a.png)', 5)).toBe('![甲](images/a.png)')
  })

  it('keeps remote and embedded images non-resizable', () => {
    const markdown = [
      '![远程](https://example.com/a.png)',
      '![内嵌](data:image/png;base64,AAAA)',
      '![相对](images/local.png)',
    ].join('\n')
    const images = findResizableMarkdownImages(markdown)
    expect(images).toHaveLength(1)
    expect(images[0].source).toBe('images/local.png')
  })

  it('ignores image-looking text inside code', () => {
    const markdown = [
      '`<img src="chmarkdown://images/inline.png" alt="图片" />`',
      '```html',
      '<img src="chmarkdown://images/fenced.png" alt="图片" />',
      '```',
      '<img src="chmarkdown://images/real.png" alt="图片" />',
    ].join('\n')

    expect(findResizableMarkdownImages(markdown)).toHaveLength(1)
    expect(updateMarkdownImageWidth(markdown, 0, 40)).toContain(
      '![图片](chmarkdown://images/real.png){width=40%}'
    )
  })

  it('renders the controlled HTML syntax with sizing metadata', () => {
    const markdown = new MarkdownIt({ html: false })
    configureMarkdownImageSizing(markdown)

    const rendered = markdown.render(
      '<img src="chmarkdown://images/photo.png" alt="图片" style="zoom:60%;" />',
      { selectedImageIndex: 0 }
    )

    expect(rendered).toContain('src="chmarkdown://images/photo.png"')
    expect(rendered).toContain('data-image-index="0"')
    expect(rendered).toContain('data-image-width="60"')
    expect(rendered).toContain('zoom:60%')
    expect(rendered).toContain('chmarkdown-resizable-image--selected')
    expect(rendered).not.toContain('&lt;img')
  })

  it('renders relative-path images with sizing metadata', () => {
    const markdown = new MarkdownIt({ html: false })
    configureMarkdownImageSizing(markdown)

    const rendered = markdown.render(
      '![风景](images/photo.png){width=50%}',
      { selectedImageIndex: 0 }
    )

    expect(rendered).toContain('src="images/photo.png"')
    expect(rendered).toContain('data-image-index="0"')
    expect(rendered).toContain('data-image-width="50"')
    expect(rendered).toContain('zoom:50%')
    expect(rendered).toContain('chmarkdown-resizable-image--selected')
    expect(rendered).not.toContain('{width=50%}')
  })

  it('renders external-document image URLs with sizing metadata', () => {
    const markdown = new MarkdownIt({ html: false })
    configureMarkdownImageSizing(markdown)

    const rendered = markdown.render(
      '![风景](chmarkdown-ext://abc123/images/photo.png){width=30%}',
      { selectedImageIndex: 0 }
    )

    expect(rendered).toContain('data-image-index="0"')
    expect(rendered).toContain('data-image-width="30"')
    expect(rendered).toContain('zoom:30%')
    expect(rendered).not.toContain('{width=30%}')
  })

  it('keeps arbitrary HTML disabled', () => {
    const markdown = new MarkdownIt({ html: false })
    configureMarkdownImageSizing(markdown)

    const rendered = markdown.render('<img src="https://example.com/remote.png" onerror="alert(1)" />')

    expect(rendered).toContain('&lt;img')
    expect(rendered).not.toContain('<img src="https://example.com')
  })

  it('uses the shared parser to decide whether export must create a zip', () => {
    expect(hasManagedImages(
      '<img src="chmarkdown://images/photo.png" alt="图片" style="zoom:50%;" />'
    )).toBe(true)
    expect(hasManagedImages(
      '<img src="chmarkdown://images/legacy-width.png" alt="图片" style="width:75%; height:auto;" />'
    )).toBe(true)
    expect(hasManagedImages('![](chmarkdown://images/legacy.png)')).toBe(true)
    expect(hasManagedImages('没有本地图片')).toBe(false)
  })

  it('exports both managed formats as relative Markdown images', () => {
    const source = [
      '<img src="chmarkdown://images/photo.png" alt="风景" style="width:50%; height:auto;" />',
      '<img src="chmarkdown://images/original.png" alt="原图" />',
      '![](chmarkdown://images/legacy.png){width=75%}',
    ].join('\n')

    const exported = convertManagedImagesForExport(source)

    expect(exported.imageFiles).toEqual(['photo.png', 'original.png', 'legacy.png'])
    expect(exported.content).toContain(
      '![风景](images/photo.png){width=50%}'
    )
    expect(exported.content).toContain('![原图](images/original.png)')
    expect(exported.content).toContain(
      '![图片](images/legacy.png){width=75%}'
    )
    expect(exported.content).not.toContain('chmarkdown://')
  })

  it('deduplicates image files during export', () => {
    const image = '<img src="chmarkdown://images/repeated.png" alt="图片" />'
    const exported = convertManagedImagesForExport(`${image}\n${image}`)

    expect(exported.imageFiles).toEqual(['repeated.png'])
  })
})
