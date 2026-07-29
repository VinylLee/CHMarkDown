<template>
  <div class="todo-view">
    <div class="view-header">
      <h2 class="view-title">待办事项</h2>
      <span v-if="visibleTodos.length > 0" class="view-badge">{{ visibleTodos.length }}</span>
    </div>

    <TodoDateStrip
      :selected-date="selectedDate"
      :mode="dateViewMode"
      :todos="todos"
      @select-date="selectDate"
      @select-unscheduled="selectUnscheduled"
    />

    <TodoForm
      ref="todoFormRef"
      :default-due-date="dateViewMode === 'date' ? selectedDate : null"
      @add="handleAdd"
    />

    <div v-if="loading" class="status-message">
      <span class="spinner"></span> 加载中…
    </div>

    <div v-else-if="error" class="status-error">
      <span class="error-icon">⚠</span> {{ error }}
    </div>

    <div v-else-if="todos.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <p class="empty-text">还没有待办事项</p>
      <p class="empty-hint">在上方输入框添加你的第一个待办吧</p>
    </div>

    <div v-else-if="visibleTodos.length === 0" class="empty-state empty-state--filtered">
      <div class="empty-icon">{{ dateViewMode === 'date' ? '○' : '◇' }}</div>
      <p class="empty-text">{{ emptyTitle }}</p>
      <p class="empty-hint">{{ emptyHint }}</p>
    </div>

    <div v-else class="todo-list">
      <div class="todo-stats">
        <span>{{ completedCount }}/{{ visibleTodos.length }} 已完成</span>
        <div v-if="completedCount === visibleTodos.length && visibleTodos.length > 0" class="stats-done">🎉 全部完成！</div>
      </div>
      <TodoItem
        v-for="todo in sortedTodos"
        :key="todo.id"
        :todo="todo"
        @update="handleUpdate"
        @delete="handleDelete"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import TodoForm from '../components/TodoForm.vue'
import TodoItem from '../components/TodoItem.vue'
import TodoDateStrip from '../components/TodoDateStrip.vue'
import { useToast } from '../composables/useToast'
import { formatLocalDate } from '../utils/date'
import { filterTodosByDateView } from '../utils/todoDateFilter'

const todos = ref<Todo[]>([])
const loading = ref(true)
const error = ref('')
const todoFormRef = ref<InstanceType<typeof TodoForm> | null>(null)
const { show } = useToast()
const selectedDate = ref(formatLocalDate(new Date()))
const dateViewMode = ref<'date' | 'unscheduled'>('date')

const visibleTodos = computed(() => {
  return filterTodosByDateView(
    todos.value,
    dateViewMode.value === 'date'
      ? { type: 'date', date: selectedDate.value }
      : { type: 'unscheduled' }
  )
})

const completedCount = computed(() => visibleTodos.value.filter((t) => t.completed).length)

const sortedTodos = computed(() => {
  return [...visibleTodos.value].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

const emptyTitle = computed(() => {
  return dateViewMode.value === 'date' ? '这一天还没有待办' : '没有未排期的待办'
})

const emptyHint = computed(() => {
  return dateViewMode.value === 'date'
    ? '在上方输入内容，新增事项会自动安排到当前日期'
    : '在日期输入框中清除日期，即可创建未排期待办'
})

function selectDate(date: string): void {
  selectedDate.value = date
  dateViewMode.value = 'date'
}

function selectUnscheduled(): void {
  dateViewMode.value = 'unscheduled'
}

async function loadTodos(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    todos.value = await window.electronAPI.todos.getAll()
  } catch (err) {
    error.value = '加载待办事项失败，请重启应用。'
    console.error('Failed to load todos:', err)
  } finally {
    loading.value = false
  }
}

async function handleAdd(data: {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  dueDate: string | null
}): Promise<void> {
  error.value = ''
  try {
    const newTodo = await window.electronAPI.todos.add(data)
    todos.value.push(newTodo)
    show('待办已添加')
  } catch (err) {
    error.value = '新增待办事项失败。'
    console.error('Failed to add todo:', err)
  }
}

async function handleUpdate(id: string, updates: Partial<Todo>): Promise<void> {
  error.value = ''
  try {
    const updated = await window.electronAPI.todos.update(id, updates)
    const existing = todos.value.find((t) => t.id === id)
    if (existing) {
      Object.assign(existing, updates, { updatedAt: updated.updatedAt })
    }
    if (updates.completed !== undefined) {
      show(updates.completed ? '已标记完成' : '已恢复为未完成')
    } else {
      show('待办已更新')
    }
  } catch (err) {
    error.value = '更新待办事项失败。'
    console.error('Failed to update todo:', err)
  }
}

async function handleDelete(id: string): Promise<void> {
  error.value = ''
  try {
    await window.electronAPI.todos.delete(id)
    todos.value = todos.value.filter((t) => t.id !== id)
    show('待办已删除')
  } catch (err) {
    error.value = '删除待办事项失败。'
    console.error('Failed to delete todo:', err)
  }
}

onMounted(() => {
  loadTodos()
})
</script>

<style scoped>
.todo-view {
  max-width: 750px;
  margin: 0 auto;
}

.view-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.view-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}

.view-badge {
  background: var(--color-primary);
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.status-message {
  text-align: center;
  padding: 40px 0;
  color: var(--color-text-muted);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e0e0e0;
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-error {
  text-align: center;
  padding: 32px 16px;
  color: var(--color-danger);
  font-size: 14px;
  background: var(--color-danger-bg);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.error-icon {
  font-size: 16px;
}

.empty-state {
  text-align: center;
  padding: 60px 0;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state--filtered .empty-icon {
  color: #b9c7d8;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 42px;
}

.empty-text {
  color: var(--color-text-secondary);
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
}

.empty-hint {
  color: var(--color-text-muted);
  font-size: 13px;
}

.todo-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 10px;
}

.stats-done {
  font-size: 12px;
  color: var(--color-success);
}
</style>
