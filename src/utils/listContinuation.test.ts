import { describe, it, expect } from 'vitest'
import {
  extractListPrefix,
  isEmptyListItem,
  resolveLineEndEnter,
  resolveListContinuation,
} from './listContinuation'

describe('extractListPrefix', () => {
  it('识别无序列表前缀 (- )', () => {
    expect(extractListPrefix('- item')).toBe('- ')
  })

  it('识别无序列表前缀 (* )', () => {
    expect(extractListPrefix('* item')).toBe('* ')
  })

  it('识别无序列表前缀 (+ )', () => {
    expect(extractListPrefix('+ item')).toBe('+ ')
  })

  it('识别有序列表前缀', () => {
    expect(extractListPrefix('1. item')).toBe('1. ')
  })

  it('识别有序列表前缀 (两位数)', () => {
    expect(extractListPrefix('12. item')).toBe('12. ')
  })

  it('识别缩进列表前缀', () => {
    expect(extractListPrefix('  - item')).toBe('  - ')
    expect(extractListPrefix('    1. item')).toBe('    1. ')
  })

  it('普通段落返回 null', () => {
    expect(extractListPrefix('hello world')).toBeNull()
  })

  it('空行返回 null', () => {
    expect(extractListPrefix('')).toBeNull()
  })

  it('仅含标记但无空格返回 null', () => {
    expect(extractListPrefix('-item')).toBeNull()
  })

  it('标题返回 null', () => {
    expect(extractListPrefix('# Title')).toBeNull()
  })
})

describe('isEmptyListItem', () => {
  it('空无序列表项', () => {
    expect(isEmptyListItem('- ')).toBe(true)
    expect(isEmptyListItem('-')).toBe(false)
    expect(isEmptyListItem('* ')).toBe(true)
  })

  it('空有序列表项', () => {
    expect(isEmptyListItem('1. ')).toBe(true)
    expect(isEmptyListItem('3.')).toBe(false)
  })

  it('非空列表项', () => {
    expect(isEmptyListItem('- item')).toBe(false)
    expect(isEmptyListItem('1. item')).toBe(false)
  })

  it('普通文本', () => {
    expect(isEmptyListItem('hello')).toBe(false)
  })

  it('缩进空列表项', () => {
    expect(isEmptyListItem('  - ')).toBe(true)
  })
})

