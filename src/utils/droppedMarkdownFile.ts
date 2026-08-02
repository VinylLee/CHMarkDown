export interface DroppedFileLike {
  name: string
  path?: string
}

export type DroppedMarkdownResult =
  | { status: 'ok'; filePath: string }
  | { status: 'unsupported' }
  | { status: 'missing-path' }

export function getDroppedMarkdownFilePath(
  files: Iterable<DroppedFileLike>,
): DroppedMarkdownResult {
  const markdownFile = Array.from(files).find((file) => /\.(md|markdown)$/i.test(file.name))
  if (!markdownFile) return { status: 'unsupported' }
  if (!markdownFile.path) return { status: 'missing-path' }
  return { status: 'ok', filePath: markdownFile.path }
}
