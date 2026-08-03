export const LINE_CLIPBOARD_MIME = 'application/x-chmarkdown-line'

export interface LineClipboardPayload {
  start: number
  end: number
  text: string
}

export interface LineClipboardEdit {
  content: string
  cursor: number
}

function clampCursor(content: string, cursor: number): number {
  return Math.min(content.length, Math.max(0, cursor))
}

function findLineStart(content: string, cursor: number): number {
  return content.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1
}

export function getLineClipboardPayload(
  content: string,
  cursor: number,
): LineClipboardPayload {
  const position = clampCursor(content, cursor)
  const start = findLineStart(content, position)
  const newlineIndex = content.indexOf('\n', position)
  const lineEnd = newlineIndex === -1 ? content.length : newlineIndex

  return {
    start,
    end: newlineIndex === -1 ? content.length : newlineIndex + 1,
    text: `${content.slice(start, lineEnd)}\n`,
  }
}

export function cutCurrentLine(content: string, cursor: number): LineClipboardEdit {
  const line = getLineClipboardPayload(content, cursor)

  if (line.end > line.start && content[line.end - 1] === '\n') {
    return {
      content: `${content.slice(0, line.start)}${content.slice(line.end)}`,
      cursor: line.start,
    }
  }

  if (line.start > 0) {
    return {
      content: `${content.slice(0, line.start - 1)}${content.slice(line.end)}`,
      cursor: line.start - 1,
    }
  }

  return { content: '', cursor: 0 }
}

export function pasteLineAbove(
  content: string,
  cursor: number,
  clipboardText: string,
): LineClipboardEdit {
  const position = clampCursor(content, cursor)
  const lineStart = findLineStart(content, position)
  const lineText = clipboardText.endsWith('\n')
    ? clipboardText
    : `${clipboardText}\n`

  return {
    content: `${content.slice(0, lineStart)}${lineText}${content.slice(lineStart)}`,
    cursor: position + lineText.length,
  }
}
