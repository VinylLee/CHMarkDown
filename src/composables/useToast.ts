import { reactive } from 'vue'

export interface ToastMessage {
  id: number
  text: string
  type: 'success' | 'error'
}

const state = reactive<{ toasts: ToastMessage[] }>({
  toasts: [],
})

let nextId = 1

export function useToast() {
  function show(text: string, type: 'success' | 'error' = 'success'): void {
    const id = nextId++
    state.toasts.push({ id, text, type })
    setTimeout(() => {
      const index = state.toasts.findIndex((t) => t.id === id)
      if (index !== -1) {
        state.toasts.splice(index, 1)
      }
    }, 3000)
  }

  return { toasts: state.toasts, show }
}
