const MARKDOWN_SYNTAX_PATTERN = /[#*>`\[\]!()~\-_]/g
const LINK_DESTINATION_PATTERN = /\[([^\]]*)\]\([^)]*\)/g
const CJK_CHARACTER_PATTERN = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g
const WORD_PATTERN = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g

/**
 * 统计当前文档的字数。
 *
 * 中文按字符计数，英文按单词计数；Markdown 语法符号和链接地址不计入。
 */
export function countDocumentWords(content: string): number {
  const withoutLinks = content.replace(LINK_DESTINATION_PATTERN, '$1')
  const plain = withoutLinks.replace(MARKDOWN_SYNTAX_PATTERN, ' ')
  const cjkCount = plain.match(CJK_CHARACTER_PATTERN)?.length ?? 0
  const wordCount = plain.match(WORD_PATTERN)?.length ?? 0
  return cjkCount + wordCount
}
