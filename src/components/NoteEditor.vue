<template>
  <div class="note-editor" v-if="note">
    <div class="editor-toolbar">
      <div class="document-heading">
        <input v-model="editTitle" class="input-title" placeholder="笔记标题" maxlength="200"
          :readonly="Boolean(documentPath)" :title="documentPath ?? undefined" @input="markDirty"
          @keydown.enter.prevent="handleSave" />
        <span v-if="documentPath" class="file-path" :title="documentPath">{{ documentPath }}</span>
      </div>

      <div class="toolbar-actions">
        <button class="btn-tool btn-tool--primary" @click="toggleEditingMode" :title="isEditing ? '切换为纯预览' : '切换为分栏编辑'">
          <svg v-if="isEditing" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.5" />
            <circle cx="6" cy="6" r="1.5" fill="currentColor" />
          </svg>
          <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 9L5 2L8 9H2Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" opacity="0.3" />
            <rect x="1.5" y="9.5" width="9" height="1.5" rx="0.75" fill="currentColor" />
          </svg>
          {{ isEditing ? '预览模式' : '编辑' }}
        </button>

        <button class="btn-tool" :class="{ 'btn-tool--active': searchOpen && !replaceVisible }" @click="openSearch(false)" title="查找当前文档 (Ctrl+F)">
          查找
        </button>

        <button class="btn-tool" :class="{ 'btn-tool--active': searchOpen && replaceVisible }" @click="openSearch(true)" title="查找并替换 (Ctrl+R)">
          替换
        </button>

        <button class="btn-tool" :class="{ 'btn-tool--active': outlineOpen }" @click="outlineOpen = !outlineOpen" title="显示或隐藏文档大纲">
          大纲
        </button>

        <span class="toolbar-sep"></span>

        <button class="btn-tool" @click="handleInsertImage" :disabled="Boolean(documentPath)"
          :title="documentPath ? '外部文件的图片插入将在后续版本支持' : '插入图片'">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3" />
            <circle cx="4.5" cy="5.5" r="1.2" stroke="currentColor" stroke-width="1" />
            <path d="M1.5 10L4.5 7L8 10L10 7.5L12.5 10" stroke="currentColor" stroke-width="1.3"
              stroke-linejoin="round" />
          </svg>
          插图片
        </button>

        <button class="btn-tool" :class="{ 'btn-tool--active': syncEnabled }" @click="syncEnabled = !syncEnabled"
          :title="syncEnabled ? '同步定位：开（Ctrl+点击预览/编辑区定位）' : '同步定位：关'">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="1.5" y="5" width="4" height="3" rx="0.6" stroke="currentColor" stroke-width="1.3" />
            <rect x="7.5" y="2" width="4" height="3" rx="0.6" stroke="currentColor" stroke-width="1.3" />
            <rect x="7.5" y="8" width="4" height="3" rx="0.6" stroke="currentColor" stroke-width="1.3" opacity="0.4" />
            <path d="M5.5 6.5L7.5 3.5M5.5 6.5L7.5 9.5" stroke="currentColor" stroke-width="1.1"
              stroke-linecap="round" />
          </svg>
          {{ syncEnabled ? '同步' : '不同步' }}
        </button>

        <button class="btn-tool btn-tool--save" @click="handleSave" :disabled="!isDirty || isSaving">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
              stroke-linejoin="round" />
          </svg>
          {{ isSaving ? '保存中…' : isDirty ? '保存 *' : '已保存' }}
        </button>

        <span v-if="!documentPath" class="toolbar-sep"></span>

        <button v-if="!documentPath" class="btn-tool" @click="handleExport" title="导出笔记">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1.5V8M6 8L3.5 5.5M6 8L8.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
              stroke-linejoin="round" />
            <path d="M2 10H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          导出
        </button>

        <button v-if="!documentPath" class="btn-tool btn-tool--danger" @click="handleDelete" title="删除">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 3.5H10M4.5 5V8.5M7.5 5V8.5M3 3.5L3.8 10.5H8.2L9 3.5" stroke="currentColor" stroke-width="1.2"
              stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </div>

    <DocumentSearchPanel
      v-if="searchOpen"
      ref="searchPanelRef"
      :query="searchQuery"
      :replacement="replacementText"
      :match-count="searchMatches.length"
      :current-match="currentMatchNumber"
      :case-sensitive="caseSensitive"
      :whole-word="wholeWord"
      :replace-visible="replaceVisible"
      :message="replaceMessage"
      @update:query="searchQuery = $event"
      @update:replacement="replacementText = $event"
      @update:case-sensitive="caseSensitive = $event"
      @update:whole-word="wholeWord = $event"
      @previous="navigateSearch(-1)"
      @next="navigateSearch(1)"
      @replace="handleReplaceCurrent"
      @replace-all="handleReplaceAll"
      @close="closeSearch"
    />

    <Transition name="image-tools">
      <ImageSizeControl v-if="selectedImageIndex !== null" :model-value="selectedImageWidth"
        @update:model-value="handleImageWidthChange" @close="clearImageSelection" />
    </Transition>

    <div class="editor-workspace">
      <!-- Split view: editing mode -->
      <div v-if="isEditing" class="editor-body editor-body--split">
      <div class="editor-pane editor-pane--edit">
        <div class="pane-label pane-label--preview">
          <span>Markdown</span>
          <span class="pane-hint">Ctrl+Click 定位</span>
        </div>
        
        <textarea ref="textareaRef" v-model="editContent" class="content-textarea"
          placeholder="使用 Markdown 记录你的灵感…&#10;&#10;# 标题&#10;**加粗** *斜体*&#10;- 列表项&#10;> 引用&#10;`代码`&#10;&#10;支持 Ctrl+V 粘贴图片"
          @input="handleContentInput" @paste="handlePaste" @click="handleEditorClick"></textarea>
      </div>

      <div class="editor-divider"></div>

      <div class="editor-pane editor-pane--preview">
        <div class="pane-label pane-label--preview">
          <span>预览</span>
          <span class="pane-hint">点击图片可调整大小</span>
        </div>
        <div ref="previewRef" class="content-preview" v-html="renderedMarkdown" @click="handlePreviewClick"></div>
      </div>
      </div>

      <!-- Full-width preview: reading mode -->
      <div v-else class="editor-body editor-body--preview">
        <div ref="previewRef" class="content-preview content-preview--full" v-html="renderedMarkdown"
          @click="handlePreviewClick"></div>
      </div>

      <DocumentOutline v-if="outlineOpen" :headings="outlineHeadings" @navigate="navigateToHeading" />
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
import DocumentSearchPanel from './DocumentSearchPanel.vue'
import DocumentOutline from './DocumentOutline.vue'
import {
  configureMarkdownImageSizing,
  createManagedImageHtml,
  findResizableMarkdownImages,
  updateMarkdownImageWidth,
} from '../utils/markdownImageSize'
import { configureMarkdownSourceMap, findSourceLine } from '../utils/markdownSourceMap'
import { useScrollSync } from '../composables/useScrollSync'
import {
  findAdjacentMatchIndex,
  findSelectedMatchIndex,
  findTextMatches,
  getContainedSelectionText,
  getSelectedSearchQuery,
  replaceAllTextMatches,
  replaceTextMatch,
} from '../utils/documentSearch'
import { extractMarkdownHeadings } from '../utils/markdownOutline'
import { resolveEditorShortcut } from '../utils/keyboardShortcut'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})
configureMarkdownImageSizing(md)
configureMarkdownSourceMap(md)

