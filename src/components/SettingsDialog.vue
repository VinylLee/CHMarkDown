<template>
  <div v-if="open" class="settings-backdrop" @mousedown.self="emit('close')">
    <form class="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" @submit.prevent="submit" @keydown="handleKeydown">
      <div class="settings-header">
        <div>
          <h2 id="settings-title">编辑器偏好设置</h2>
          <p>修改后保存，当前窗口会立即应用。</p>
        </div>
        <button type="button" class="icon-button" aria-label="关闭设置" @click="emit('close')">×</button>
      </div>

      <div class="settings-grid">
        <label class="setting-field">
          <span>界面主题</span>
          <select ref="themeSelectRef" v-model="draft.theme">
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </label>

        <label class="setting-field">
          <span>编辑器字体</span>
          <select v-model="draft.editorFontFamily">
            <option value="Cascadia Code">Cascadia Code</option>
            <option value="Consolas">Consolas</option>
            <option value="Microsoft YaHei">微软雅黑</option>
            <option value="system-ui">系统界面字体</option>
          </select>
        </label>

        <label class="setting-field">
          <span>编辑器字号</span>
          <div class="range-field">
            <input v-model.number="draft.editorFontSize" type="range" min="12" max="24" step="1" />
            <output>{{ draft.editorFontSize }} px</output>
          </div>
        </label>

        <label class="setting-field">
          <span>默认打开模式</span>
          <select v-model="draft.defaultEditorMode">
            <option value="edit">仅编辑</option>
            <option value="split">分栏</option>
            <option value="preview">仅预览</option>
          </select>
        </label>

        <label class="setting-field">
          <span>图片资源目录名称</span>
          <input v-model="draft.imageDirectoryName" type="text" maxlength="64" autocomplete="off" placeholder="images" />
          <small>只影响外部 Markdown 后续插入或粘贴的图片。</small>
        </label>

        <label class="toggle-field">
          <span>
            <strong>编辑器自动换行</strong>
            <small>关闭后可水平滚动查看长行。</small>
          </span>
          <input v-model="draft.wordWrap" type="checkbox" />
        </label>

        <label class="toggle-field">
          <span>
            <strong>显示托盘图标</strong>
            <small>开启后关闭窗口会隐藏到系统托盘；关闭后会正常退出。</small>
          </span>
          <input v-model="draft.showTrayIcon" type="checkbox" />
        </label>
      </div>

      <p v-if="validationError" class="settings-error">{{ validationError }}</p>

      <div class="settings-actions">
        <button type="button" class="button button--secondary" @click="emit('close')">取消</button>
        <button type="submit" class="button button--primary" :disabled="saving">
          {{ saving ? '保存中…' : '保存设置' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { nextTick, reactive, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  settings: AppSettings
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [settings: AppSettings]
}>()

const draft = reactive<AppSettings>({ ...props.settings })
const validationError = ref('')
const themeSelectRef = ref<HTMLSelectElement | null>(null)
const INVALID_DIRECTORY_CHARACTER = /[<>:"/\\|?*\u0000-\u001f]/
const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i

watch(
  () => props.open,
  (open) => {
    if (!open) return
    Object.assign(draft, props.settings)
    validationError.value = ''
    void nextTick(() => themeSelectRef.value?.focus())
  },
)

function handleKeydown(event: KeyboardEvent): void {
  event.stopPropagation()
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
}

function submit(): void {
  const directoryName = draft.imageDirectoryName.trim()
  if (
    !directoryName ||
    directoryName === '.' ||
    directoryName === '..' ||
    directoryName.endsWith('.') ||
    INVALID_DIRECTORY_CHARACTER.test(directoryName) ||
    WINDOWS_RESERVED_NAME.test(directoryName)
  ) {
    validationError.value = '图片资源目录只能使用一个安全的文件夹名称。'
    return
  }
  validationError.value = ''
  emit('save', { ...draft, imageDirectoryName: directoryName })
}
</script>

<style scoped>
.settings-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--color-overlay);
}

.settings-dialog {
  width: min(560px, 100%);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-lg);
}

.settings-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--color-border);
}

.settings-header h2 {
  font-size: 17px;
  margin-bottom: 4px;
}

.settings-header p,
.setting-field small,
.toggle-field small {
  color: var(--color-text-muted);
  font-size: 11px;
}

.icon-button {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 20px;
  cursor: pointer;
}

.icon-button:hover {
  background: var(--color-hover);
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 20px 22px;
}

.setting-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.setting-field select,
.setting-field input[type='text'] {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  background: var(--color-control-bg);
  color: var(--color-text);
}

.setting-field select:focus,
.setting-field input[type='text']:focus {
  border-color: var(--color-primary);
}

.range-field {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 34px;
}

.range-field input {
  flex: 1;
  accent-color: var(--color-primary);
}

.range-field output {
  min-width: 42px;
  color: var(--color-text-secondary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.toggle-field {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--color-surface-soft);
}

.toggle-field span {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.toggle-field input {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
}

.settings-error {
  margin: -6px 22px 14px;
  color: var(--color-danger);
  font-size: 12px;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 22px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-soft);
}

.button {
  padding: 7px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.button--secondary {
  background: var(--color-control-bg);
  color: var(--color-text-secondary);
}

.button--primary {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #ffffff;
}

.button:disabled {
  opacity: 0.6;
  cursor: default;
}

@media (max-width: 620px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
