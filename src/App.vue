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
import { isNoteListToggleShortcut } from './utils/keyboardShortcut'
import { initializeAppSettings } from './composables/useAppSettings'

const { toasts, show } = useToast()
const noteListPanel = useNoteListPanel()
let removeCloseListener: (() => void) | null = null
let removeKeyListener: (() => void) | null = null

function handleGlobalKeydown(event: KeyboardEvent): void {
  // Ctrl+B or Cmd+B: toggle the note list.
  if (isNoteListToggleShortcut(event)) {
    event.preventDefault()
    noteListPanel.toggle()
  }
}

onMounted(() => {
  void initializeAppSettings()
    .then((warning) => {
      if (warning) show(warning, 'error')
    })
    .catch((err) => {
      show('读取偏好设置失败，已使用安全默认值。', 'error')
      console.error('Failed to initialize app settings:', err)
    })
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
  --color-surface-soft: #fafbfc;
  --color-surface-muted: #f8f9fb;
  --color-control-bg: #ffffff;
  --color-hover: #eef1f5;
  --color-active: #eaf2fd;
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
  --color-heading: #111827;
  --color-code-bg: #f3f4f6;
  --color-code-text: #e11d48;
  --color-quote-bg: #f9fafb;
  --color-quote-text: #4b5563;
  --color-overlay: rgba(15, 23, 42, 0.42);
  --color-drop-overlay: rgba(243, 248, 255, 0.88);
  --color-scrollbar: #d1d5db;
  --color-scrollbar-hover: #9ca3af;
  --color-selection: rgba(74, 158, 255, 0.2);
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 18px 48px rgba(15, 23, 42, 0.2);
  --transition: 0.2s ease;
}

:root[data-theme="dark"] {
  --color-bg: #111827;
  --color-surface: #18212f;
  --color-surface-soft: #1d2736;
  --color-surface-muted: #141d2a;
  --color-control-bg: #111a27;
  --color-hover: #263244;
  --color-active: #213a59;
  --color-border: #334155;
  --color-text: #e5e7eb;
  --color-text-secondary: #c0cad8;
  --color-text-muted: #8997aa;
  --color-primary: #67adff;
  --color-primary-hover: #85bdff;
  --color-danger: #fb7185;
  --color-danger-bg: #3a1f2a;
  --color-success: #4ade80;
  --color-warning: #fbbf24;
  --color-heading: #f8fafc;
  --color-code-bg: #101826;
  --color-code-text: #fda4af;
  --color-quote-bg: #202b3a;
  --color-quote-text: #cbd5e1;
  --color-overlay: rgba(0, 0, 0, 0.62);
  --color-drop-overlay: rgba(17, 24, 39, 0.9);
  --color-scrollbar: #475569;
  --color-scrollbar-hover: #64748b;
  --color-selection: rgba(103, 173, 255, 0.28);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.28);
  --shadow-md: 0 3px 12px rgba(0, 0, 0, 0.32);
  --shadow-lg: 0 18px 54px rgba(0, 0, 0, 0.48);
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
  background-color: var(--color-scrollbar);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-scrollbar-hover);
}

/* Selection */
::selection {
  background-color: var(--color-selection);
}
</style>
