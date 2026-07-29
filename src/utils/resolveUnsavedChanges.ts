import type { ConfirmResult } from '../composables/useConfirm'

interface ResolveUnsavedChangesOptions {
  dirty: boolean
  choose: () => Promise<ConfirmResult>
  save: () => Promise<boolean>
}

export async function resolveUnsavedChanges(
  options: ResolveUnsavedChangesOptions
): Promise<boolean> {
  if (!options.dirty) return true

  const result = await options.choose()
  if (result === 'secondary') return true
  if (result === 'confirm') return options.save()
  return false
}
