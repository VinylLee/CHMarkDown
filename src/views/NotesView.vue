<template>
  <div class="notes-view">
    <NoteList
      :notes="notes"
      :external-files="externalFiles"
      :selectedId="selectedId"
      @select="trySelectDocument"
      @close="handleCloseListItem"
      @create="tryCreateNote"
    />
    <NoteEditor
      ref="noteEditorRef"
      :note="activeDocument"
      :document-path="activeExternalFile?.filePath ?? null"
      :startInEditMode="startInEditMode"
      :save-note="handleSave"
      @delete="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import NoteList from '../components/NoteList.vue'
import NoteEditor from '../components/NoteEditor.vue'
import { useConfirm } from '../composables/useConfirm'
import { useToast } from '../composables/useToast'
import { useNoteListPanel } from '../composables/useNoteListPanel'
import { resolveUnsavedChanges } from '../utils/resolveUnsavedChanges'
import { registerAppCloseGuard } from '../composables/useAppCloseGuard'
import {
  createOpenMarkdownFile,
  removeOpenMarkdownFile,
  replaceOpenMarkdownFile,
  upsertOpenMarkdownFile,
} from '../utils/openMarkdownFiles'
import type { OpenMarkdownFile } from '../utils/openMarkdownFiles'

const notes = ref<Note[]>([])
const selectedId = ref<string | null>(null)
const externalFiles = ref<OpenMarkdownFile[]>([])
const startInEditMode = ref(false)
const loading = ref(true)
const error = ref('')
const { show } = useToast()
const { requestConfirm } = useConfirm()
const noteListPanel = useNoteListPanel()
const noteEditorRef = ref<InstanceType<typeof NoteEditor> | null>(null)
let unregisterCloseGuard: (() => void) | null = null
let removeFileCommandListener: (() => void) | null = null

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
  startInEditMode.value = false
  selectedId.value = id
}

async function tryCreateNote(): Promise<void> {
  if (!(await canLeaveCurrentNote())) return
  startInEditMode.value = true
  const created = await createNote()
  if (created) selectedId.value = created.id
}

async function loadNotes(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    notes.value = await window.electronAPI.notes.getAll()
    if (notes.value.length > 0 && !selectedId.value) {
      selectedId.value = notes.value[0].id
    }
  } catch (err) {
    error.value = '加载笔记失败，请重启应用。'
    show(error.value, 'error')
    console.error('Failed to load notes:', err)
  } finally {
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

    startInEditMode.value = true
    externalFiles.value = upsertOpenMarkdownFile(externalFiles.value, openedFile)
    selectedId.value = createOpenMarkdownFile(openedFile).id
    show(`已打开 ${openedFile.fileName}`)
  } catch (err) {
    error.value = '打开 Markdown 文件失败。'
    show(error.value, 'error')
    console.error('Failed to open Markdown file:', err)
  }
}

async function handleSaveAs(): Promise<void> {
  const draft = noteEditorRef.value?.getDraft()
  if (!draft) {
    show('当前没有可保存的文档。', 'error')
    return
  }

  error.value = ''
  try {
    const savedFile = await window.electronAPI.files.saveMarkdownAs(
      activeExternalFile.value?.fileName ?? draft.title,
      draft.content
    )
    if (!savedFile) return

    const previousExternalId = activeExternalFile.value?.id ?? null
    externalFiles.value = replaceOpenMarkdownFile(
      externalFiles.value,
      previousExternalId,
      savedFile
    )
    selectedId.value = createOpenMarkdownFile(savedFile).id
    startInEditMode.value = true
    show(`已另存为 ${savedFile.fileName}`)
  } catch (err) {
    error.value = '另存 Markdown 文件失败。'
    show(error.value, 'error')
    console.error('Failed to save Markdown file as:', err)
  }
}

async function handleFileCommand(command: FileCommand): Promise<void> {
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

function selectFallbackDocument(excludedId: string): void {
  const nextExternalFile = externalFiles.value.find((file) => file.id !== excludedId)
  const nextNote = notes.value.find((note) => note.id !== excludedId)
  selectedId.value = nextExternalFile?.id ?? nextNote?.id ?? null
}

async function handleCloseListItem(id: string, kind: 'note' | 'file'): Promise<void> {
  if (kind === 'file') {
    if (id === selectedId.value && !(await canLeaveCurrentNote())) return
    externalFiles.value = removeOpenMarkdownFile(externalFiles.value, id)
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

async function handleDelete(id: string): Promise<void> {
  error.value = ''
  try {
    await window.electronAPI.notes.delete(id)
    notes.value = notes.value.filter((n) => n.id !== id)
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

onMounted(() => {
  noteListPanel.activate()
  unregisterCloseGuard = registerAppCloseGuard(() => canLeaveCurrentNote('close'))
  removeFileCommandListener = window.electronAPI.app.onFileCommand((command) => {
    void handleFileCommand(command)
  })
  void loadNotes()
})

onUnmounted(() => {
  noteListPanel.deactivate()
  unregisterCloseGuard?.()
  removeFileCommandListener?.()
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
}
</style>