describe('resolveListContinuation', () => {
  describe('非空列表项 → 续行', () => {
    it('无序列表 (-) 在行末续行', () => {
      // cursor=7 在 "- hello" 末尾
      const result = resolveListContinuation('- hello', 7)
      expect(result).not.toBeNull()
      expect(result!.content).toBe('- hello\n- ')
      expect(result!.cursor).toBe(10)
    })

    it('无序列表 (-) 在行中续行（光标处拆分）', () => {
      // cursor=3 在 "- hello" 的 "h" 之前
      const result = resolveListContinuation('- hello', 3)
      expect(result).not.toBeNull()
      expect(result!.content).toBe('- h\n- ello')
      expect(result!.cursor).toBe(6)
    })

    it('无序列表 (*) 续行', () => {
      const result = resolveListContinuation('* hello', 7)
      expect(result).not.toBeNull()
      expect(result!.content).toBe('* hello\n* ')
      expect(result!.cursor).toBe(10)
    })

    it('无序列表 (+) 续行', () => {
      const result = resolveListContinuation('+ hello', 7)
      expect(result).not.toBeNull()
      expect(result!.content).toBe('+ hello\n+ ')
      expect(result!.cursor).toBe(10)
    })

    it('有序列表续行，编号递增', () => {
      const result = resolveListContinuation('1. hello', 8)
      expect(result).not.toBeNull()
      expect(result!.content).toBe('1. hello\n2. ')
      expect(result!.cursor).toBe(12)
    })

    it('有序列表从 9 续行到 10', () => {
      const result = resolveListContinuation('9. hello', 8)
      expect(result).not.toBeNull()
      expect(result!.content).toBe('9. hello\n10. ')
      expect(result!.cursor).toBe(13)
    })

    it('最后一行（无尾换行）续行', () => {
      const result = resolveListContinuation('- last', 6)
      expect(result).not.toBeNull()
      expect(result!.content).toBe('- last\n- ')
      expect(result!.cursor).toBe(9)
    })

    it('缩进列表续行保持缩进', () => {
      const result = resolveListContinuation('  - hello', 9)
      expect(result).not.toBeNull()
      expect(result!.content).toBe('  - hello\n  - ')
      expect(result!.cursor).toBe(14)
    })

    it('中间行续行', () => {
      const content = '- first\n- second\n- third'
      // cursor 在 "- second" 末尾 (index 16)
      const result = resolveListContinuation(content, 16)
      expect(result).not.toBeNull()
      expect(result!.content).toBe('- first\n- second\n- \n- third')
      expect(result!.cursor).toBe(19)
    })

    it('光标在行中时拆分文本', () => {
      // "- hello world" cursor=8 → "- hello " + "\n- " + "world"
      const result = resolveListContinuation('- hello world', 8)
      expect(result).not.toBeNull()
      expect(result!.content).toBe('- hello \n- world')
      expect(result!.cursor).toBe(11)
    })
  })

  describe('空列表项 → 退出列表', () => {
    it('空无序列表项删除前缀', () => {
      const result = resolveListContinuation('- ', 2)
      expect(result).not.toBeNull()
      expect(result!.content).toBe('')
      expect(result!.cursor).toBe(0)
    })

    it('空有序列表项删除前缀', () => {
      const result = resolveListContinuation('1. ', 3)
      expect(result).not.toBeNull()
      expect(result!.content).toBe('')
      expect(result!.cursor).toBe(0)
    })

    it('上下文中的空列表项', () => {
      const content = '- first\n- \n- third'
      // cursor 在第二行 "- " 的末尾
      const result = resolveListContinuation(content, 10)
      expect(result).not.toBeNull()
      expect(result!.content).toBe('- first\n- third')
      expect(result!.cursor).toBe(8)
    })
  })

  describe('非列表行 → 不接管', () => {
    it('普通段落不接管', () => {
      expect(resolveListContinuation('hello world', 5)).toBeNull()
    })

    it('标题不接管', () => {
      expect(resolveListContinuation('# Title', 3)).toBeNull()
    })

    it('空行不接管', () => {
      expect(resolveListContinuation('', 0)).toBeNull()
    })

    it('引用块不接管', () => {
      expect(resolveListContinuation('> quote', 3)).toBeNull()
    })
  })

  describe('光标位于列表行首 → 不接管', () => {
    it('无序列表行首（减号前）不接管', () => {
      expect(resolveListContinuation('- hello', 0)).toBeNull()
    })

    it('有序列表行首（编号前）不接管', () => {
      expect(resolveListContinuation('1. hello', 0)).toBeNull()
    })

    it('缩进列表行首不接管', () => {
      expect(resolveListContinuation('  - hello', 0)).toBeNull()
    })

    it('空列表项行首不接管', () => {
      expect(resolveListContinuation('- ', 0)).toBeNull()
    })

    it('非首行列表的行首不接管', () => {
      const content = '- first\n- second'
      // cursor 位于第二行 "- second" 的减号之前 (index 8)
      expect(resolveListContinuation(content, 8)).toBeNull()
    })
  })
})

describe('resolveLineEndEnter', () => {
  it('普通段落：在行末插入换行', () => {
    const result = resolveLineEndEnter('hello world', 5)
    expect(result.content).toBe('hello world\n')
    expect(result.cursor).toBe(12)
  })

  it('光标在行中时仍从行末换行', () => {
    const result = resolveLineEndEnter('ab\ncd', 3)
    expect(result.content).toBe('ab\ncd\n')
    expect(result.cursor).toBe(6)
  })

  it('多行中间行：在中间行行末换行', () => {
    const result = resolveLineEndEnter('- a\nhello\n- b', 6)
    expect(result.content).toBe('- a\nhello\n\n- b')
    expect(result.cursor).toBe(10)
  })

  it('无序列表：续行并保持列表', () => {
    const result = resolveLineEndEnter('- item', 0)
    expect(result.content).toBe('- item\n- ')
    expect(result.cursor).toBe(9)
  })

  it('有序列表：续行并递增编号', () => {
    const result = resolveLineEndEnter('1. item', 3)
    expect(result.content).toBe('1. item\n2. ')
    expect(result.cursor).toBe(11)
  })

  it('空列表项：与行末按回车一致，退出列表', () => {
    const result = resolveLineEndEnter('- ', 0)
    expect(result.content).toBe('')
    expect(result.cursor).toBe(0)
  })

  it('文档末尾无尾换行时正常插入', () => {
    const result = resolveLineEndEnter('last line', 2)
    expect(result.content).toBe('last line\n')
    expect(result.cursor).toBe(10)
  })

  it('空文档：插入一个换行', () => {
    const result = resolveLineEndEnter('', 0)
    expect(result.content).toBe('\n')
    expect(result.cursor).toBe(1)
  })
})
