<template>
  <form class="todo-form" @submit.prevent="handleSubmit">
    <div class="form-row">
      <input
        v-model="title"
        type="text"
        class="input-title"
        placeholder="输入新的待办事项…"
        maxlength="200"
        ref="titleInput"
      />
      <button type="submit" class="btn btn-add" :disabled="!title.trim()">
        <span class="btn-add-icon">+</span> 新增
      </button>
    </div>
    <div class="form-row form-options">
      <PriorityPicker v-model="priority" />
      <input
        v-model="description"
        type="text"
        class="input-desc"
        placeholder="备注（可选）"
        maxlength="500"
      />
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import PriorityPicker from './PriorityPicker.vue'

const props = defineProps<{
  defaultDueDate: string | null
}>()

const emit = defineEmits<{
  add: [data: { title: string; description: string; priority: 'low' | 'medium' | 'high'; dueDate: string | null }]
}>()

const title = ref('')
const description = ref('')
const priority = ref<'low' | 'medium' | 'high'>('medium')
const titleInput = ref<HTMLInputElement | null>(null)

function handleSubmit(): void {
  const trimmedTitle = title.value.trim()
  if (!trimmedTitle) return

  emit('add', {
    title: trimmedTitle,
    description: description.value.trim(),
    priority: priority.value,
    dueDate: props.defaultDueDate,
  })

  title.value = ''
  description.value = ''
  priority.value = 'medium'

  nextTick(() => {
    titleInput.value?.focus()
  })
}

defineExpose({ focus: () => titleInput.value?.focus() })
</script>

<style scoped>
.todo-form {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 18px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition);
}

.todo-form:focus-within {
  box-shadow: var(--shadow-md);
  border-color: #d0d7e0;
}

.form-row {
  display: flex;
  gap: 8px;
}

.form-row + .form-row {
  margin-top: 10px;
}

.input-title {
  flex: 1;
  padding: 9px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition);
  background: #fafbfc;
}

.input-title:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(74, 158, 255, 0.1);
  background: #ffffff;
}

.btn {
  padding: 9px 18px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
}

.btn-add {
  background-color: var(--color-primary);
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-add-icon {
  font-size: 18px;
  font-weight: 400;
  line-height: 1;
}

.btn-add:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
  box-shadow: 0 2px 8px rgba(74, 158, 255, 0.3);
}

.btn-add:disabled {
  background-color: #b4d5fb;
  cursor: not-allowed;
  box-shadow: none;
}

.form-options {
  align-items: center;
}

.input-desc {
  flex: 1;
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 12px;
  outline: none;
  background: #fafbfc;
  transition: border-color var(--transition);
}

.input-desc:focus {
  border-color: var(--color-primary);
}
</style>
