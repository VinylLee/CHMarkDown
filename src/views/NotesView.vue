<template>
  <div
    class="notes-view"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <NoteList
      :notes="notes"
      :external-files="externalFiles"
      :recent-files="recentFiles"
      :selectedId="selectedId"
      :document-order="documentOrder"
      @select="trySelectDocument"
      @close="handleCloseListItem"
      @close-range="handleCloseRange"
      @recent-close-range="handleRecentCloseRange"
      @open-in-explorer="handleOpenInExplorer"
      @reorder="handleReorder"
      @create="tryCreateNote"
      @open-recent="queueOpenFilePath($event, 'recent')"
      @remove-recent="handleRemoveRecent"
      @clear-recent="handleClearRecent"
      @settings="settingsOpen = true"
    />
    <NoteEditor
      ref="noteEditorRef"
      :note="activeDocument"
      :document-path="activeExternalFile?.filePath ?? null"
      :settings="settings"
      :save-note="handleSave"
      @delete="handleDelete"
    />
    <SettingsDialog
      v-if="settingsOpen"
      :open="settingsOpen"
      :settings="settings"
      :saving="settingsSaving"
      @close="settingsOpen = false"
      @save="handleSaveSettings"
    />
    <div v-if="isDraggingFile" class="file-drop-overlay">
      <div class="file-drop-card">
        <span class="file-drop-icon">↓</span>
        <strong>拖放以打开 Markdown 文件</strong>
        <span>支持 .md 和 .markdown</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import NoteList from '../components/NoteList.vue'
import NoteEditor from '../components/NoteEditor.vue'
import { useConfirm } from '../composables/useConfirm'
import { useToast } from '../composables/useToast'
import { useNoteListPanel } from '../composables/useNoteListPanel'
import { resolveUnsavedChanges } from '../utils/resolveUnsavedChanges'
import { resolveCloseRangeTargets } from '../utils/documentCloseRange'
import type { DocumentCloseRange } from '../utils/documentCloseRange'
import { moveDocumentInOrder } from '../utils/documentOrder'
import type { DocumentDropPlacement } from '../utils/documentOrder'
import { registerAppCloseGuard } from '../composables/useAppCloseGuard'
import { getDroppedMarkdownFilePath } from '../utils/droppedMarkdownFile'
import {
  createOpenMarkdownFile,
  removeOpenMarkdownFile,
  replaceOpenMarkdownFile,
  upsertOpenMarkdownFile,
} from '../utils/openMarkdownFiles'
import type { OpenMarkdownFile } from '../utils/openMarkdownFiles'
import { createSessionState, restoreSessionState } from '../utils/sessionState'
import { loadWorkspaceBootstrap } from '../utils/workspaceBootstrap'
import { useAppSettings } from '../composables/useAppSettings'

const SettingsDialog = defineAsyncComponent(() => import('../components/SettingsDialog.vue'))

const notes = ref<Note[]>([])
const selectedId = ref<string | null>(null)
const externalFiles = ref<OpenMarkdownFile[]>([])
const recentFiles = ref<RecentFile[]>([])
const documentOrder = ref<string[]>([])
const isDraggingFile = ref(false)
const settingsOpen = ref(false)
const settingsSaving = ref(false)
const loading = ref(true)
const error = ref('')
const { show } = useToast()
const { requestConfirm } = useConfirm()
const noteListPanel = useNoteListPanel()
const noteEditorRef = ref<InstanceType<typeof NoteEditor> | null>(null)
const { settings, saveSettings } = useAppSettings()
let unregisterCloseGuard: (() => void) | null = null
let removeFileCommandListener: (() => void) | null = null
let removeOpenFileRequestListener: (() => void) | null = null
let dragDepth = 0
let openFileQueue = Promise.resolve()
let sessionSaveQueue = Promise.resolve()
let sessionReady = false
let sessionSaveErrorVisible = false

