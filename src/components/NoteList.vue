<template>
  <div class="note-list-panel">
    <div class="panel-header">
      <span class="panel-title">笔记列表</span>
      <span class="panel-count" v-if="notes.length > 0">{{ notes.length }}</span>
    </div>
    <button class="btn-new-note" @click="$emit('create')">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 3V11M3 7H11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      新建笔记
    </button>
    <div class="note-list">
      <div v-if="notes.length === 0" class="empty-hint">
        <div class="empty-icon">📝</div>
        <p>还没有笔记</p>
        <p class="empty-sub">点击上方按钮创建第一篇</p>
      </div>
      <div
        v-for="note in sortedNotes"
        :key="note.id"
        class="note-item"
        :class="{ 'note-item--active': note.id === selectedId }"
        @click="$emit('select', note.id)"
      >
        <div class="note-item-head">
          <span class="note-item-title">{{ note.title || '未命名笔记' }}</span>
        </div>
        <div class="note-item-foot">
          <span class="note-item-time">{{ formatTime(note.updatedAt) }}</span>
          <span class="note-item-preview">{{ contentPreview(note.content) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  notes: Note[]
  selectedId: string | null
}>()

defineEmits<{
  select: [id: string]
  create: []
}>()

const sortedNotes = computed(() => {
  return [...props.notes].sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
})

function contentPreview(content: string): string {
  const plain = content.replace(/[#*>`\[\]!()~\-_]/g, '').trim()
  if (!plain) return '空笔记'
  return plain.length > 40 ? plain.slice(0, 40) + '…' : plain
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  if (diffHour < 24) return `${diffHour} 小时前`
  if (diffHour < 48) return '昨天'

  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}
</script>

<style scoped>
.note-list-panel {
  width: 260px;
  min-width: 260px;
  background: #f8f9fb;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px 0;
}

.panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.panel-count {
  font-size: 11px;
  font-weight: 600;
  background: var(--color-border);
  color: var(--color-text-secondary);
  padding: 1px 7px;
  border-radius: 8px;
}

.btn-new-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 10px 12px;
  padding: 8px 0;
  border: 1px dashed #d0d5dd;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.btn-new-note:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background-color: rgba(74, 158, 255, 0.04);
}

.note-list {
  flex: 1;
  overflow-y: auto;
}

.empty-hint {
  padding: 32px 16px;
  text-align: center;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.6;
}

.empty-hint p {
  color: var(--color-text-muted);
  font-size: 13px;
}

.empty-sub {
  font-size: 11px !important;
  margin-top: 2px;
  opacity: 0.7;
}

.note-item {
  padding: 11px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f0f2f5;
  transition: background-color var(--transition);
  border-left: 3px solid transparent;
}

.note-item:hover {
  background-color: #f0f2f5;
}

.note-item--active {
  background-color: #eaf2fd;
  border-left-color: var(--color-primary);
}

.note-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
}

.note-item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-item-foot {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.note-item-time {
  font-size: 10px;
  color: var(--color-text-muted);
}

.note-item-preview {
  font-size: 11px;
  color: #b0b7c3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
