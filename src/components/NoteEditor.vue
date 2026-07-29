<template>
  <div class="note-editor" v-if="note">
    <div class="editor-toolbar">
      <input
        v-model="editTitle"
        class="input-title"
        placeholder="笔记标题"
        maxlength="200"
        @input="markDirty"
        @keydown.enter.prevent="handleSave"
      />

      <div class="toolbar-actions">
        <button
          class="btn-tool btn-tool--primary"
          @click="toggleEditingMode"
          :title="isEditing ? '切换为纯预览' : '切换为分栏编辑'"
        >
          <svg v-if="isEditing" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="6" cy="6" r="1.5" fill="currentColor"/>
          </svg>
          <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 9L5 2L8 9H2Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" opacity="0.3"/>
            <rect x="1.5" y="9.5" width="9" height="1.5" rx="0.75" fill="currentColor"/>
          </svg>
          {{ isEditing ? '预览模式' : '编辑' }}
        </button>

        <span class="toolbar-sep"></span>

        <button class="btn-tool" @click="handleInsertImage" title="插入图片">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
            <circle cx="4.5" cy="5.5" r="1.2" stroke="currentColor" stroke-width="1"/>
            <path d="M1.5 10L4.5 7L8 10L10 7.5L12.5 10" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
          </svg>
          插图片
        </button>

        <button
          class="btn-tool btn-tool--save"
          @click="handleSave"
          :disabled="!isDirty || isSaving"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {{ isSaving ? '保存中…' : isDirty ? '保存 *' : '已保存' }}
        </button>

        <span class="toolbar-sep"></span>

        <button class="btn-tool" @click="handleExport" title="导出笔记">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1.5V8M6 8L3.5 5.5M6 8L8.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 10H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          导出
        </button>

        <button class="btn-tool btn-tool--danger" @click="handleDelete" title="删除">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 3.5H10M4.5 5V8.5M7.5 5V8.5M3 3.5L3.8 10.5H8.2L9 3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <Transition name="image-tools">
      <ImageSizeControl
        v-if="selectedImageIndex !== null"
        :model-value="selectedImageWidth"
        @update:model-value="handleImageWidthChange"
        @close="clearImageSelection"
      />
    </Transition>

    <!-- Split view: editing mode -->
    <div v-if="isEditing" class="editor-body editor-body--split">
      <div class="editor-pane editor-pane--edit">
        <div class="pane-label">Markdown</div>
        <textarea
          ref="textareaRef"
          v-model="editContent"
          class="content-textarea"
          placeholder="使用 Markdown 记录你的灵感…&#10;&#10;# 标题&#10;**加粗** *斜体*&#10;- 列表项&#10;> 引用&#10;`代码`&#10;&#10;支持 Ctrl+V 粘贴图片"
          @input="handleContentInput"
          @paste="handlePaste"
        ></textarea>
      </div>

      <div class="editor-divider"></div>

      <div class="editor-pane editor-pane--preview">
        <div class="pane-label pane-label--preview">
          <span>预览</span>
          <span class="pane-hint">点击图片可调整大小</span>
        </div>
        <div class="content-preview" v-html="renderedMarkdown" @click="handlePreviewClick"></div>
      </div>
    </div>

    <!-- Full-width preview: reading mode -->
    <div v-else class="editor-body editor-body--preview">
      <div
        class="content-preview content-preview--full"
        v-html="renderedMarkdown"
        @click="handlePreviewClick"
      ></div>
    </div>
  </div>

  <div v-else class="editor-empty">
    <div class="empty-content">
      <div class="empty-logo">📒</div>
      <p class="empty-title">选择或新建一篇笔记</p>
      <p class="empty-desc">在左侧列表中点击笔记，或点击「新建笔记」开始记录灵感</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import { useConfirm } from '../composables/useConfirm'
import ImageSizeControl from './ImageSizeControl.vue'
import {
  configureMarkdownImageSizing,
  createFlowdeskImageHtml,
  findResizableMarkdownImages,
  updateMarkdownImageWidth,
} from '../utils/markdownImageSize'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})
configureMarkdownImageSizing(md)

