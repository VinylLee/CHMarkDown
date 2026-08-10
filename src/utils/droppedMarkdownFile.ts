export interface DroppedFileLike {
  name: string
}

export type DroppedMarkdownResult =
  | { status: 'ok'; filePath: string }
  | { status: 'unsupported' }
  | { status: 'missing-path' }

export function getDroppedMarkdownFilePath<T extends DroppedFileLike>(
  files: Iterable<T>,
  getFilePath: (file: T) => string,
): DroppedMarkdownResult {
  const markdownFile = Array.from(files).find((file) => /\.(md|markdown|txt|json)$/i.test(file.name))
  if (!markdownFile) return { status: 'unsupported' }

  try {
    const filePath = getFilePath(markdownFile)
    if (!filePath) return { status: 'missing-path' }
    return { status: 'ok', filePath }
  } catch {
    return { status: 'missing-path' }
  }
}
