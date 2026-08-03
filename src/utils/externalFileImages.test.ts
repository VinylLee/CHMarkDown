import { describe, it, expect } from 'vitest'
import { isRelativeImagePath, transformExternalImagePaths } from '../utils/externalFileImages'

describe('isRelativeImagePath', () => {
  it('returns true for a plain relative path', () => {
    expect(isRelativeImagePath('images/pic.png')).toBe(true)
  })

  it('returns true for a relative path with dot prefix', () => {
    expect(isRelativeImagePath('./images/pic.png')).toBe(true)
  })

  it('returns false for http URL', () => {
    expect(isRelativeImagePath('http://example.com/pic.png')).toBe(false)
  })

  it('returns false for https URL', () => {
    expect(isRelativeImagePath('https://example.com/pic.png')).toBe(false)
  })

  it('returns false for chmarkdown URI', () => {
    expect(isRelativeImagePath('chmarkdown://images/abc.png')).toBe(false)
  })

  it('returns false for absolute Windows path', () => {
    expect(isRelativeImagePath('C:\\Users\\test\\pic.png')).toBe(false)
  })

  it('returns false for data URI', () => {
    expect(isRelativeImagePath('data:image/png;base64,abc')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isRelativeImagePath('')).toBe(false)
  })

  it('returns false for anchor link', () => {
    expect(isRelativeImagePath('#section')).toBe(false)
  })

  it('returns false for protocol-relative URL', () => {
    expect(isRelativeImagePath('//example.com/pic.png')).toBe(false)
  })
})

describe('transformExternalImagePaths', () => {
  it('returns content unchanged when token is null', () => {
    expect(transformExternalImagePaths('![alt](images/pic.png)', null)).toBe('![alt](images/pic.png)')
  })

  it('transforms relative image path with token', () => {
    const result = transformExternalImagePaths('![alt](images/pic.png)', 'token123')
    expect(result).toBe('![alt](chmarkdown-ext://token123/images/pic.png)')
  })

  it('does not transform HTTP image URLs', () => {
    const content = '![alt](https://example.com/pic.png)'
    expect(transformExternalImagePaths(content, 'token123')).toBe(content)
  })

  it('does not transform chmarkdown URIs', () => {
    const content = '![alt](chmarkdown://images/abc.png)'
    expect(transformExternalImagePaths(content, 'token123')).toBe(content)
  })

  it('transforms multiple relative images in content', () => {
    const result = transformExternalImagePaths(
      '![a](images/a.png) text ![b](images/b.png)',
      'tok',
    )
    expect(result).toBe('![a](chmarkdown-ext://tok/images/a.png) text ![b](chmarkdown-ext://tok/images/b.png)')
  })

  it('preserves alt text', () => {
    const result = transformExternalImagePaths('![My Image](images/photo.jpg)', 'x')
    expect(result).toBe('![My Image](chmarkdown-ext://x/images/photo.jpg)')
  })

  it('trims whitespace from image source', () => {
    const result = transformExternalImagePaths('![alt]( images/pic.png )', 'tok')
    expect(result).toBe('![alt](chmarkdown-ext://tok/images/pic.png)')
  })

  it('encodes spaces and URL control characters in preview paths', () => {
    const result = transformExternalImagePaths('![alt](images/my photo#1.png)', 'tok')
    expect(result).toBe('![alt](chmarkdown-ext://tok/images/my%20photo%231.png)')
  })

  it('does not transform absolute Windows paths', () => {
    const content = '![alt](C:\\Users\\test\\pic.png)'
    expect(transformExternalImagePaths(content, 'token')).toBe(content)
  })

  it('handles complex markdown with mixed image types', () => {
    const result = transformExternalImagePaths(
      '![local](images/local.png)\n![web](https://example.com/remote.png)\n![managed](chmarkdown://images/abc.png)',
      'tok',
    )
    expect(result).toBe(
      '![local](chmarkdown-ext://tok/images/local.png)\n![web](https://example.com/remote.png)\n![managed](chmarkdown://images/abc.png)',
    )
  })
})