const ALLOWED_URI_REGEXP = /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|flowdesk):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i

const props = defineProps<{
  note: Note | null
  startInEditMode?: boolean
  saveNote: (data: { id: string; title: string; content: string }) => Promise<boolean>
}>()

const emit = defineEmits<{
  delete: [id: string]
}>()

const editTitle = ref('')
const editContent = ref('')
const isDirty = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const selectedImageIndex = ref<number | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const { requestConfirm } = useConfirm()
let pendingSave: Promise<boolean> | null = null

const renderedMarkdown = computed(() => {
  const raw = md.render(editContent.value || '', {
    selectedImageIndex: selectedImageIndex.value,
  })
  return DOMPurify.sanitize(raw, {
    ALLOWED_URI_REGEXP,
    ADD_ATTR: ['style', 'data-image-index', 'data-image-width'],
  })
})

const selectedImageWidth = computed(() => {
  if (selectedImageIndex.value === null) return null
  return findResizableMarkdownImages(editContent.value)[selectedImageIndex.value]?.width ?? null
})

watch(
  () => props.note,
  (newNote, oldNote) => {
    // Only reset when the user actually switches to a different note.
    // Prevents accidental overwrites when the parent updates the note object
    // in-place (e.g. after saving).
    if (newNote && newNote.id !== oldNote?.id) {
      editTitle.value = newNote.title
      editContent.value = newNote.content
      isDirty.value = false
      isEditing.value = props.startInEditMode ?? false
      selectedImageIndex.value = null
      if (props.startInEditMode) {
        nextTick(() => textareaRef.value?.focus())
      }
    }
  },
  { immediate: true }
)

function markDirty(): void {
  isDirty.value = true
}

function handleContentInput(): void {
  markDirty()
  clearImageSelection()
}

function toggleEditingMode(): void {
  isEditing.value = !isEditing.value
}

function clearImageSelection(): void {
  selectedImageIndex.value = null
}

function handlePreviewClick(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof HTMLImageElement)) {
    clearImageSelection()
    return
  }

  const imageIndex = Number(target.dataset.imageIndex)
  if (!Number.isInteger(imageIndex) || imageIndex < 0) {
    clearImageSelection()
    return
  }

  selectedImageIndex.value = imageIndex
}

function handleImageWidthChange(width: number | null): void {
  if (selectedImageIndex.value === null) return

  const updatedContent = updateMarkdownImageWidth(
    editContent.value,
    selectedImageIndex.value,
    width
  )
  if (updatedContent === editContent.value) return

  editContent.value = updatedContent
  markDirty()
}

function selectLastImage(): void {
  const images = findResizableMarkdownImages(editContent.value)
  selectedImageIndex.value = images.length > 0 ? images.length - 1 : null
}

async function performSave(): Promise<boolean> {
  if (!props.note) return false

  const titleSnapshot = editTitle.value
  const contentSnapshot = editContent.value
  isSaving.value = true

  try {
    const saved = await props.saveNote({
      id: props.note.id,
      title: titleSnapshot.trim() || '未命名笔记',
      content: contentSnapshot,
    })

    if (
      saved &&
      editTitle.value === titleSnapshot &&
      editContent.value === contentSnapshot
    ) {
      isDirty.value = false
    }
    return saved
  } finally {
    isSaving.value = false
  }
}

async function handleSave(): Promise<boolean> {
  if (!props.note) return false
  if (!isDirty.value) return true

  if (pendingSave) {
    const saved = await pendingSave
    if (!saved) return false
    return isDirty.value ? handleSave() : true
  }

  pendingSave = performSave().finally(() => {
    pendingSave = null
  })
  return pendingSave
}

