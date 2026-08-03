<template>
  <section class="document-search" aria-label="当前文档查找和替换">
    <div class="search-row">
      <input
        ref="queryInputRef"
        class="search-input"
        type="text"
        :value="query"
        placeholder="查找当前文档"
        aria-label="查找内容"
        @input="$emit('update:query', inputValue($event))"
        @keydown.enter.prevent="handleQueryEnter"
      />
      <span class="match-count" aria-live="polite">
        {{ matchCount > 0 ? `${currentMatch}/${matchCount}` : '0/0' }}
      </span>
      <button class="search-button" :disabled="matchCount === 0" title="上一个匹配 (Shift+Enter)" @click="$emit('previous')">↑</button>
      <button class="search-button" :disabled="matchCount === 0" title="下一个匹配 (Enter)" @click="$emit('next')">↓</button>
      <label class="search-option" title="区分大小写">
        <input type="checkbox" :checked="caseSensitive" @change="$emit('update:caseSensitive', checkedValue($event))" />
        Aa
      </label>
      <label class="search-option" title="仅匹配完整单词">
        <input type="checkbox" :checked="wholeWord" @change="$emit('update:wholeWord', checkedValue($event))" />
        全词
      </label>
      <button class="search-close" title="关闭查找 (Esc)" aria-label="关闭查找" @click="$emit('close')">×</button>
    </div>

    <div v-if="replaceVisible" class="search-row replace-row">
      <input
        class="search-input"
        type="text"
        :value="replacement"
        placeholder="替换为"
        aria-label="替换内容"
        @input="$emit('update:replacement', inputValue($event))"
        @keydown.enter.prevent="$emit('replace')"
      />
      <button class="replace-button" :disabled="matchCount === 0" @click="$emit('replace')">替换</button>
      <button class="replace-button" :disabled="matchCount === 0" @click="$emit('replaceAll')">全部替换</button>
      <span v-if="message" class="replace-message" aria-live="polite">{{ message }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  query: string
  replacement: string
  matchCount: number
  currentMatch: number
  caseSensitive: boolean
  wholeWord: boolean
  replaceVisible: boolean
  message: string
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  'update:replacement': [value: string]
  'update:caseSensitive': [value: boolean]
  'update:wholeWord': [value: boolean]
  previous: []
  next: []
  replace: []
  replaceAll: []
  close: []
}>()

const queryInputRef = ref<HTMLInputElement | null>(null)

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value
}

function checkedValue(event: Event): boolean {
  return (event.target as HTMLInputElement).checked
}

function handleQueryEnter(event: KeyboardEvent): void {
  if (event.shiftKey) {
    emit('previous')
  } else {
    emit('next')
  }
}

function focus(): void {
  queryInputRef.value?.focus()
  queryInputRef.value?.select()
}

defineExpose({ focus })
</script>

<style scoped>
.document-search {
  padding: 7px 14px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-muted);
  flex-shrink: 0;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.replace-row {
  margin-top: 6px;
}

.search-input {
  width: min(320px, 36vw);
  min-width: 140px;
  padding: 5px 8px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  outline: none;
  background: var(--color-control-bg);
  color: var(--color-text);
  font-size: 12px;
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.12);
}

.match-count {
  min-width: 38px;
  color: var(--color-text-muted);
  font-size: 11px;
  text-align: center;
}

.search-button,
.replace-button,
.search-close {
  min-height: 27px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-control-bg);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.search-button {
  width: 28px;
}

.replace-button {
  padding: 4px 10px;
  white-space: nowrap;
  font-size: 11px;
}

.search-close {
  width: 28px;
  margin-left: auto;
  border-color: transparent;
  background: transparent;
  font-size: 17px;
}

.search-button:hover:not(:disabled),
.replace-button:hover:not(:disabled),
.search-close:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.search-button:disabled,
.replace-button:disabled {
  opacity: 0.45;
  cursor: default;
}

.search-option {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--color-text-secondary);
  font-size: 11px;
  white-space: nowrap;
  cursor: pointer;
}

.search-option input {
  accent-color: var(--color-primary);
}

.replace-message {
  color: var(--color-primary);
  font-size: 11px;
}
</style>
