export type AppCloseGuard = () => Promise<boolean>

let activeGuard: AppCloseGuard | null = null

export function registerAppCloseGuard(guard: AppCloseGuard): () => void {
  activeGuard = guard

  return () => {
    if (activeGuard === guard) {
      activeGuard = null
    }
  }
}

export function runAppCloseGuard(): Promise<boolean> {
  return activeGuard?.() ?? Promise.resolve(true)
}
