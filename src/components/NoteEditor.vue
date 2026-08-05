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
        <div class="mode-switch" aria-label="编辑器显示模式">
          <button class="btn-tool" :class="{ 'btn-tool--active': editorMode === 'edit' }" @click="setEditorMode('edit')" title="仅显示 Markdown 编辑器">编辑</button>
          <button class="btn-tool" :class="{ 'btn-tool--active': editorMode === 'split' }" @click="setEditorMode('split')" title="同时显示编辑与预览">分栏</button>
          <button class="btn-tool" :class="{ 'btn-tool--active': editorMode === 'preview' }" @click="setEditorMode('preview')" title="仅显示 Markdown 预览">预览</button>
        </div>

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

        <button class="btn-tool" @click="handleInsertImage"
          title="插入图片">
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

        <button class="btn-tool" @click="handleExport" title="导出当前文档">
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
      <div
        ref="editorBodyRef"
        class="editor-body"
        :class="[
          `editor-body--${editorMode}`,
          { 'editor-body--resizing': splitPaneResizing },
        ]"
      >
      <div
        v-show="editorMode !== 'preview'"
        class="editor-pane editor-pane--edit"
        :style="editorMode === 'split' ? splitEditPaneStyle : undefined"
      >
        <div class="pane-label pane-label--preview">
          <span>Markdown</span>
          <span class="pane-label-right">
            <span class="pane-hint">Ctrl+Click 定位</span>
            <span v-if="editorMode !== 'split'" class="pane-word-count" :title="wordCountTitle">{{ wordCount }}<template v-if="selectedWordCount > 0">/{{ selectedWordCount }}</template> 字</span>
          </span>
        </div>
        
        <textarea ref="textareaRef" v-model="editContent" class="content-textarea"
          :class="{ 'content-textarea--no-wrap': !settings.wordWrap }"
          :style="editorTextStyle" :wrap="settings.wordWrap ? 'soft' : 'off'"
          placeholder="使用 Markdown 记录你的灵感…&#10;&#10;# 标题&#10;**加粗** *斜体*&#10;- 列表项&#10;> 引用&#10;`代码`&#10;&#10;支持 Ctrl+V 粘贴图片"
          @beforeinput="handleBeforeInput" @input="handleContentInput"
          @copy="handleCopy" @cut="handleCut"
          @paste="handlePaste" @keydown="handleTextareaKeydown" @click="handleEditorClick"
          @select="updateSelectedText" @keyup="updateSelectedText"></textarea>
      </div>

      <div
        v-if="editorMode === 'split'"
        class="editor-divider"
        :class="{ 'editor-divider--active': splitPaneResizing }"
        role="separator"
        aria-orientation="vertical"
        aria-label="调整编辑区和预览区宽度"
        aria-valuemin="20"
        aria-valuemax="80"
        :aria-valuenow="splitPaneRatioPercent"
        tabindex="0"
        title="左右拖动调整宽度；双击恢复均分"
        @mousedown="splitPane.onMouseDown"
        @keydown="splitPane.onKeyDown"
        @dblclick="splitPane.reset"
      ></div>

      <div v-show="editorMode !== 'edit'" class="editor-pane editor-pane--preview">
        <div class="pane-label pane-label--preview">
          <span>预览</span>
          <span class="pane-label-right">
            <span class="pane-hint">点击图片可调整大小</span>
            <span class="pane-word-count" :title="wordCountTitle">{{ wordCount }}<template v-if="selectedWordCount > 0">/{{ selectedWordCount }}</template> 字</span>
          </span>
        </div>
        <div ref="previewRef" class="content-preview" :class="{ 'content-preview--full': editorMode === 'preview' }" v-html="renderedMarkdown" @click="handlePreviewClick" @mouseup="updateSelectedText"></div>
      </div>
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
import { computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import { useConfirm } from '../composables/useConfirm'
import { useToast } from '../composables/useToast'
import DocumentSearchPanel from './DocumentSearchPanel.vue'
import {
  configureMarkdownImageSizing,
  createManagedImageMarkdown,
  findResizableMarkdownImages,
  removeMarkdownImage,
  updateMarkdownImageWidth,
} from '../utils/markdownImageSize'
import { transformExternalImagePaths } from '../utils/externalFileImages'
import { configureMarkdownSourceMap, findSourceLine } from '../utils/markdownSourceMap'
import { useScrollSync } from '../composables/useScrollSync'
import { useSplitPane } from '../composables/useSplitPane'
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
import {
  resolveEditorHistoryShortcut,
  resolveEditorShortcut,
} from '../utils/keyboardShortcut'
import {
  cutCurrentLine,
  getLineClipboardPayload,
  LINE_CLIPBOARD_MIME,
  pasteLineAbove,
} from '../utils/lineClipboard'
import {
  resolveLineEndEnter,
  resolveListContinuation,
} from '../utils/listContinuation'
import { countDocumentWords } from '../utils/documentStats'
import {
  createEditorHistory,
  resolveInputHistoryGroup,
  type EditorHistorySnapshot,
} from '../utils/editorHistory'

const ImageSizeControl = defineAsyncComponent(() => import('./ImageSizeControl.vue'))
const DocumentOutline = defineAsyncComponent(() => import('./DocumentOutline.vue'))

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})
configureMarkdownImageSizing(md)
configureMarkdownSourceMap(md)