const selectedNote = computed(() => {
  if (!selectedId.value) return null
  return notes.value.find((n) => n.id === selectedId.value) || null
})

const activeExternalFile = computed(() => {
  if (!selectedId.value) return null
  return externalFiles.value.find((file) => file.id === selectedId.value) ?? null
})

const activeDocument = computed<Note | null>(() => {
  if (activeExternalFile.value) {
    return {
      id: activeExternalFile.value.id,
      title: activeExternalFile.value.fileName,
      content: activeExternalFile.value.content,
      createdAt: '',
      updatedAt: activeExternalFile.value.openedAt,
    }
  }
  return selectedNote.value
})

async function canLeaveCurrentNote(reason: 'navigate' | 'close' = 'navigate'): Promise<boolean> {
  const editor = noteEditorRef.value
  return resolveUnsavedChanges({
    dirty: editor?.isDirty ?? false,
    choose: () =>
      requestConfirm({
        title: reason === 'close' ? '退出前保存修改？' : '存在未保存的修改',
        message: reason === 'close'
          ? '当前文档尚未保存，可以保存后退出或放弃这些修改。'
          : '保存当前文档后再继续，或放弃这些修改。',
        confirmText: reason === 'close' ? '保存并退出' : '保存并离开',
        secondaryText: reason === 'close' ? '不保存并退出' : '放弃修改',
        cancelText: '取消',
      }),
    save: () => editor?.save() ?? Promise.resolve(true),
  })
}

async function trySelectDocument(id: string): Promise<void> {
  if (id === selectedId.value) return
  if (!(await canLeaveCurrentNote())) return
  selectedId.value = id
}

function moveDocumentToFront(id: string): void {
  documentOrder.value = [id, ...documentOrder.value.filter((item) => item !== id)]
}

function removeDocumentFromOrder(id: string): void {
  documentOrder.value = documentOrder.value.filter((item) => item !== id)
}

function removeDocumentsFromOrder(ids: string[]): void {
  const excluded = new Set(ids)
  documentOrder.value = documentOrder.value.filter((id) => !excluded.has(id))
}

function handleReorder(
  sourceId: string,
  targetId: string,
  placement: DocumentDropPlacement,
): void {
  documentOrder.value = moveDocumentInOrder(
    documentOrder.value,
    sourceId,
    targetId,
    placement,
  )
}

function replaceDocumentInOrder(previousId: string | null, nextId: string): void {
  if (!previousId) {
    moveDocumentToFront(nextId)
    return
  }
  const index = documentOrder.value.indexOf(previousId)
  const remaining = documentOrder.value.filter((item) => item !== previousId && item !== nextId)
  if (index < 0) {
    documentOrder.value = [nextId, ...remaining]
    return
  }
  remaining.splice(Math.min(index, remaining.length), 0, nextId)
  documentOrder.value = remaining
}

async function tryCreateNote(): Promise<void> {
  if (!(await canLeaveCurrentNote())) return
  const created = await createNote()
  if (created) selectedId.value = created.id
}

async function initializeWorkspace(): Promise<void> {
  loading.value = true
  error.value = ''
  const bootstrap = await loadWorkspaceBootstrap(
    () => window.electronAPI.notes.getAll(),
    () => window.electronAPI.session.get(),
  )
  notes.value = bootstrap.notes

  if (bootstrap.notesError) {
    error.value = '加载笔记失败，请重启应用。'
    show(error.value, 'error')
    console.error('Failed to load notes:', bootstrap.notesError)
  }

  if (bootstrap.sessionError) {
    show('上次会话记录已损坏，已使用安全状态启动。', 'error')
    console.error('Failed to load session state:', bootstrap.sessionError)
  }

  try {
    const restored = await restoreSessionState(
      bootstrap.session,
      notes.value,
      (filePath) => window.electronAPI.files.openMarkdownPath(filePath),
    )
    externalFiles.value = restored.externalFiles
    documentOrder.value = restored.documentOrder
    selectedId.value = restored.selectedId
    if (restored.failedFilePaths.length > 0) {
      show(
        `${restored.failedFilePaths.length} 个上次打开的文件已移动、删除或无法读取，已跳过。`,
        'error',
      )
    }
  } catch (err) {
    documentOrder.value = notes.value.map((note) => note.id)
    selectedId.value = documentOrder.value[0] ?? null
    show('恢复上次会话失败，已使用安全状态启动。', 'error')
    console.error('Failed to restore session state:', err)
  } finally {
    sessionReady = true
    loading.value = false
  }
}

