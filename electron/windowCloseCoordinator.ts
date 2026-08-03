export interface CloseEventLike {
  preventDefault: () => void
}

interface WindowCloseCoordinatorOptions {
  requestCloseCheck: (requestId: number) => void
  closeWindow: () => void
  onDecision?: (allowClose: boolean) => void
}

export function createWindowCloseCoordinator(options: WindowCloseCoordinatorOptions) {
  let nextRequestId = 1
  let pendingRequestId: number | null = null
  let allowNextClose = false

  function handleClose(event: CloseEventLike): void {
    if (allowNextClose) {
      allowNextClose = false
      return
    }

    event.preventDefault()
    if (pendingRequestId !== null) return

    pendingRequestId = nextRequestId
    nextRequestId += 1
    options.requestCloseCheck(pendingRequestId)
  }

  function handleDecision(requestId: number, allowClose: boolean): void {
    if (requestId !== pendingRequestId) return

    pendingRequestId = null
    options.onDecision?.(allowClose)
    if (!allowClose) return

    allowNextClose = true
    options.closeWindow()
  }

  function cancelPendingRequest(): void {
    pendingRequestId = null
  }

  return {
    handleClose,
    handleDecision,
    cancelPendingRequest,
  }
}
