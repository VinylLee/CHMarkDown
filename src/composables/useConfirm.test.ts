import { beforeEach, describe, expect, it } from 'vitest'
import { useConfirm } from './useConfirm'

describe('useConfirm', () => {
  beforeEach(() => useConfirm().resolveConfirm('cancel'))

  it.each(['confirm', 'secondary', 'cancel'] as const)(
    'resolves %s and clears the active dialog',
    async (result) => {
      const { state, requestConfirm, resolveConfirm } = useConfirm()
      const pending = requestConfirm({
        title: '未保存修改',
        message: '请选择下一步操作',
        confirmText: '保存并离开',
        secondaryText: '放弃修改',
        cancelText: '取消',
      })

      expect(state.visible).toBe(true)
      resolveConfirm(result)

      await expect(pending).resolves.toBe(result)
      expect(state.visible).toBe(false)
    }
  )

  it('cancels the previous request when a new request replaces it', async () => {
    const { requestConfirm, resolveConfirm } = useConfirm()
    const first = requestConfirm({ title: '第一个', message: '第一个请求' })
    const second = requestConfirm({ title: '第二个', message: '第二个请求' })

    await expect(first).resolves.toBe('cancel')
    resolveConfirm('confirm')
    await expect(second).resolves.toBe('confirm')
  })
})