async function createNote(): Promise<Note | null> {
  error.value = ''
  try {
    const newNote = await window.electronAPI.notes.add({
      title: '未命名笔记',
      content: '',
    })
    notes.value.push(newNote)
    moveDocumentToFront(newNote.id)
    selectedId.value = newNote.id
    show('笔记已创建')
    return newNote
  } catch (err) {
    error.value = '新建笔记失败。'
    show(error.value, 'error')
    console.error('Failed to create note:', err)
    return null
  }
}

async function loadRecentFiles(): Promise<void> {
  try {
    recentFiles.value = await window.electronAPI.files.getRecent()
  } catch (err) {
    show('读取最近文件记录失败。', 'error')
    console.error('Failed to load recent files:', err)
  }
}

async function recordRecentFile(filePath: string): Promise<void> {
  try {
    recentFiles.value = await window.electronAPI.files.addRecent(filePath)
  } catch (err) {
    show('文件已打开，但最近文件记录保存失败。', 'error')
    console.error('Failed to record recent file:', err)
  }
}

async function handleSave(data: { id: string; title: string; content: string }): Promise<boolean> {
  error.value = ''
  if (activeExternalFile.value) {
    try {
      const savedFile = await window.electronAPI.files.saveMarkdown(
        activeExternalFile.value.filePath,
        data.content
      )
      externalFiles.value = upsertOpenMarkdownFile(
        externalFiles.value,
        savedFile,
        activeExternalFile.value.openedAt
      )
      show('文件已保存')
      return true
    } catch (err) {
      error.value = '保存 Markdown 文件失败。'
      show(error.value, 'error')
      console.error('Failed to save Markdown file:', err)
      return false
    }
  }

  try {
    const updated = await window.electronAPI.notes.update(data.id, {
      title: data.title,
      content: data.content,
    })
    const existing = notes.value.find((n) => n.id === data.id)
    if (existing) {
      Object.assign(existing, { title: data.title, content: data.content, updatedAt: updated.updatedAt })
    }
    moveDocumentToFront(data.id)
    show('笔记已保存')
    return true
  } catch (err) {
    error.value = '保存笔记失败。'
    show(error.value, 'error')
    console.error('Failed to save note:', err)
    return false
  }
}

async function handleOpenFile(): Promise<void> {
  error.value = ''
  try {
    const openedFile = await window.electronAPI.files.openMarkdown()
    if (!openedFile) return
    if (!(await canLeaveCurrentNote())) return
    await activateOpenedFile(openedFile)
  } catch (err) {
    error.value = '打开 Markdown 文件失败。'
    show(error.value, 'error')
    console.error('Failed to open Markdown file:', err)
  }
}

async function activateOpenedFile(openedFile: MarkdownFileDocument): Promise<void> {
  externalFiles.value = upsertOpenMarkdownFile(externalFiles.value, openedFile)
  const openedId = createOpenMarkdownFile(openedFile).id
  moveDocumentToFront(openedId)
  selectedId.value = openedId
  await recordRecentFile(openedFile.filePath)
  show(`已打开 ${openedFile.fileName}`)
}

