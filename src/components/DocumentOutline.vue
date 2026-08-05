<template>
  <aside class="document-outline" aria-label="文档大纲">
    <div class="outline-header">
      <strong>文档大纲</strong>
      <span>{{ headings.length }}</span>
    </div>
    <p v-if="headings.length === 0" class="outline-empty">当前文档没有标题</p>
    <nav v-else class="outline-list">
      <div
        v-for="item in visibleItems"
        :key="`${item.heading.line}:${item.heading.level}:${item.heading.text}`"
        class="outline-row"
        :style="{ paddingLeft: `${10 + (item.heading.level - 1) * 12}px` }"
      >
        <button
          v-if="item.hasChildren"
          type="button"
          class="outline-toggle"
          :class="{ 'outline-toggle--collapsed': collapsedLines.has(item.heading.line) }"
          :aria-expanded="!collapsedLines.has(item.heading.line)"
          :aria-label="`${collapsedLines.has(item.heading.line) ? '展开' : '收起'} ${item.heading.text}`"
          @click="toggleCollapsed(item.heading.line, $event.shiftKey)"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
            <path d="M2 1L6 4L2 7Z" fill="currentColor" />
          </svg>
        </button>
        <span v-else class="outline-toggle outline-toggle--spacer" aria-hidden="true"></span>
        <button
          type="button"
          class="outline-item"
          :title="`第 ${item.heading.line} 行：${item.heading.text}`"
          @click="$emit('navigate', item.heading.line)"
        >
          <span class="outline-level">H{{ item.heading.level }}</span>
          <span class="outline-text">{{ item.heading.text }}</span>
        </button>
      </div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import {
  applySameLevelCollapse,
  buildOutlineTree,
  collectVisibleOutlineItems,
  type MarkdownHeading,
} from '../utils/markdownOutline'

const props = defineProps<{ headings: MarkdownHeading[] }>()
const emit = defineEmits<{ navigate: [line: number] }>()

const outlineTree = computed(() => buildOutlineTree(props.headings))
const collapsedLines = reactive(new Set<number>())

const visibleItems = computed(() =>
  collectVisibleOutlineItems(outlineTree.value, collapsedLines),
)

function toggleCollapsed(line: number, sameLevel: boolean): void {
  if (sameLevel) {
    const next = applySameLevelCollapse(props.headings, line, collapsedLines)
    collapsedLines.clear()
    next.forEach((value) => collapsedLines.add(value))
    return
  }
  if (collapsedLines.has(line)) {
    collapsedLines.delete(line)
  } else {
    collapsedLines.add(line)
  }
}
</script>

<style scoped>
.document-outline {
  width: 230px;
  min-width: 180px;
  max-width: 30%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--color-border);
  background: var(--color-surface-soft);
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

.outline-row {
  width: 100%;
  display: flex;
  align-items: center;
  padding-right: 10px;
}

.outline-toggle {
  width: 18px;
  height: 22px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.outline-toggle:hover {
  color: var(--color-primary);
}

.outline-toggle svg {
  transition: transform 0.14s ease;
}

.outline-toggle--collapsed svg {
  transform: rotate(-90deg);
}

.outline-toggle--spacer {
  cursor: default;
}

.outline-item {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 6px;
  padding-bottom: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  text-align: left;
  cursor: pointer;
}

.outline-item:hover {
  background: var(--color-active);
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
