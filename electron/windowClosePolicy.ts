export type WindowCloseAction = 'allow' | 'hide' | 'confirm'

export interface WindowCloseState {
  systemSessionEnding: boolean
  quitting: boolean
  trayAvailable: boolean
  rendererReady: boolean
}

export function resolveWindowCloseAction(state: WindowCloseState): WindowCloseAction {
  if (state.systemSessionEnding) return 'allow'
  if (!state.quitting && state.trayAvailable) return 'hide'
  return state.rendererReady ? 'confirm' : 'allow'
}