async function handleOpenFilePath(
  filePath: string,
  source: 'recent' | 'drop' | 'system',
): Promise<void> {
  if (!(await canLeaveCurrentNote())) return

  try {
    const openedFile = await window.electronAPI.files.openMarkdownPath(filePath)
    await activateOpenedFile(openedFile)
  } catch (err) {
    const message = source === 'recent'
      ? '无法打开最近文件，文件可能已移动或删除。可点击右侧 × 移除记录。'
      : '无法打开该文件，请确认它存在且是 Markdown 文件。'
    show(message, 'error')
    console.error(`Failed to open Markdown file from ${source}:`, err)
  }
}

function queueOpenFilePath(
  filePath: string,
  source: 'recent' | 'drop' | 'system',
): void {
  openFileQueue = openFileQueue
    .then(() => handleOpenFilePath(filePath, source))
    .catch((err) => {
      show('处理文件打开请求失败。', 'error')
      console.error('Failed to process queued file open request:', err)
    })
}

async function handleRemoveRecent(filePath: string): Promise<void> {
  try {
    recentFiles.value = await window.electronAPI.files.removeRecent(filePath)
    show('最近文件记录已移除')
  } catch (err) {
    show('移除最近文件记录失败。', 'error')
    console.error('Failed to remove recent file:', err)
  }
}

async function handleRecentCloseRange(range: DocumentCloseRange, filePath: string): Promise<void> {
  const targets = resolveCloseRangeTargets(
    recentFiles.value.map((file) => file.filePath),
    range,
    filePath,
  )
  if (targets.length === 0) return

  try {
    let updated = recentFiles.value
    for (const target of targets) {
      updated = await window.electronAPI.files.removeRecent(target)
    }
    recentFiles.value = updated
    show(`已移除 ${targets.length} 条最近文件记录`)
  } catch (err) {
    try {
      recentFiles.value = await window.electronAPI.files.getRecent()
    } catch {
      recentFiles.value = []
    }
    show('移除最近文件记录失败。', 'error')
    console.error('Failed to remove recent files in range:', err)
  }
}

async function handleClearRecent(): Promise<void> {
  try {
    await window.electronAPI.files.clearRecent()
    recentFiles.value = []
    show('最近文件记录已清除')
  } catch (err) {
    show('清除最近文件记录失败。', 'error')
    console.error('Failed to clear recent files:', err)
  }
}

function isFileDrag(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false
}

function handleDragEnter(event: DragEvent): void {
  if (!isFileDrag(event)) return
  dragDepth += 1
  isDraggingFile.value = true
}

function handleDragOver(event: DragEvent): void {
  if (!isFileDrag(event)) return
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  isDraggingFile.value = true
}

function handleDragLeave(): void {
  if (!isDraggingFile.value) return
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) isDraggingFile.value = false
}

function handleDrop(event: DragEvent): void {
  dragDepth = 0
  isDraggingFile.value = false
  if (!isFileDrag(event)) return
  const result = getDroppedMarkdownFilePath(
    Array.from(event.dataTransfer?.files ?? []),
    (file) => window.electronAPI.files.getPathForFile(file),
  )
  if (result.status === 'unsupported') {
    show('仅支持拖入 .md 或 .markdown 文件。', 'error')
    return
  }
  if (result.status === 'missing-path') {
    show('无法取得拖入文件的本地路径。', 'error')
    return
  }
  queueOpenFilePath(result.filePath, 'drop')
}

async function handleSaveAs(): Promise<void> {
  const draft = noteEditorRef.value?.getDraft()
  if (!draft) {
    show('当前没有可保存的文档。', 'error')
    return
  }

  error.value = ''
  try {
    const sourcePath = activeExternalFile.value?.filePath ?? null
    const savedFile = await window.electronAPI.files.saveMarkdownAs(
      activeExternalFile.value?.fileName ?? draft.title,
      draft.content,
      sourcePath,
    )
    if (!savedFile) return

    const previousExternalId = activeExternalFile.value?.id ?? null
    externalFiles.value = replaceOpenMarkdownFile(
      externalFiles.value,
      previousExternalId,
      savedFile
    )
    const savedId = createOpenMarkdownFile(savedFile).id
    replaceDocumentInOrder(previousExternalId, savedId)
    selectedId.value = savedId
    await recordRecentFile(savedFile.filePath)
    show(`已另存为 ${savedFile.fileName}`)
  } catch (err) {
    error.value = '另存 Markdown 文件失败。'
    show(error.value, 'error')
    console.error('Failed to save Markdown file as:', err)
  }
}