async function handleInsertImage(): Promise<void> {
  if (!isEditing.value) {
    isEditing.value = true
    await nextTick()
  }
  try {
    const imageUrl = await window.electronAPI.notes.uploadImage()
    if (imageUrl) {
      editContent.value += `\n${createFlowdeskImageHtml(imageUrl)}\n`
      isDirty.value = true
      selectLastImage()
    }
  } catch (err) {
    console.error('Failed to upload image:', err)
  }
}

async function handlePaste(e: ClipboardEvent): Promise<void> {
  const items = e.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (!file) continue
      try {
        const buffer = await file.arrayBuffer()
        const imageUrl = await window.electronAPI.notes.pasteImage(buffer, file.type)
        editContent.value += `\n${createFlowdeskImageHtml(imageUrl)}\n`
        isDirty.value = true
        selectLastImage()
      } catch (err) {
        console.error('Failed to paste image:', err)
      }
      return
    }
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && selectedImageIndex.value !== null) {
    clearImageSelection()
    return
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    void handleSave()
  }
}

async function handleExport(): Promise<void> {
  if (!props.note) return
  if (isDirty.value) {
    const result = await requestConfirm({
      title: '保存后导出',
      message: '当前笔记有未保存的修改，需要先保存才能导出最新内容。',
      confirmText: '保存并导出',
      cancelText: '取消',
    })
    if (result !== 'confirm') return
    if (!(await handleSave())) return
  }
  try {
    const savedPath = await window.electronAPI.notes.exportNote(props.note.id, props.note.title)
    if (savedPath) {
      // Show brief feedback — the path where it was saved
      console.log('Exported to:', savedPath)
    }
  } catch (err) {
    console.error('Failed to export note:', err)
  }
}

async function handleDelete(): Promise<void> {
  if (!props.note) return
  const result = await requestConfirm({
    title: '删除笔记',
    message: '删除后无法恢复，确定要继续吗？',
    confirmText: '删除',
    cancelText: '取消',
    danger: true,
  })
  if (result === 'confirm') {
    emit('delete', props.note.id)
  }
}

defineExpose({ isDirty, save: handleSave })

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.note-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #ffffff;
}

/* ── Toolbar ── */

.editor-toolbar {
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  background: #fafbfc;
  flex-shrink: 0;
}

.input-title {
  flex: 1;
  min-width: 120px;
  padding: 5px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 600;
  outline: none;
  background: transparent;
  color: var(--color-text);
  transition: all var(--transition);
}

.input-title:focus {
  border-color: var(--color-border);
  background: #ffffff;
}

