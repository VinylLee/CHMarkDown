<template>
  <aside class="document-outline" aria-label="文档大纲">
    <div class="outline-header">
      <strong>文档大纲</strong>
      <span>{{ headings.length }}</span>
    </div>
    <p v-if="headings.length === 0" class="outline-empty">当前文档没有标题</p>
    <nav v-else class="outline-list">
      <button
        v-for="heading in headings"
        :key="`${heading.line}:${heading.level}:${heading.text}`"
        class="outline-item"
        :style="{ paddingLeft: `${10 + (heading.level - 1) * 12}px` }"
        :title="`第 ${heading.line} 行：${heading.text}`"
        @click="$emit('navigate', heading.line)"
      >
        <span class="outline-level">H{{ heading.level }}</span>
        <span class="outline-text">{{ heading.text }}</span>
      </button>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import type { MarkdownHeading } from '../utils/markdownOutline'

defineProps<{ headings: MarkdownHeading[] }>()
defineEmits<{ navigate: [line: number] }>()
</script>

<style scoped>
.document-outline {
  width: 230px;
  min-width: 180px;
  max-width: 30%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--color-border);
  background: #fafbfc;
  overflow: hidden;
  flex-shrink: 0;
}

.outline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 11px;
}

.outline-header span {
  padding: 1px 6px;
  border-radius: 8px;
  background: var(--color-border);
  color: var(--color-text-muted);
  font-size: 10px;
}

.outline-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.outline-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 6px;
  padding-right: 10px;
  padding-bottom: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  text-align: left;
  cursor: pointer;
}

.outline-item:hover {
  background: #edf3fb;
  color: var(--color-primary);
}

.outline-level {
  width: 18px;
  flex-shrink: 0;
  color: var(--color-text-muted);
  font-size: 9px;
}

.outline-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}

.outline-empty {
  padding: 18px 12px;
  color: var(--color-text-muted);
  font-size: 11px;
  text-align: center;
}
</style>