async function handleFileCommand(command: FileCommand): Promise<void> {
  if (command === 'settings') {
    settingsOpen.value = true
    return
  }
  if (command === 'open') {
    await handleOpenFile()
    return
  }
  if (command === 'save-as') {
    await handleSaveAs()
    return
  }

  const editor = noteEditorRef.value
  if (!editor) {
    show('当前没有可保存的文档。', 'error')
    return
  }
  await editor.save()
}

async function handleSaveSettings(nextSettings: AppSettings): Promise<void> {
  settingsSaving.value = true
  try {
    await saveSettings(nextSettings)
    settingsOpen.value = false
    show('偏好设置已保存')
  } catch (err) {
    show('保存偏好设置失败，请检查本地数据目录权限。', 'error')
    console.error('Failed to save app settings:', err)
  } finally {
    settingsSaving.value = false
  }
}

function selectFallbackDocument(excludedId: string): void {
  selectedId.value = documentOrder.value.find((id) => id !== excludedId) ?? null
}

async function handleCloseListItem(id: string, kind: 'note' | 'file'): Promise<void> {
  if (kind === 'file') {
    if (id === selectedId.value && !(await canLeaveCurrentNote())) return
    externalFiles.value = removeOpenMarkdownFile(externalFiles.value, id)
    removeDocumentFromOrder(id)
    if (selectedId.value === id) {
      selectFallbackDocument(id)
    }
    show('文件已从列表关闭')
    return
  }

  const note = notes.value.find((item) => item.id === id)
  if (!note) return
  const result = await requestConfirm({
    title: '删除本地笔记',
    message: id === selectedId.value && noteEditorRef.value?.isDirty
      ? `“${note.title || '未命名笔记'}”及其未保存修改将被永久删除。`
      : `“${note.title || '未命名笔记'}”将被永久删除。`,
    confirmText: '删除',
    cancelText: '取消',
    danger: true,
  })
  if (result === 'confirm') {
    await handleDelete(id)
  }
}

async function handleCloseRange(range: DocumentCloseRange, id: string): Promise<void> {
  const targets = resolveCloseRangeTargets(documentOrder.value, range, id)
  if (targets.length === 0) return

  if (selectedId.value !== null && targets.includes(selectedId.value)) {
    if (!(await canLeaveCurrentNote())) return
  }

  const noteIds = targets.filter((item) => notes.value.some((note) => note.id === item))
  const fileIds = targets.filter((item) => externalFiles.value.some((file) => file.id === item))

  if (noteIds.length > 0) {
    const summary = noteIds.length === 1
      ? '该本地笔记将被永久删除'
      : `将永久删除 ${noteIds.length} 个本地笔记`
    const filePart = fileIds.length > 0 ? `，并关闭 ${fileIds.length} 个外部文件` : ''
    const result = await requestConfirm({
      title: '关闭标签',
      message: `${summary}${filePart}。`,
      confirmText: '关闭',
      cancelText: '取消',
      danger: true,
    })
    if (result !== 'confirm') return
  }

  const deletedNoteIds: string[] = []
  try {
    for (const noteId of noteIds) {
      await window.electronAPI.notes.delete(noteId)
      deletedNoteIds.push(noteId)
    }
  } catch (err) {
    show('部分本地笔记删除失败。', 'error')
    console.error('Failed to delete notes in range:', err)
  }
  notes.value = notes.value.filter((note) => !deletedNoteIds.includes(note.id))
  externalFiles.value = externalFiles.value.filter((file) => !fileIds.includes(file.id))

  const removedIds = [...deletedNoteIds, ...fileIds]
  removeDocumentsFromOrder(removedIds)
  if (selectedId.value !== null && removedIds.includes(selectedId.value)) {
    selectFallbackDocument(selectedId.value)
  }

  if (removedIds.length > 0) {
    const noteText = deletedNoteIds.length > 0 ? `已关闭 ${deletedNoteIds.length} 个本地笔记` : ''
    const fileText = fileIds.length > 0 ? `已关闭 ${fileIds.length} 个外部文件` : ''
    show([noteText, fileText].filter(Boolean).join('，'))
  }
}

