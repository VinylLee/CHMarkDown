/**
 * 列表自动续行工具
 *
 * 在 Markdown 编辑区按 Enter 时：
 * - 如果当前行是非空列表项，自动在新行添加相同的列表前缀
 * - 如果当前行是空列表项（仅含前缀），删除前缀并结束列表
 *
 * 同时支持 Ctrl+Enter：先把光标跳到当前行行末，再执行一次回车行为。
 */

export interface ListContinuationResult {
  /** 修改后的完整文本 */
  content: string
  /** 光标应定位到的新位置 */
  cursor: number
}

const UNORDERED_RE = /^(\s*)([-*+])\s/
const ORDERED_RE = /^(\s*)(\d+)\.\s/

/**
 * 从一行文本中提取列表前缀。
 * 返回 null 表示该行不是列表项。
 */
export function extractListPrefix(line: string): string | null {
  const unordered = line.match(UNORDERED_RE)
  if (unordered) return `${unordered[1]}${unordered[2]} `
  const ordered = line.match(ORDERED_RE)
  if (ordered) return `${ordered[1]}${ordered[2]}. `
  return null
}

/**
 * 判断一行是否是空列表项（仅含列表符号和空白）。
 */
export function isEmptyListItem(line: string): boolean {
  const prefix = extractListPrefix(line)
  if (!prefix) return false
  return line.substring(prefix.length).trim().length === 0
}

/**
 * 计算有序列表的下一个编号。
 */
function incrementOrderedPrefix(prefix: string): string {
  const match = prefix.match(/^(\s*)(\d+)\.\s$/)
  if (!match) return prefix
  const num = parseInt(match[2], 10) + 1
  return `${match[1]}${num}. `
}

/**
 * 当用户在 textarea 中按 Enter 时，决定列表续行行为。
 *
 * @param content 当前编辑器全文
 * @param cursor  当前光标位置（selectionStart === selectionEnd）
 * @returns 如果需要接管行为，返回续行结果；否则返回 null（使用默认换行）
 */
export function resolveListContinuation(
  content: string,
  cursor: number,
): ListContinuationResult | null {
  // 找到光标所在行的起止位置
  const lineStart = content.lastIndexOf('\n', cursor - 1) + 1
  const lineEnd = content.indexOf('\n', cursor)
  const currentLine = content.substring(
    lineStart,
    lineEnd === -1 ? content.length : lineEnd,
  )

  // 光标位于行首（列表符号之前）时不接管：按回车只会在该行前插入一个空行
  if (cursor === lineStart) return null

  const prefix = extractListPrefix(currentLine)
  if (!prefix) return null

  // 判断是否为空列表项（仅含前缀 + 可选空白）
  const lineContentAfterPrefix = currentLine.substring(prefix.length).trim()
  if (lineContentAfterPrefix.length === 0) {
    // 空列表项 → 删除整行（包括行尾换行符），光标留在行首
    const deleteEnd = lineEnd === -1 ? content.length : lineEnd + 1
    const before = content.substring(0, lineStart)
    const after = content.substring(deleteEnd)
    return {
      content: before + after,
      cursor: lineStart,
    }
  }

  // 非空列表项 → 在光标处换行，新行插入递增后的列表前缀
  const newPrefix = incrementOrderedPrefix(prefix)
  const before = content.substring(0, cursor)
  const after = content.substring(cursor)
  const insertion = '\n' + newPrefix
  return {
    content: before + insertion + after,
    cursor: cursor + insertion.length,
  }
}

/**
 * Ctrl+Enter：把光标先跳到当前行行末，再执行一次回车行为。
 *
 * 与在行末直接按回车一致：列表行继续列表，普通行在行末插入换行。
 */
export function resolveLineEndEnter(
  content: string,
  cursor: number,
): ListContinuationResult {
  const lineEnd = content.indexOf('\n', cursor)
  const end = lineEnd === -1 ? content.length : lineEnd

  const continuation = resolveListContinuation(content, end)
  if (continuation) return continuation

  return {
    content: content.slice(0, end) + '\n' + content.slice(end),
    cursor: end + 1,
  }
}
