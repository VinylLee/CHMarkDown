import { reactive, readonly } from 'vue'

export type ConfirmResult = 'confirm' | 'secondary' | 'cancel'

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  secondaryText?: string
  cancelText?: string
  danger?: boolean
}

export interface ConfirmState {
  visible: boolean
  title: string
  message: string
  confirmText: string
  secondaryText: string
  cancelText: string
  danger: boolean
}

const defaultState: ConfirmState = {
  visible: false,
  title: '',
  message: '',
  confirmText: '确定',
  secondaryText: '',
  cancelText: '取消',
  danger: false,
}

const state = reactive<ConfirmState>({ ...defaultState })
const readonlyState = readonly(state)
let activeResolver: ((result: ConfirmResult) => void) | null = null

function clearState(): void {
  Object.assign(state, defaultState)
}

function resolveConfirm(result: ConfirmResult): void {
  const resolver = activeResolver
  activeResolver = null
  clearState()
  resolver?.(result)
}

function requestConfirm(options: ConfirmOptions): Promise<ConfirmResult> {
  resolveConfirm('cancel')
  Object.assign(state, defaultState, options, { visible: true })

  return new Promise((resolve) => {
    activeResolver = resolve
  })
}

export function useConfirm() {
  return {
    state: readonlyState,
    requestConfirm,
    resolveConfirm,
  }
}
