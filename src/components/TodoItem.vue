<template>
  <div class="todo-item" :class="{ 'todo-item--completed': todo.completed, 'todo-item--editing': isEditing }">
    <div v-if="!isEditing" class="todo-view">
      <button class="todo-check-btn" @click="toggleComplete" :title="todo.completed ? '恢复未完成' : '标记完成'">
        <svg v-if="todo.completed" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" fill="#22c55e" stroke="#22c55e" stroke-width="1.5"/>
          <path d="M6.5 10L9 12.5L13.5 7.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8.5" stroke="#c0c0c0" stroke-width="1.5"/>
        </svg>
      </button>

      <div class="todo-body" @dblclick="startEdit">
        <div class="todo-header">
          <span class="todo-title">{{ todo.title }}</span>
          <span class="todo-priority" :class="'priority--' + todo.priority">
            {{ priorityLabel }}
          </span>
        </div>
        <div class="todo-meta">
          <span v-if="todo.dueDate" class="todo-due" :class="{ 'todo-due--overdue': isOverdue }">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" class="meta-icon">
              <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" stroke-width="1"/>
              <path d="M1 4.5H11" stroke="currentColor" stroke-width="1"/>
              <path d="M4 1V2.5M8 1V2.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
            </svg>
            {{ formatDate(todo.dueDate) }}
          </span>
          <span v-if="todo.description" class="todo-desc">{{ todo.description }}</span>
        </div>
      </div>

      <div class="todo-actions">
        <button class="btn-icon" title="编辑" @click="startEdit">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10 1.5L12.5 4L5 11.5L2 12.5L2.5 9.5L10 1.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="btn-icon btn-icon--danger" title="删除" @click="handleDelete">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 4H11.5M5.5 6V10M8.5 6V10M3.5 4L4.5 12.5H9.5L10.5 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <div v-else class="todo-edit">
      <div class="edit-row">
        <input
          v-model="editTitle"
          type="text"
          class="edit-input-title"
          placeholder="待办标题"
          maxlength="200"
          ref="editTitleInput"
          @keydown.enter="saveEdit"
          @keydown.escape="cancelEdit"
        />
      </div>
      <div class="edit-row edit-options">
        <PriorityPicker v-model="editPriority" compact />
        <input v-model="editDueDate" type="date" class="edit-date" />
        <input
          v-model="editDescription"
          type="text"
          class="edit-desc"
          placeholder="备注（可选）"
          maxlength="500"
        />
      </div>
      <div class="edit-actions">
        <button class="btn btn-save" :disabled="!editTitle.trim()" @click="saveEdit">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          保存
        </button>
        <button class="btn btn-cancel" @click="cancelEdit">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useConfirm } from '../composables/useConfirm'
import PriorityPicker from './PriorityPicker.vue'

const props = defineProps<{
  todo: Todo
}>()

const emit = defineEmits<{
  update: [id: string, updates: Partial<Todo>]
  delete: [id: string]
}>()

const isEditing = ref(false)
const editTitle = ref('')
const editDescription = ref('')
const editPriority = ref<'low' | 'medium' | 'high'>('medium')
const editDueDate = ref('')
const editTitleInput = ref<HTMLInputElement | null>(null)
const { requestConfirm } = useConfirm()

const priorityLabel = computed(() => {
  const map: Record<string, string> = { low: '低', medium: '中', high: '高' }
  return map[props.todo.priority] || '中'
})

const isOverdue = computed(() => {
  if (!props.todo.dueDate || props.todo.completed) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(props.todo.dueDate) < today
})

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toggleComplete(): void {
  emit('update', props.todo.id, { completed: !props.todo.completed })
}

function startEdit(): void {
  editTitle.value = props.todo.title
  editDescription.value = props.todo.description
  editPriority.value = props.todo.priority
  editDueDate.value = props.todo.dueDate || ''
  isEditing.value = true
  nextTick(() => {
    editTitleInput.value?.focus()
  })
}

function saveEdit(): void {
  const trimmedTitle = editTitle.value.trim()
  if (!trimmedTitle) return

  emit('update', props.todo.id, {
    title: trimmedTitle,
    description: editDescription.value.trim(),
    priority: editPriority.value,
    dueDate: editDueDate.value || null,
  })
  isEditing.value = false
}

function cancelEdit(): void {
  isEditing.value = false
}

async function handleDelete(): Promise<void> {
  const result = await requestConfirm({
    title: '删除待办事项',
    message: '删除后无法恢复，确定要继续吗？',
    confirmText: '删除',
    cancelText: '取消',
    danger: true,
  })
  if (result === 'confirm') {
    emit('delete', props.todo.id)
  }
}
</script>

<style scoped>
.todo-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition);
}

.todo-item:hover {
  border-color: #d0d7e0;
  box-shadow: var(--shadow-sm);
}

.todo-item + .todo-item {
  margin-top: 6px;
}

.todo-item--completed {
  opacity: 0.7;
  background: #fafbfc;
}

.todo-item--editing {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(74, 158, 255, 0.08);
}

.todo-view {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
}

.todo-check-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 0 0;
  display: flex;
  align-items: center;
  border-radius: 50%;
  transition: transform var(--transition);
}

.todo-check-btn:hover {
  transform: scale(1.15);
}

.todo-body {
  flex: 1;
  min-width: 0;
  cursor: default;
  padding-top: 1px;
}

.todo-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.todo-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  word-break: break-word;
}

.todo-item--completed .todo-title {
  text-decoration: line-through;
  color: var(--color-text-muted);
}

.todo-priority {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.3px;
}

.priority--high {
  background-color: #fee2e2;
  color: #dc2626;
}

.priority--medium {
  background-color: #fef3c7;
  color: #d97706;
}

.priority--low {
  background-color: #e0edfb;
  color: #4a7db5;
}

.todo-meta {
  display: flex;
  gap: 14px;
  margin-top: 5px;
  font-size: 12px;
  color: var(--color-text-secondary);
  flex-wrap: wrap;
  align-items: center;
}

.meta-icon {
  flex-shrink: 0;
  margin-right: 1px;
  vertical-align: -1px;
}

.todo-due {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.todo-due--overdue {
  color: var(--color-danger);
  font-weight: 600;
}

.todo-desc {
  color: var(--color-text-muted);
  word-break: break-word;
  font-style: italic;
}

.todo-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity var(--transition);
}

.todo-item:hover .todo-actions {
  opacity: 1;
}

.btn-icon {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
}

.btn-icon:hover {
  background-color: #f3f4f6;
  color: var(--color-text);
}

.btn-icon--danger:hover {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
}

/* Edit mode */
.todo-edit {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.edit-row {
  display: flex;
  gap: 8px;
}

.edit-options {
  align-items: center;
}

.edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 2px;
}

.edit-input-title {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  font-size: 14px;
  outline: none;
  box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.08);
}

.edit-date {
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  outline: none;
  color-scheme: light;
}

.edit-desc {
  flex: 1;
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  outline: none;
}

.edit-desc:focus,
.edit-date:focus {
  border-color: var(--color-primary);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 14px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.btn-save {
  background-color: var(--color-primary);
  color: #ffffff;
}

.btn-save:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.btn-save:disabled {
  background-color: #b4d5fb;
  cursor: not-allowed;
}

.btn-cancel {
  background-color: #f3f4f6;
  color: var(--color-text-secondary);
}

.btn-cancel:hover {
  background-color: #e5e7eb;
  color: var(--color-text);
}
</style>