async function handleOpenInExplorer(filePath: string): Promise<void> {
  try {
    const revealed = await window.electronAPI.files.revealInFolder(filePath)
    if (!revealed) {
      show('无法在资源管理器中打开，文件可能已移动或删除。', 'error')
    }
  } catch (err) {
    show('在资源管理器中打开失败。', 'error')
    console.error('Failed to reveal file in folder:', err)
  }
}

async function handleDelete(id: string): Promise<void> {
  error.value = ''
  try {
    await window.electronAPI.notes.delete(id)
    notes.value = notes.value.filter((n) => n.id !== id)
    removeDocumentFromOrder(id)
    if (selectedId.value === id) {
      selectFallbackDocument(id)
    }
    show('笔记已删除')
  } catch (err) {
    error.value = '删除笔记失败。'
    show(error.value, 'error')
    console.error('Failed to delete note:', err)
  }
}

function currentSessionState(): SessionState {
  return createSessionState(
    documentOrder.value,
    notes.value,
    externalFiles.value,
    selectedId.value,
  )
}

function queueSessionSave(state: SessionState): void {
  sessionSaveQueue = sessionSaveQueue
    .then(() => window.electronAPI.session.save(state))
    .then(() => {
      sessionSaveErrorVisible = false
    })
    .catch((err) => {
      if (!sessionSaveErrorVisible) {
        show('保存当前文档会话失败，下次启动可能无法恢复列表。', 'error')
        sessionSaveErrorVisible = true
      }
      console.error('Failed to save session state:', err)
    })
}

async function canCloseApp(): Promise<boolean> {
  if (!(await canLeaveCurrentNote('close'))) return false
  await sessionSaveQueue
  try {
    await window.electronAPI.session.save(currentSessionState())
    return true
  } catch (err) {
    show('保存当前文档会话失败，已取消退出。', 'error')
    console.error('Failed to save session before close:', err)
    return false
  }
}

watch(currentSessionState, (state) => {
  if (sessionReady) queueSessionSave(state)
})

onMounted(() => {
  noteListPanel.activate()
  unregisterCloseGuard = registerAppCloseGuard(canCloseApp)
  removeFileCommandListener = window.electronAPI.app.onFileCommand((command) => {
    void handleFileCommand(command)
  })
  removeOpenFileRequestListener = window.electronAPI.app.onOpenFileRequested((filePath) => {
    queueOpenFilePath(filePath, 'system')
  })
  const initialization = initializeWorkspace()
  openFileQueue = initialization.catch(() => undefined)
  void loadRecentFiles()
})

onUnmounted(() => {
  noteListPanel.deactivate()
  unregisterCloseGuard?.()
  removeFileCommandListener?.()
  removeOpenFileRequestListener?.()
})
</script>

<style scoped>
.notes-view {
  flex: 1;
  display: flex;
  height: 100%;
  min-width: 0;
  background: var(--color-surface);
  overflow: hidden;
  position: relative;
}

.file-drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-drop-overlay);
  border: 2px dashed var(--color-primary);
  pointer-events: none;
}

.file-drop-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 28px 36px;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  box-shadow: var(--shadow-md);
}

.file-drop-card strong {
  color: var(--color-primary);
  font-size: 16px;
}

.file-drop-card span:last-child {
  font-size: 11px;
}

.file-drop-icon {
  font-size: 30px;
  line-height: 1;
  color: var(--color-primary);
}
</style>