const ALLOWED_URI_REGEXP = /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|chmarkdown):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i

const props = defineProps<{
  note: Note | null
  documentPath?: string | null
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
const previewRef = ref<HTMLElement | null>(null)
const syncEnabled = ref(true)
const searchOpen = ref(false)
const replaceVisible = ref(false)
const outlineOpen = ref(false)
const searchQuery = ref('')
const replacementText = ref('')
const caseSensitive = ref(false)
const wholeWord = ref(false)
const currentMatchIndex = ref(0)
const replaceMessage = ref('')
const searchPanelRef = ref<InstanceType<typeof DocumentSearchPanel> | null>(null)
const { requestConfirm } = useConfirm()
const scrollSync = useScrollSync({
  textareaRef,
  previewRef,
  enabled: syncEnabled,
})
let pendingSave: Promise<boolean> | null = null
let editorSelection: {
  start: number
  end: number
  direction: 'forward' | 'backward' | 'none'
} | null = null

interface DocumentSearchSelection {
  query: string
  editorRange: { start: number; end: number } | null
}

const renderedMarkdown = computed(() => {
  const raw = md.render(editContent.value || '', {
    selectedImageIndex: selectedImageIndex.value,
  })
  return DOMPurify.sanitize(raw, {
    ALLOWED_URI_REGEXP,
    ADD_ATTR: ['style', 'data-image-index', 'data-image-width', 'data-source-line'],
  })
})

const selectedImageWidth = computed(() => {
  if (selectedImageIndex.value === null) return null
  return findResizableMarkdownImages(editContent.value)[selectedImageIndex.value]?.width ?? null
})

const searchMatches = computed(() => findTextMatches(editContent.value, searchQuery.value, {
  caseSensitive: caseSensitive.value,
  wholeWord: wholeWord.value,
}))

const currentMatchNumber = computed(() => {
  if (searchMatches.value.length === 0) return 0
  return Math.min(currentMatchIndex.value, searchMatches.value.length - 1) + 1
})

const outlineHeadings = computed(() => extractMarkdownHeadings(editContent.value))

watch(
  () => props.note,
  (newNote, oldNote) => {
    if (!newNote) {
      editTitle.value = ''
      editContent.value = ''
      isDirty.value = false
      selectedImageIndex.value = null
      return
    }

    // Only reset when the user actually switches to a different note.
    // Prevents accidental overwrites when the parent updates the note object
    // in-place (e.g. after saving).
    if (newNote.id !== oldNote?.id) {
      editTitle.value = newNote.title
      editContent.value = newNote.content
      isDirty.value = false
      isEditing.value = props.startInEditMode ?? false
      selectedImageIndex.value = null
      editorSelection = null
      currentMatchIndex.value = 0
      replaceMessage.value = ''
      if (props.startInEditMode) {
        nextTick(() => textareaRef.value?.focus())
      }
    }
  },
  { immediate: true }
)

watch([searchQuery, caseSensitive, wholeWord], () => {
  currentMatchIndex.value = 0
  replaceMessage.value = ''
})

function markDirty(): void {
  isDirty.value = true
}

function handleContentInput(): void {
  markDirty()
  clearImageSelection()
}

function normalizedMatchIndex(): number {
  const count = searchMatches.value.length
  if (count === 0) return 0
  return ((currentMatchIndex.value % count) + count) % count
}

async function revealSearchMatch(index: number): Promise<void> {
  const matches = searchMatches.value
  if (matches.length === 0) return
  const normalized = ((index % matches.length) + matches.length) % matches.length
  currentMatchIndex.value = normalized
  const match = matches[normalized]

  if (!isEditing.value) {
    isEditing.value = true
    await nextTick()
  }

  const textarea = textareaRef.value
  if (!textarea) return
  const line = editContent.value.slice(0, match.start).split('\n').length
  textarea.setSelectionRange(match.start, match.end)
  textarea.focus()
  scrollSync.scrollEditorToLine(line)
  scrollSync.scrollPreviewToLine(line)
  scrollSync.highlightPreviewBlock(line)
}

function navigateSearch(direction: -1 | 1): void {
  const matches = searchMatches.value
  if (matches.length === 0) return
  const textarea = textareaRef.value
  const savedSelection = editorSelection
  const fallback = direction === 1 ? 0 : editContent.value.length
  const selection = textarea
    ? { start: textarea.selectionStart, end: textarea.selectionEnd }
    : savedSelection
      ? { start: savedSelection.start, end: savedSelection.end }
      : { start: fallback, end: fallback }
  const index = findAdjacentMatchIndex(matches, selection, direction)
  if (index >= 0) void revealSearchMatch(index)
}

async function openSearch(showReplace: boolean): Promise<void> {
  searchOpen.value = true
  replaceVisible.value = showReplace
  replaceMessage.value = ''
  await nextTick()
  searchPanelRef.value?.focus()
}

function getCurrentDocumentSearchSelection(): DocumentSearchSelection | null {
  const preview = previewRef.value
  const browserSelection = window.getSelection()
  if (preview) {
    const previewQuery = getContainedSelectionText(preview, browserSelection)
    if (previewQuery !== null) {
      browserSelection?.removeAllRanges()
      return { query: previewQuery, editorRange: null }
    }
  }

  const textarea = textareaRef.value
  if (!textarea || document.activeElement !== textarea) return null

  const editorRange = {
    start: textarea.selectionStart,
    end: textarea.selectionEnd,
  }
  const query = getSelectedSearchQuery(editContent.value, editorRange)
  return query === null ? null : { query, editorRange }
}

async function openSearchFromSelection(
  showReplace: boolean,
  selection: DocumentSearchSelection,
): Promise<void> {
  searchQuery.value = selection.query
  currentMatchIndex.value = 0
  await openSearch(showReplace)

  if (selection.editorRange) {
    const selectedIndex = findSelectedMatchIndex(searchMatches.value, selection.editorRange)
    if (selectedIndex >= 0) currentMatchIndex.value = selectedIndex
  }
}

async function handleSearchShortcut(
  shortcutAction: Exclude<ReturnType<typeof resolveEditorShortcut>, null>,
  selection: DocumentSearchSelection | null,
): Promise<void> {
  if (!isEditing.value) await toggleEditingMode()

  if (selection) {
    await openSearchFromSelection(
      shortcutAction === 'open-replace' || replaceVisible.value,
      selection,
    )
    return
  }

  if (shortcutAction === 'close-search') {
    closeSearch()
  } else {
    await openSearch(shortcutAction === 'open-replace')
  }
}

function closeSearch(): void {
  searchOpen.value = false
  replaceMessage.value = ''
  textareaRef.value?.focus()
}

async function handleReplaceCurrent(): Promise<void> {
  const matches = searchMatches.value
  if (matches.length === 0) return
  const index = normalizedMatchIndex()
  const match = matches[index]
  editContent.value = replaceTextMatch(editContent.value, match, replacementText.value)
  markDirty()
  clearImageSelection()
  replaceMessage.value = '已替换 1 处'

  await nextTick()
  const nextMatches = searchMatches.value
  if (nextMatches.length === 0) {
    currentMatchIndex.value = 0
    return
  }
  const nextPosition = match.start + replacementText.value.length
  const nextIndex = nextMatches.findIndex((candidate) => candidate.start >= nextPosition)
  await revealSearchMatch(nextIndex >= 0 ? nextIndex : 0)
}

async function handleReplaceAll(): Promise<void> {
  const matches = searchMatches.value
  if (matches.length === 0) return
  editContent.value = replaceAllTextMatches(editContent.value, matches, replacementText.value)
  markDirty()
  clearImageSelection()
  currentMatchIndex.value = 0
  replaceMessage.value = `已替换 ${matches.length} 处`
  await nextTick()
  if (searchMatches.value.length > 0) {
    await revealSearchMatch(0)
  }
}

function navigateToHeading(line: number): void {
  clearImageSelection()
  if (isEditing.value) {
    scrollSync.scrollEditorToLine(line)
    scrollSync.highlightEditorLine(line)
  }
  scrollSync.scrollPreviewToLine(line)
  scrollSync.highlightPreviewBlock(line)
}

function handleEditorClick(event: MouseEvent): void {
  if (!syncEnabled.value) return
  if (!(event.ctrlKey || event.metaKey)) return
  const line = scrollSync.getCurrentEditorLine()
  scrollSync.scrollPreviewToLine(line)
  scrollSync.highlightPreviewBlock(line)
}

async function toggleEditingMode(): Promise<void> {
  if (isEditing.value) {
    const textarea = textareaRef.value
    const position = scrollSync.captureEditorPosition()
    if (textarea) {
      editorSelection = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
        direction: textarea.selectionDirection,
      }
    }

    isEditing.value = false
    await nextTick()
    scrollSync.restorePreviewPosition(position)
    return
  }

  const position = scrollSync.capturePreviewPosition()
  isEditing.value = true
  await nextTick()
  scrollSync.restoreEditorPosition(position)
  scrollSync.restorePreviewPosition(position)

  const textarea = textareaRef.value
  if (textarea && editorSelection) {
    const contentLength = textarea.value.length
    textarea.setSelectionRange(
      Math.min(editorSelection.start, contentLength),
      Math.min(editorSelection.end, contentLength),
      editorSelection.direction,
    )
  }
}

