<template>
  <div class="notes-view">
    <NoteList
      :notes="notes"
      :selectedId="selectedId"
      @select="trySelectNote"
      @create="tryCreateNote"
    />
    <NoteEditor
      ref="noteEditorRef"
      :note="selectedNote"
      :startInEditMode="startInEditMode"
      :save-note="handleSave"
      @delete="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import NoteList from '../components/NoteList.vue'
import NoteEditor from '../components/NoteEditor.vue'
import { useConfirm } from '../composables/useConfirm'
import { useToast } from '../composables/useToast'
import { useNoteListPanel } from '../composables/useNoteListPanel'
import { resolveUnsavedChanges } from '../utils/resolveUnsavedChanges'
import { registerAppCloseGuard } from '../composables/useAppCloseGuard'

const notes = ref<Note[]>([])
const selectedId = ref<string | null>(null)
const startInEditMode = ref(false)
const loading = ref(true)
const error = ref('')
const { show } = useToast()
const { requestConfirm } = useConfirm()
const noteListPanel = useNoteListPanel()
const noteEditorRef = ref<InstanceType<typeof NoteEditor> | null>(null)
let unregisterCloseGuard: (() => void) | null = null

const selectedNote = computed(() => {
  if (!selectedId.value) return null
  return notes.value.find((n) => n.id === selectedId.value) || null
})

async function canLeaveCurrentNote(reason: 'navigate' | 'close' = 'navigate'): Promise<boolean> {
  const editor = noteEditorRef.value
  return resolveUnsavedChanges({
    dirty: editor?.isDirty ?? false,
    choose: () =>
      requestConfirm({
        title: reason === 'close' ? '退出前保存修改？' : '存在未保存的修改',
        message: reason === 'close'
          ? '当前笔记尚未保存，可以保存后退出或放弃这些修改。'
          : '保存当前笔记后再继续，或放弃这些修改。',
        confirmText: reason === 'close' ? '保存并退出' : '保存并离开',
        secondaryText: reason === 'close' ? '不保存并退出' : '放弃修改',
        cancelText: '取消',
      }),
    save: () => editor?.save() ?? Promise.resolve(true),
  })
}

async function trySelectNote(id: string): Promise<void> {
  if (id === selectedId.value) return
  if (!(await canLeaveCurrentNote())) return
  startInEditMode.value = false
  selectedId.value = id
}

async function tryCreateNote(): Promise<void> {
  if (!(await canLeaveCurrentNote())) return
  startInEditMode.value = true
  await createNote()
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

async function createNote(): Promise<void> {
  error.value = ''
  try {
    const newNote = await window.electronAPI.notes.add({
      title: '未命名笔记',
      content: '',
    })
    notes.value.push(newNote)
    selectedId.value = newNote.id
    show('笔记已创建')
  } catch (err) {
    error.value = '新建笔记失败。'
    show(error.value, 'error')
    console.error('Failed to create note:', err)
  }
}

async function handleSave(data: { id: string; title: string; content: string }): Promise<boolean> {
  error.value = ''
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
  loadNotes()
})

onUnmounted(() => {
  noteListPanel.deactivate()
  unregisterCloseGuard?.()
})

onBeforeRouteLeave(() => canLeaveCurrentNote())
</script>

<style scoped>
.notes-view {
  display: flex;
  height: calc(100% + 48px);
  margin: -24px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);
}
</style>
