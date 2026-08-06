const WRAP_PAIRS: Record<string, [string, string]> = {
  '"': ['"', '"'],
  "'": ["'", "'"],
  '(': ['(', ')'],
  ')': ['(', ')'],
  '[': ['[', ']'],
  ']': ['[', ']'],
  '{': ['{', '}'],
  '}': ['{', '}'],
  '“': ['“', '”'],
  '”': ['“', '”'],
  '‘': ['‘', '’'],
  '’': ['‘', '’'],
  '（': ['（', '）'],
  '）': ['（', '）'],
  '［': ['［', '］'],
  '］': ['［', '］'],
  '｛': ['｛', '｝'],
  '｝': ['｛', '｝'],
  '《': ['《', '》'],
  '》': ['《', '》'],
  '「': ['「', '」'],
  '」': ['「', '」'],
  '『': ['『', '』'],
  '』': ['『', '』'],
}

export interface SelectionWrapResult {
  content: string
  selectionStart: number
  selectionEnd: number
}

/**
 * 编辑区存在选区时，把按下成对符号的输入转换为“包裹选区”：
 * 在选区前后各插入对应的开/闭符号，选区保持选中原文。
 * 无选区或按键不是成对符号时返回 null，保持浏览器默认输入行为。
 */
export function resolveSelectionWrap(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  key: string,
): SelectionWrapResult | null {
  const pair = WRAP_PAIRS[key]
  if (!pair) return null
  if (selectionStart === selectionEnd) return null

  const start = Math.min(selectionStart, selectionEnd)
  const end = Math.max(selectionStart, selectionEnd)
  const selected = content.slice(start, end)

  return {
    content: `${content.slice(0, start)}${pair[0]}${selected}${pair[1]}${content.slice(end)}`,
    selectionStart: start + 1,
    selectionEnd: start + 1 + selected.length,
  }
}
