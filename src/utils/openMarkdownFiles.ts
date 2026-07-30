export interface OpenMarkdownFile extends MarkdownFileDocument {
  id: string
  openedAt: string
}

export function createOpenMarkdownFile(
  document: MarkdownFileDocument,
  openedAt = new Date().toISOString()
): OpenMarkdownFile {
  return {
    ...document,
    id: `file:${document.filePath.toLowerCase()}`,
    openedAt,
  }
}

export function upsertOpenMarkdownFile(
  files: OpenMarkdownFile[],
  document: MarkdownFileDocument,
  openedAt = new Date().toISOString()
): OpenMarkdownFile[] {
  const openedFile = createOpenMarkdownFile(document, openedAt)
  const existingIndex = files.findIndex((file) => file.id === openedFile.id)

  if (existingIndex === -1) {
    return [...files, openedFile]
  }

  const updatedFiles = [...files]
  updatedFiles[existingIndex] = openedFile
  return updatedFiles
}

export function replaceOpenMarkdownFile(
  files: OpenMarkdownFile[],
  previousId: string | null,
  document: MarkdownFileDocument,
  openedAt = new Date().toISOString()
): OpenMarkdownFile[] {
  const remainingFiles = previousId
    ? files.filter((file) => file.id !== previousId)
    : files
  return upsertOpenMarkdownFile(remainingFiles, document, openedAt)
}

export function removeOpenMarkdownFile(
  files: OpenMarkdownFile[],
  id: string
): OpenMarkdownFile[] {
  return files.filter((file) => file.id !== id)
}
