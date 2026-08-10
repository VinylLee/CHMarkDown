const PLAIN_TEXT_EXTENSION = /\.(txt|json)$/i

/**
 * 判断外部文件是否应按纯文本展示（TXT/JSON 不进行 Markdown 渲染）。
 */
export function isPlainTextFilePath(filePath: string): boolean {
  return PLAIN_TEXT_EXTENSION.test(filePath)
}

/**
 * 转义 HTML 特殊字符，使纯文本内容能安全地进入预览 DOM。
 */
export function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
