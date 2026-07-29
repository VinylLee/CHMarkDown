<template>
  <div class="notes-view">
    <NoteList
      :notes="notes"
      :selectedId="externalFile ? null : selectedId"
      @select="trySelectNote"
      @create="tryCreateNote"
    />
    <NoteEditor
      ref="noteEditorRef"
      :note="activeDocument"
      :document-path="externalFile?.filePath ?? null"
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

const notes = ref<Note[]>([])
const selectedId = ref<string | null>(null)
const externalFile = ref<MarkdownFileDocument | null>(null)
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

const activeDocument = computed<Note | null>(() => {
  if (externalFile.value) {
    return {
      id: `file:${externalFile.value.filePath}`,
      title: externalFile.value.fileName,
      content: externalFile.value.content,
      createdAt: '',
      updatedAt: '',
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

async function trySelectNote(id: string): Promise<void> {
  if (!externalFile.value && id === selectedId.value) return
  if (!(await canLeaveCurrentNote())) return
  startInEditMode.value = false
  externalFile.value = null
  selectedId.value = id
}

async function tryCreateNote(): Promise<void> {
  if (!(await canLeaveCurrentNote())) return
  startInEditMode.value = true
  const created = await createNote()
  if (created) {
    externalFile.value = null
  }
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
  if (externalFile.value) {
    try {
      externalFile.value = await window.electronAPI.files.saveMarkdown(
        externalFile.value.filePath,
        data.content
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
    externalFile.value = openedFile
    selectedId.value = null
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
      externalFile.value?.fileName ?? draft.title,
      draft.content
    )
    if (!savedFile) return

    externalFile.value = savedFile
    selectedId.value = null
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

async function handleDelete(id: string): Promise<void> {
  error.value = ''
  try {
    await window.electronAPI.notes.delete(id)
    notes.value = notes.value.filter((n) => n.id !== id)
    if (selectedId.value === id) {
      selectedId.value = notes.value.length > 0 ? notes.value[0].id : null
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
