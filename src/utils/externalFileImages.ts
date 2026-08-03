const HTTP_PATTERN = /^https?:\/\//i
const CHMARKDOWN_PATTERN = /^chmarkdown:\/\//i
const ABSOLUTE_PATH_PATTERN = /^[a-zA-Z]:[\\/]/

export function isRelativeImagePath(source: string): boolean {
  if (!source) return false
  if (HTTP_PATTERN.test(source)) return false
  if (CHMARKDOWN_PATTERN.test(source)) return false
  if (ABSOLUTE_PATH_PATTERN.test(source)) return false
  if (source.startsWith('//')) return false
  if (source.startsWith('#')) return false
  if (source.startsWith('data:')) return false
  return true
}

const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g

function encodeImagePath(source: string): string {
  return source
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment))
      } catch {
        return encodeURIComponent(segment)
      }
    })
    .join('/')
}

export function transformExternalImagePaths(
  content: string,
  token: string | null,
): string {
  if (!token) return content

  MARKDOWN_IMAGE_PATTERN.lastIndex = 0
  return content.replace(
    MARKDOWN_IMAGE_PATTERN,
    (fullMatch, alt, source) => {
      const trimmedSource = source.trim()
      if (!isRelativeImagePath(trimmedSource)) return fullMatch
      return `![${alt}](chmarkdown-ext://${token}/${encodeImagePath(trimmedSource)})`
    },
  )
}