const ALLOWED_URI_REGEXP = /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|chmarkdown|chmarkdown-ext):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i

const props = defineProps<{
  note: Note | null
  documentPath?: string | null
  settings: AppSettings
  saveNote: (data: { id: string; title: string; content: string }) => Promise<boolean>
}>()

const emit = defineEmits<{
  delete: [id: string]
}>()

const editTitle = ref('')
const editContent = ref('')
const savedTitle = ref('')
const savedContent = ref('')
const isDirty = ref(false)
const editorMode = ref<EditorMode>(props.settings.defaultEditorMode)
const isSaving = ref(false)
const selectedImageIndex = ref<number | null>(null)
const extImageToken = ref<string | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const previewRef = ref<HTMLElement | null>(null)
const editorBodyRef = ref<HTMLElement | null>(null)
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
const { show } = useToast()
const splitPane = useSplitPane({
  containerRef: editorBodyRef,
  storageKey: 'chmarkdown:editor:split-ratio',
})
const splitEditPaneStyle = splitPane.editPaneStyle
const splitPaneResizing = computed(() => splitPane.state.isResizing)
const splitPaneRatioPercent = computed(() => Math.round(splitPane.state.ratio * 100))
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
const editorHistory = createEditorHistory({
  content: '',
  selectionStart: 0,
  selectionEnd: 0,
  selectionDirection: 'none',
})
let pendingInputHistoryGroup: string | null = null

interface DocumentSearchSelection {
  query: string
  editorRange: { start: number; end: number } | null
}

const preparedContent = computed(() => {
  if (!props.documentPath) return editContent.value
  return transformExternalImagePaths(editContent.value, extImageToken.value)
})

