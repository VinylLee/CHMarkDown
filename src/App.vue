<template>
  <div class="app-layout">
    <NotesView />
    <Toast :toasts="toasts" />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import NotesView from './views/NotesView.vue'
import Toast from './components/Toast.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import { useToast } from './composables/useToast'
import { useNoteListPanel } from './composables/useNoteListPanel'
import { runAppCloseGuard } from './composables/useAppCloseGuard'

const { toasts, show } = useToast()
const noteListPanel = useNoteListPanel()
let removeCloseListener: (() => void) | null = null
let removeKeyListener: (() => void) | null = null

function handleGlobalKeydown(event: KeyboardEvent): void {
  // Ctrl+Shift+B or Cmd+Shift+B: toggle the note list.
  if ((event.ctrlKey || event.metaKey) && event.key === 'B' && event.shiftKey) {
    event.preventDefault()
    noteListPanel.toggle()
  }
}

onMounted(() => {
  removeCloseListener = window.electronAPI.app.onCloseRequested(async (requestId) => {
    let allowClose = false
    try {
      allowClose = await runAppCloseGuard()
    } catch (err) {
      show('关闭前检查失败，应用将保持打开。', 'error')
      console.error('Failed to check whether the app can close:', err)
    }
    window.electronAPI.app.respondToClose(requestId, allowClose)
  })
  window.electronAPI.app.ready()

  window.addEventListener('keydown', handleGlobalKeydown)
  removeKeyListener = () => window.removeEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  removeCloseListener?.()
  removeKeyListener?.()
})
</script>

<style>
:root {
  --color-bg: #f3f4f6;
  --color-surface: #ffffff;
  --color-border: #e5e7eb;
  --color-text: #1f2937;
  --color-text-secondary: #6b7280;
  --color-text-muted: #9ca3af;
  --color-primary: #4a9eff;
  --color-primary-hover: #3a8eef;
  --color-danger: #ef4444;
  --color-danger-bg: #fef2f2;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --transition: 0.2s ease;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei",
    "PingFang SC", sans-serif;
  font-size: 14px;
  color: var(--color-text);
  background-color: var(--color-bg);
  -webkit-font-smoothing: antialiased;
}

#app {
  height: 100%;
}

.app-layout {
  display: flex;
  height: 100%;
  min-width: 0;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: #9ca3af;
}

/* Selection */
::selection {
  background-color: rgba(74, 158, 255, 0.2);
}
</style>
