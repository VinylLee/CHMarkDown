export type DocumentDropPlacement = 'before' | 'after'

/**
 * 把 sourceId 移动到 targetId 的前面或后面，返回新的文档顺序。
 *
 * 其余文档的相对顺序保持不变。
 */
export function moveDocumentInOrder(
  documentOrder: string[],
  sourceId: string,
  targetId: string,
  placement: DocumentDropPlacement,
): string[] {
  const from = documentOrder.indexOf(sourceId)
  const to = documentOrder.indexOf(targetId)
  if (from < 0 || to < 0 || from === to) return documentOrder

  const next = documentOrder.filter((id) => id !== sourceId)
  const targetIndex = next.indexOf(targetId)
  const insertAt = placement === 'before' ? targetIndex : targetIndex + 1
  next.splice(insertAt, 0, sourceId)
  return next
}