const renderedMarkdown = computed(() => {
  const raw = md.render(preparedContent.value || '', {
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

const wordCount = computed(() => countDocumentWords(editContent.value))
const selectedText = ref('')

function updateSelectedText(): void {
  const textarea = textareaRef.value
  if (textarea && document.activeElement === textarea) {
    selectedText.value = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)
    return
  }

  const selection = window.getSelection()
  const preview = previewRef.value
  if (
    selection
    && !selection.isCollapsed
    && preview
    && selection.anchorNode
    && selection.focusNode
    && preview.contains(selection.anchorNode)
    && preview.contains(selection.focusNode)
  ) {
    selectedText.value = selection.toString()
    return
  }
  selectedText.value = ''
}

const selectedWordCount = computed(() => countDocumentWords(selectedText.value))
const wordCountTitle = computed(() =>
  selectedWordCount.value > 0
    ? `当前文档 ${wordCount.value} 字，选中 ${selectedWordCount.value} 字`
    : `当前文档 ${wordCount.value} 字`,
)

const searchMatches = computed(() => findTextMatches(editContent.value, searchQuery.value, {
  caseSensitive: caseSensitive.value,
  wholeWord: wholeWord.value,
}))

const currentMatchNumber = computed(() => {
  if (searchMatches.value.length === 0) return 0
  return Math.min(currentMatchIndex.value, searchMatches.value.length - 1) + 1
})

const isEditing = computed(() => editorMode.value !== 'preview')

const editorTextStyle = computed(() => ({
  fontFamily: props.settings.editorFontFamily === 'system-ui'
    ? 'system-ui, sans-serif'
    : `"${props.settings.editorFontFamily}", "Cascadia Code", Consolas, monospace`,
  fontSize: `${props.settings.editorFontSize}px`,
}))

const outlineHeadings = computed(() => extractMarkdownHeadings(editContent.value))

watch(
  () => props.note,
  (newNote, oldNote) => {
    if (!newNote) {
      editTitle.value = ''
      editContent.value = ''
      savedTitle.value = ''
      savedContent.value = ''
      isDirty.value = false
      selectedImageIndex.value = null
      editorHistory.reset({
        content: '',
        selectionStart: 0,
        selectionEnd: 0,
        selectionDirection: 'none',
      })
      return
    }

    // Only reset when the user actually switches to a different note.
    // Prevents accidental overwrites when the parent updates the note object
    // in-place (e.g. after saving).
    if (newNote.id !== oldNote?.id) {
      editTitle.value = newNote.title
      editContent.value = newNote.content
      savedTitle.value = newNote.title
      savedContent.value = newNote.content
      isDirty.value = false
      editorMode.value = props.settings.defaultEditorMode
      selectedImageIndex.value = null
      editorSelection = null
      currentMatchIndex.value = 0
      replaceMessage.value = ''
      editorHistory.reset({
        content: newNote.content,
        selectionStart: 0,
        selectionEnd: 0,
        selectionDirection: 'none',
      })
      pendingInputHistoryGroup = null
      if (editorMode.value !== 'preview') {
        nextTick(() => textareaRef.value?.focus())
      }
    }
  },
  { immediate: true }
)

watch(
  () => props.documentPath,
  async (newPath, oldPath) => {
    if (oldPath && extImageToken.value) {
      await window.electronAPI.extFiles.unregisterDir(extImageToken.value)
      extImageToken.value = null
    }
    if (newPath) {
      const fileDir = newPath.slice(0, Math.max(newPath.lastIndexOf('\\'), newPath.lastIndexOf('/')))
      if (fileDir) {
        try {
          extImageToken.value = await window.electronAPI.extFiles.registerDir(fileDir)
        } catch (err) {
          console.error('Failed to register external file directory:', err)
          show('加载外部文档图片失败，请检查文档目录。', 'error')
        }
      }
    }
  },
  { immediate: true }
)

watch(
  () => props.settings.defaultEditorMode,
  (mode) => {
    if (props.note && editorMode.value !== mode) void setEditorMode(mode)
  },
)

watch([searchQuery, caseSensitive, wholeWord], () => {
  currentMatchIndex.value = 0
  replaceMessage.value = ''
})

function markDirty(): void {
  isDirty.value = editTitle.value !== savedTitle.value
    || editContent.value !== savedContent.value
}

function getEditorSnapshot(content = editContent.value): EditorHistorySnapshot {
  const textarea = textareaRef.value
  const contentLength = content.length
  return {
    content,
    selectionStart: Math.min(textarea?.selectionStart ?? contentLength, contentLength),
    selectionEnd: Math.min(textarea?.selectionEnd ?? contentLength, contentLength),
    selectionDirection: textarea?.selectionDirection ?? 'none',
  }
}

function handleBeforeInput(event: Event): void {
  const textarea = event.currentTarget as HTMLTextAreaElement
  editorHistory.synchronize(getEditorSnapshot(textarea.value))
  pendingInputHistoryGroup = resolveInputHistoryGroup((event as InputEvent).inputType)
}

function handleContentInput(event: Event): void {
  const textarea = event.currentTarget as HTMLTextAreaElement
  const inputType = (event as InputEvent).inputType
  editContent.value = textarea.value
  editorHistory.record(getEditorSnapshot(textarea.value), {
    group: pendingInputHistoryGroup ?? resolveInputHistoryGroup(inputType),
  })
  pendingInputHistoryGroup = null
  markDirty()
  clearImageSelection()
  updateSelectedText()
}

function handleTextareaKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Enter' || e.isComposing) return
  const textarea = e.currentTarget as HTMLTextAreaElement

  // Ctrl+Enter：光标跳到当前行行末，再执行回车行为（列表行继续列表，普通行插入换行）
  if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
    e.preventDefault()
    const result = resolveLineEndEnter(editContent.value, textarea.selectionStart)
    applyEditorContent(result.content, {
      selectionStart: result.cursor,
      restoreSelection: true,
    })
    return
  }

  if (textarea.selectionStart !== textarea.selectionEnd) return
  const result = resolveListContinuation(editContent.value, textarea.selectionStart)
  if (!result) return
  e.preventDefault()
  applyEditorContent(result.content, {
    selectionStart: result.cursor,
    restoreSelection: true,
    historyGroup: 'list-continuation',
  })
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
    await setEditorMode('split')
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
  if (!isEditing.value) await setEditorMode('split')

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
  const updatedContent = replaceTextMatch(editContent.value, match, replacementText.value)
  applyEditorContent(updatedContent, {
    selectionStart: match.start + replacementText.value.length,
  })
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
  applyEditorContent(
    replaceAllTextMatches(editContent.value, matches, replacementText.value),
  )
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

async function setEditorMode(mode: EditorMode): Promise<void> {
  if (editorMode.value === mode) return
  const textarea = textareaRef.value
  const position = editorMode.value === 'preview'
    ? scrollSync.capturePreviewPosition()
    : scrollSync.captureEditorPosition()
  if (textarea && editorMode.value !== 'preview') {
    editorSelection = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
      direction: textarea.selectionDirection,
    }
  }

  editorMode.value = mode
  await nextTick()
  if (mode !== 'preview') scrollSync.restoreEditorPosition(position)
  if (mode !== 'edit') scrollSync.restorePreviewPosition(position)

  if (textarea && editorSelection && mode !== 'preview') {
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

  applyEditorContent(updatedContent, { preserveImageSelection: true })
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

    if (saved) {
      savedTitle.value = titleSnapshot
      savedContent.value = contentSnapshot
      markDirty()
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

function restoreEditorSnapshot(snapshot: EditorHistorySnapshot): void {
  void nextTick(() => {
    const textarea = textareaRef.value
    if (!textarea) return
    textarea.setSelectionRange(
      snapshot.selectionStart,
      snapshot.selectionEnd,
      snapshot.selectionDirection,
    )
    textarea.focus()
  })
}

interface ApplyEditorContentOptions {
  selectionStart?: number
  selectionEnd?: number
  selectionDirection?: EditorHistorySnapshot['selectionDirection']
  restoreSelection?: boolean
  preserveImageSelection?: boolean
  historyGroup?: string
}

function applyEditorContent(
  content: string,
  options: ApplyEditorContentOptions = {},
): void {
  const textarea = textareaRef.value
  const fallbackPosition = Math.min(
    textarea?.selectionStart ?? content.length,
    content.length,
  )
  const snapshot: EditorHistorySnapshot = {
    content,
    selectionStart: options.selectionStart ?? fallbackPosition,
    selectionEnd: options.selectionEnd ?? options.selectionStart ?? fallbackPosition,
    selectionDirection: options.selectionDirection ?? 'none',
  }
  editorHistory.synchronize(getEditorSnapshot())
  editorHistory.record(snapshot, options.historyGroup ? { group: options.historyGroup } : undefined)
  editContent.value = content
  markDirty()
  if (!options.preserveImageSelection) clearImageSelection()
  if (options.restoreSelection) restoreEditorSnapshot(snapshot)
}

function insertAtCursor(text: string): void {
  const textarea = textareaRef.value
  const start = textarea?.selectionStart ?? editContent.value.length
  const end = textarea?.selectionEnd ?? editContent.value.length
  const content = editContent.value.slice(0, start) + text + editContent.value.slice(end)
  const cursor = start + text.length
  applyEditorContent(content, {
    selectionStart: cursor,
    restoreSelection: true,
  })
}

function handleCopy(event: ClipboardEvent): void {
  const textarea = textareaRef.value
  const clipboard = event.clipboardData
  if (!textarea || !clipboard || textarea.selectionStart !== textarea.selectionEnd) return

  const line = getLineClipboardPayload(editContent.value, textarea.selectionStart)
  event.preventDefault()
  clipboard.setData('text/plain', line.text)
  clipboard.setData(LINE_CLIPBOARD_MIME, 'true')
}

function handleCut(event: ClipboardEvent): void {
  const textarea = textareaRef.value
  const clipboard = event.clipboardData
  if (!textarea || !clipboard || textarea.selectionStart !== textarea.selectionEnd) return

  const line = getLineClipboardPayload(editContent.value, textarea.selectionStart)
  const updated = cutCurrentLine(editContent.value, textarea.selectionStart)
  event.preventDefault()
  clipboard.setData('text/plain', line.text)
  clipboard.setData(LINE_CLIPBOARD_MIME, 'true')
  applyEditorContent(updated.content, {
    selectionStart: updated.cursor,
    restoreSelection: true,
  })
}

async function handleInsertImage(): Promise<void> {
  if (!isEditing.value) {
    await setEditorMode('split')
  }

  if (props.documentPath) {
    try {
      const relativePath = await window.electronAPI.extFiles.uploadImage(props.documentPath)
      if (relativePath) {
        insertAtCursor(`\n![图片](${relativePath})\n`)
      }
    } catch (err) {
      console.error('Failed to upload image for external file:', err)
      show('插入图片失败，请检查文档目录和文件权限。', 'error')
    }
    return
  }

  try {
    const imageUrl = await window.electronAPI.notes.uploadImage()
    if (imageUrl) {
      insertAtCursor(`\n${createManagedImageMarkdown(imageUrl)}\n`)
      selectLastImage()
    }
  } catch (err) {
    console.error('Failed to upload image:', err)
    show('插入图片失败，请检查图片文件。', 'error')
  }
}

async function handlePaste(e: ClipboardEvent): Promise<void> {
  const textarea = textareaRef.value
  const clipboard = e.clipboardData
  if (
    textarea &&
    clipboard &&
    textarea.selectionStart === textarea.selectionEnd &&
    clipboard.getData(LINE_CLIPBOARD_MIME) === 'true'
  ) {
    const updated = pasteLineAbove(
      editContent.value,
      textarea.selectionStart,
      clipboard.getData('text/plain'),
    )
    e.preventDefault()
    applyEditorContent(updated.content, {
      selectionStart: updated.cursor,
      restoreSelection: true,
    })
    return
  }

  const items = clipboard?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (!file) continue

      if (props.documentPath) {
        try {
          const buffer = await file.arrayBuffer()
          const relativePath = await window.electronAPI.extFiles.pasteImage(
            props.documentPath,
            buffer,
            file.type,
          )
          insertAtCursor(`\n![图片](${relativePath})\n`)
        } catch (err) {
          console.error('Failed to paste image for external file:', err)
          show('粘贴图片失败，请检查文档目录和文件权限。', 'error')
        }
        return
      }

      try {
        const buffer = await file.arrayBuffer()
        const imageUrl = await window.electronAPI.notes.pasteImage(buffer, file.type)
        insertAtCursor(`\n${createManagedImageMarkdown(imageUrl)}\n`)
        selectLastImage()
      } catch (err) {
        console.error('Failed to paste image:', err)
        show('粘贴图片失败。', 'error')
      }
      return
    }
  }
}

function handleKeydown(e: KeyboardEvent): void {
  const historyAction = resolveEditorHistoryShortcut(e)
  if (historyAction && document.activeElement === textareaRef.value) {
    e.preventDefault()
    const snapshot = historyAction === 'undo'
      ? editorHistory.undo()
      : editorHistory.redo()
    if (snapshot) {
      pendingInputHistoryGroup = null
      editContent.value = snapshot.content
      markDirty()
      clearImageSelection()
      restoreEditorSnapshot(snapshot)
    }
    return
  }

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
  if (
    (e.key === 'Delete' || e.key === 'Backspace') &&
    selectedImageIndex.value !== null
  ) {
    const active = document.activeElement
    const isTextField = active instanceof HTMLInputElement
      || active instanceof HTMLTextAreaElement
    if (!isTextField) {
      e.preventDefault()
      deleteSelectedImage()
      return
    }
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

function deleteSelectedImage(): void {
  if (selectedImageIndex.value === null) return
  const image = findResizableMarkdownImages(editContent.value)[selectedImageIndex.value]
  if (!image) return
  applyEditorContent(removeMarkdownImage(editContent.value, selectedImageIndex.value), {
    selectionStart: image.start,
  })
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
    const savedPath = await window.electronAPI.files.exportDocument({
      title: editTitle.value.trim() || '未命名笔记',
      content: editContent.value,
      sourceFilePath: props.documentPath ?? null,
    })
    if (savedPath) {
      show(`已导出到 ${savedPath}`)
    }
  } catch (err) {
    console.error('Failed to export note:', err)
    const rawMessage = err instanceof Error ? err.message : String(err)
    const message = rawMessage.match(/: Error: (.+)$/s)?.[1] ?? rawMessage
    show(`导出失败：${message}`, 'error')
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

function attachImageErrorHandlers(): void {
  const preview = previewRef.value
  if (!preview) return
  const images = preview.querySelectorAll('img')
  images.forEach((img) => {
    if (img.dataset.errorHandled === 'true') return
    img.dataset.errorHandled = 'true'
    img.addEventListener('error', () => {
      img.classList.add('image-load-error')
    }, { once: true })
  })
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('selectionchange', updateSelectedText)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('selectionchange', updateSelectedText)
  splitPane.cleanup()
  if (extImageToken.value) {
    window.electronAPI.extFiles.unregisterDir(extImageToken.value).catch(() => {})
  }
})

watch(renderedMarkdown, () => {
  nextTick(() => attachImageErrorHandlers())
})
</script>

<style scoped>
.note-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--color-surface);
}

/* ── Toolbar ── */

.editor-toolbar {
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  background: var(--color-surface-soft);
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
  background: var(--color-control-bg);
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

.mode-switch {
  display: flex;
  align-items: center;
}

.mode-switch .btn-tool {
  border-radius: 0;
  margin-left: -1px;
}

.mode-switch .btn-tool:first-child {
  margin-left: 0;
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
}

.mode-switch .btn-tool:last-child {
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.btn-tool {
  padding: 5px 9px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-control-bg);
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
  border-color: var(--color-text-muted);
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
  min-width: 0;
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

.editor-body--split .editor-pane--edit {
  flex-grow: 0;
  flex-shrink: 0;
}

.editor-body--resizing .editor-pane {
  pointer-events: none;
}

.pane-label {
  flex-shrink: 0;
  padding: 4px 16px;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  background: var(--color-surface-soft);
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
  color: var(--color-text-muted);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}

.pane-label-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pane-word-count {
  color: var(--color-text-secondary);
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.editor-divider {
  width: 9px;
  background: transparent;
  flex-shrink: 0;
  position: relative;
  cursor: col-resize;
  outline: none;
  user-select: none;
}

.editor-divider::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 4px;
  width: 1px;
  background: var(--color-border);
  transition: width var(--transition), background-color var(--transition), left var(--transition);
}

.editor-divider:hover::after,
.editor-divider:focus-visible::after,
.editor-divider--active::after {
  left: 3px;
  width: 3px;
  background: var(--color-primary);
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
  background: var(--color-surface);
  tab-size: 2;
}

.content-textarea--no-wrap {
  white-space: pre;
  overflow-wrap: normal;
  overflow-x: auto;
}

.content-textarea::placeholder {
  color: var(--color-text-muted);
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
  background: var(--color-surface);
}

.content-preview--full {
  padding: 24px 32px;
}

/* Markdown styles */
.content-preview :deep(h1) {
  font-size: 1.6em;
  font-weight: 700;
  margin: 0.8em 0 0.4em;
  color: var(--color-heading);
}

.content-preview :deep(h2) {
  font-size: 1.3em;
  font-weight: 600;
  margin: 0.7em 0 0.3em;
  color: var(--color-text);
}

.content-preview :deep(h3) {
  font-size: 1.1em;
  font-weight: 600;
  margin: 0.6em 0 0.25em;
  color: var(--color-text-secondary);
}

.content-preview :deep(p) {
  margin: 0.4em 0;
}

.content-preview :deep(blockquote) {
  border-left: 3px solid var(--color-primary);
  padding: 4px 16px;
  margin: 0.6em 0;
  color: var(--color-quote-text);
  background: var(--color-quote-bg);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.content-preview :deep(code) {
  background: var(--color-code-bg);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: "Cascadia Code", "Fira Code", "Consolas", monospace;
  font-size: 0.88em;
  color: var(--color-code-text);
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

.content-preview :deep(img.image-load-error) {
  display: inline-block;
  min-width: 120px;
  min-height: 50px;
  background: var(--color-surface-soft);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: none;
  position: relative;
}

.content-preview :deep(img.image-load-error)::after {
  content: '图片加载失败';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--color-text-muted);
  font-size: 11px;
  white-space: nowrap;
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
  background: var(--color-surface-soft);
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
  background: var(--color-surface);
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