function clearImageSelection(): void {
  selectedImageIndex.value = null
}

function handlePreviewClick(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof HTMLElement)) {
    clearImageSelection()
    return
  }

  // Image selection takes priority over sync
  if (target instanceof HTMLImageElement) {
    const imageIndex = Number(target.dataset.imageIndex)
    if (Number.isInteger(imageIndex) && imageIndex >= 0) {
      selectedImageIndex.value = imageIndex
      return
    }
    clearImageSelection()
    return
  }

  // Ctrl+Click: preview-to-editor sync
  if (syncEnabled.value && (event.ctrlKey || event.metaKey)) {
    const sourceLine = findSourceLine(target)
    if (sourceLine !== null) {
      scrollSync.scrollEditorToLine(sourceLine)
      scrollSync.highlightEditorLine(sourceLine)
    }
  }

  clearImageSelection()
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
  if (props.documentPath) return
  if (!isEditing.value) {
    isEditing.value = true
    await nextTick()
  }
  try {
    const imageUrl = await window.electronAPI.notes.uploadImage()
    if (imageUrl) {
      editContent.value += `\n${createManagedImageHtml(imageUrl)}\n`
      isDirty.value = true
      selectLastImage()
    }
  } catch (err) {
    console.error('Failed to upload image:', err)
  }
}

