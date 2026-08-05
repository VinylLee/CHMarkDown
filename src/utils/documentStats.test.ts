import { describe, expect, it } from 'vitest'
import { countDocumentWords } from './documentStats'

describe('countDocumentWords', () => {
  it('returns 0 for an empty document', () => {
    expect(countDocumentWords('')).toBe(0)
    expect(countDocumentWords('   \n\n  ')).toBe(0)
  })

  it('counts Chinese characters individually', () => {
    expect(countDocumentWords('你好世界')).toBe(4)
    expect(countDocumentWords('字数统计')).toBe(4)
  })

  it('counts English words', () => {
    expect(countDocumentWords('hello world')).toBe(2)
    expect(countDocumentWords('Markdown is great!')).toBe(3)
  })

  it('counts mixed Chinese and English text', () => {
    expect(countDocumentWords('你好 hello 世界')).toBe(5)
  })

  it('ignores Markdown syntax markers', () => {
    expect(countDocumentWords('# 标题')).toBe(2)
    expect(countDocumentWords('**加粗** *斜体*')).toBe(4)
    expect(countDocumentWords('- 列表项')).toBe(3)
  })

  it('counts link text but not the destination URL', () => {
    expect(countDocumentWords('[链接](https://example.com/a/b)')).toBe(2)
    expect(countDocumentWords('![图片](chmarkdown://images/photo.png)')).toBe(2)
  })

  it('updates as content changes', () => {
    expect(countDocumentWords('')).toBe(0)
    expect(countDocumentWords('第一行')).toBe(3)
    expect(countDocumentWords('第一行\n第二行')).toBe(6)
  })
})