.input-title::placeholder {
  color: var(--color-text-muted);
  font-weight: 400;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-tool {
  padding: 5px 9px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: #ffffff;
  color: var(--color-text-secondary);
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all var(--transition);
  white-space: nowrap;
  font-weight: 500;
}

.btn-tool:hover {
  border-color: #c0c7d0;
  color: var(--color-text);
}

.btn-tool--primary {
  color: var(--color-primary);
  border-color: var(--color-primary);
  font-weight: 600;
}

.btn-tool--primary:hover {
  background: var(--color-primary);
  color: #ffffff;
}

.btn-tool--save {
  color: var(--color-primary);
  border-color: var(--color-primary);
  font-weight: 600;
}

.btn-tool--save:hover:not(:disabled) {
  background: var(--color-primary);
  color: #ffffff;
}

.btn-tool--save:disabled {
  opacity: 0.5;
  cursor: default;
}

.btn-tool--danger:hover {
  background: var(--color-danger-bg);
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.toolbar-sep {
  width: 1px;
  height: 22px;
  background: var(--color-border);
  margin: 0 2px;
}

/* ── Body ── */

.editor-body {
  flex: 1;
  overflow: hidden;
  display: flex;
}

.editor-body--split {
  /* split panes */
}

.editor-body--preview {
  /* full-width preview */
}

.editor-pane {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.pane-label {
  flex-shrink: 0;
  padding: 4px 16px;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  background: #fafbfc;
  border-bottom: 1px solid var(--color-border);
  user-select: none;
}

.pane-label--preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pane-hint {
  color: #b1bac7;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}

.editor-divider {
  width: 1px;
  background: var(--color-border);
  flex-shrink: 0;
}

/* ── Edit pane ── */

.content-textarea {
  flex: 1;
  padding: 16px 18px;
  border: none;
  outline: none;
  resize: none;
  font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", "Consolas", monospace;
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--color-text);
  background: #ffffff;
  tab-size: 2;
}

.content-textarea::placeholder {
  color: #d0d5dd;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
  font-size: 12.5px;
  line-height: 2;
}

/* ── Preview pane ── */

.content-preview {
  flex: 1;
  padding: 16px 20px;
  overflow-y: auto;
  line-height: 1.85;
  color: var(--color-text);
  font-size: 14px;
}

.content-preview--full {
  max-width: 820px;
  margin: 0 auto;
  padding: 24px 32px;
}

/* Markdown styles */
.content-preview :deep(h1) { font-size: 1.6em; font-weight: 700; margin: 0.8em 0 0.4em; color: #111827; }
.content-preview :deep(h2) { font-size: 1.3em; font-weight: 600; margin: 0.7em 0 0.3em; color: #1f2937; }
.content-preview :deep(h3) { font-size: 1.1em; font-weight: 600; margin: 0.6em 0 0.25em; color: #374151; }
.content-preview :deep(p) { margin: 0.4em 0; }
.content-preview :deep(blockquote) {
  border-left: 3px solid var(--color-primary);
  padding: 4px 16px;
  margin: 0.6em 0;
  color: #4b5563;
  background: #f9fafb;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}
.content-preview :deep(code) {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: "Cascadia Code", "Fira Code", "Consolas", monospace;
  font-size: 0.88em;
  color: #e11d48;
}
.content-preview :deep(pre) {
  background: #1e1e2e;
  color: #cdd6f4;
  padding: 14px 18px;
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: 0.6em 0;
  line-height: 1.6;
}
.content-preview :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
  font-size: 0.9em;
}
.content-preview :deep(ul), .content-preview :deep(ol) { padding-left: 1.5em; margin: 0.3em 0; }
.content-preview :deep(li) { margin: 0.1em 0; }
.content-preview :deep(a) { color: var(--color-primary); text-decoration: underline; text-underline-offset: 2px; }
.content-preview :deep(img) { max-width: 100%; height: auto; border-radius: var(--radius-sm); margin: 8px 0; box-shadow: var(--shadow-sm); }
.content-preview :deep(.flowdesk-resizable-image) {
  cursor: pointer;
  outline: 2px solid transparent;
  outline-offset: 3px;
  transition: outline-color 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;
}
.content-preview :deep(.flowdesk-resizable-image:hover) {
  outline-color: rgba(74, 158, 255, 0.34);
  box-shadow: 0 4px 14px rgba(43, 110, 181, 0.15);
  filter: saturate(1.03);
}
.content-preview :deep(.flowdesk-resizable-image--selected) {
  outline-color: var(--color-primary);
  box-shadow: 0 5px 18px rgba(43, 110, 181, 0.2);
}
.content-preview :deep(hr) { border: none; border-top: 1px solid var(--color-border); margin: 1em 0; }
.content-preview :deep(table) { border-collapse: collapse; width: 100%; margin: 0.6em 0; }
.content-preview :deep(th), .content-preview :deep(td) { border: 1px solid var(--color-border); padding: 5px 10px; text-align: left; font-size: 13px; }
.content-preview :deep(th) { background: #f9fafb; font-weight: 600; }

.image-tools-enter-active,
.image-tools-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.image-tools-enter-from,
.image-tools-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ── Empty state ── */

.editor-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
}

.empty-content {
  text-align: center;
  padding: 40px;
}

.empty-logo {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.6;
}

.empty-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.empty-desc {
  font-size: 13px;
  color: var(--color-text-muted);
  max-width: 240px;
  line-height: 1.5;
}
</style>