async function handlePaste(e: ClipboardEvent): Promise<void> {
  if (props.documentPath) return
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
        editContent.value += `\n${createManagedImageHtml(imageUrl)}\n`
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
  const shortcutAction = resolveEditorShortcut(
    e,
    searchOpen.value,
    replaceVisible.value,
  )
  if (shortcutAction) {
    e.preventDefault()
    const selection = getCurrentDocumentSearchSelection()
    void handleSearchShortcut(shortcutAction, selection)
    return
  }
  if (e.key === 'Escape' && searchOpen.value) {
    closeSearch()
    return
  }
  if (e.key === 'Escape' && selectedImageIndex.value !== null) {
    clearImageSelection()
    return
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

function getDraft(): { id: string; title: string; content: string } | null {
  if (!props.note) return null
  return {
    id: props.note.id,
    title: editTitle.value.trim() || '未命名笔记',
    content: editContent.value,
  }
}

defineExpose({ isDirty, save: handleSave, getDraft })

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

.document-heading {
  flex: 1;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.input-title {
  width: 100%;
  min-width: 0;
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

.input-title:read-only {
  cursor: default;
}

.file-path {
  padding: 0 10px;
  color: var(--color-text-muted);
  font-size: 10px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  flex-wrap: wrap;
  justify-content: flex-end;
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

.btn-tool:disabled {
  opacity: 0.45;
  cursor: default;
}

.btn-tool:disabled:hover {
  border-color: var(--color-border);
  color: var(--color-text-secondary);
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

.editor-workspace {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  overflow: hidden;
}

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
.content-preview :deep(h1) {
  font-size: 1.6em;
  font-weight: 700;
  margin: 0.8em 0 0.4em;
  color: #111827;
}

.content-preview :deep(h2) {
  font-size: 1.3em;
  font-weight: 600;
  margin: 0.7em 0 0.3em;
  color: #1f2937;
}

.content-preview :deep(h3) {
  font-size: 1.1em;
  font-weight: 600;
  margin: 0.6em 0 0.25em;
  color: #374151;
}

.content-preview :deep(p) {
  margin: 0.4em 0;
}

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

.content-preview :deep(ul),
.content-preview :deep(ol) {
  padding-left: 1.5em;
  margin: 0.3em 0;
}

.content-preview :deep(li) {
  margin: 0.1em 0;
}

.content-preview :deep(a) {
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.content-preview :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
  margin: 8px 0;
  box-shadow: var(--shadow-sm);
}

.content-preview :deep(.chmarkdown-resizable-image) {
  cursor: pointer;
  outline: 2px solid transparent;
  outline-offset: 3px;
  transition: outline-color 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;
}

.content-preview :deep(.chmarkdown-resizable-image:hover) {
  outline-color: rgba(74, 158, 255, 0.34);
  box-shadow: 0 4px 14px rgba(43, 110, 181, 0.15);
  filter: saturate(1.03);
}

.content-preview :deep(.chmarkdown-resizable-image--selected) {
  outline-color: var(--color-primary);
  box-shadow: 0 5px 18px rgba(43, 110, 181, 0.2);
}

.content-preview :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1em 0;
}

.content-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.6em 0;
}

.content-preview :deep(th),
.content-preview :deep(td) {
  border: 1px solid var(--color-border);
  padding: 5px 10px;
  text-align: left;
  font-size: 13px;
}

.content-preview :deep(th) {
  background: #f9fafb;
  font-weight: 600;
}

.image-tools-enter-active,
.image-tools-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.image-tools-enter-from,
.image-tools-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ── Sync toggle active state ── */

.btn-tool--active {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: rgba(74, 158, 255, 0.08);
}

/* ── Preview highlight animation ── */

.content-preview :deep(.source-line-highlight) {
  background-color: rgba(74, 158, 255, 0.12);
  border-radius: 4px;
  transition: background-color 0.35s ease;
  box-decoration-break: clone;
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
