export interface CoalescedTaskOptions {
  delayMs: number
  maxWaitMs: number
}

export interface CoalescedTask {
  schedule: () => void
  flush: () => void
  cancel: () => void
  pending: () => boolean
}

/**
 * 合并短时间内重复触发的昂贵任务，同时用 maxWait 保证连续输入期间仍会更新。
 */
export function createCoalescedTask(
  callback: () => void,
  options: CoalescedTaskOptions,
): CoalescedTask {
  const delayMs = Math.max(0, options.delayMs)
  const maxWaitMs = Math.max(delayMs, options.maxWaitMs)
  let delayTimer: ReturnType<typeof setTimeout> | null = null
  let maxWaitTimer: ReturnType<typeof setTimeout> | null = null

  function clearTimers(): void {
    if (delayTimer !== null) clearTimeout(delayTimer)
    if (maxWaitTimer !== null) clearTimeout(maxWaitTimer)
    delayTimer = null
    maxWaitTimer = null
  }

  function run(): void {
    if (delayTimer === null && maxWaitTimer === null) return
    clearTimers()
    callback()
  }

  function schedule(): void {
    if (delayTimer !== null) clearTimeout(delayTimer)
    delayTimer = setTimeout(run, delayMs)
    if (maxWaitTimer === null) {
      maxWaitTimer = setTimeout(run, maxWaitMs)
    }
  }

  return {
    schedule,
    flush: run,
    cancel: clearTimers,
    pending: () => delayTimer !== null || maxWaitTimer !== null,
  }
}
