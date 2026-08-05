export type DocumentCloseRange = 'above' | 'below' | 'others'

/**
 * 计算范围关闭操作涉及的目标文档 ID 列表。
 *
 * - above：目标上方的所有文档
 * - below：目标下方的所有文档
 * - others：除目标外的所有文档
 */
export function resolveCloseRangeTargets(
  documentOrder: string[],
  range: DocumentCloseRange,
  targetId: string,
): string[] {
  const index = documentOrder.indexOf(targetId)
  if (index < 0) return []
  if (range === 'above') return documentOrder.slice(0, index)
  if (range === 'below') return documentOrder.slice(index + 1)
  return documentOrder.filter((id) => id !== targetId)
}
