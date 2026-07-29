<template>
  <div
    class="note-list-panel"
    :class="{ 'note-list-panel--collapsed': panel.state.collapsed, 'note-list-panel--resizing': panel.resizeState.isResizing }"
    :style="{ width: panel.state.collapsed ? '0px' : panel.state.width + 'px' }"
  >
    <!-- Expand button (visible when collapsed) -->
    <button
      v-if="panel.state.collapsed"
      class="notelist-expand-btn"
      @click="panel.expand()"
      title="展开笔记列表 (Ctrl+Shift+B)"
      aria-label="展开笔记列表"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <!-- Content: hidden when collapsed -->
    <div class="note-list-content" v-show="!panel.state.collapsed">
      <div class="panel-header">
        <span class="panel-title">笔记列表</span>
        <div class="panel-header-actions">
          <span class="notelist-shortcut">Ctrl+Shift+B</span>
          <span class="panel-count" v-if="notes.length > 0">{{ notes.length }}</span>
          <button
            class="notelist-collapse-btn"
            @click="panel.collapse()"
            title="折叠笔记列表 (Ctrl+Shift+B)"
            aria-label="折叠笔记列表"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2.5L4 6L7.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
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

    <!-- Resize handle (hidden when collapsed) -->
    <ResizeHandle
      v-if="!panel.state.collapsed"
      class="notelist-resize-handle"
      :isDragging="panel.resizeState.isResizing"
      @resizestart="panel.onResizeMouseDown"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNoteListPanel } from '../composables/useNoteListPanel'
import ResizeHandle from './ResizeHandle.vue'

const panel = useNoteListPanel()

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
  min-width: 0;
  background: #f8f9fb;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  transition: width var(--transition);
  overflow: hidden;
  position: relative;
}

.note-list-panel--collapsed {
  overflow: visible;
  border-right: none;
}

.note-list-panel--resizing {
  transition: none;
}

.note-list-panel--resizing .note-list-content {
  pointer-events: none;
}

/* Content wrapper: fade out on collapse */
.note-list-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  opacity: 1;
  transition: opacity 0.15s ease;
}

.note-list-panel--collapsed .note-list-content {
  opacity: 0;
}

/* Position the resize handle on the right edge */
.notelist-resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px 0;
}

.panel-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Shortcut hint text */
.notelist-shortcut {
  font-size: 9px;
  color: var(--color-text-muted);
  opacity: 0.6;
  letter-spacing: 0.2px;
  white-space: nowrap;
}

.panel-count {
  font-size: 11px;
  font-weight: 600;
  background: var(--color-border);
  color: var(--color-text-secondary);
  padding: 1px 7px;
  border-radius: 8px;
}

/* Collapse toggle button */
.notelist-collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background-color var(--transition), color var(--transition), border-color var(--transition);
  flex-shrink: 0;
}

.notelist-collapse-btn:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #ffffff;
}

/* Floating expand button (visible when collapsed) */
.notelist-expand-btn {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 48px;
  border: 1px solid var(--color-border);
  border-left: none;
  border-radius: 0 6px 6px 0;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  box-shadow: var(--shadow-sm);
  transition: background-color var(--transition), color var(--transition);
}

.notelist-expand-btn:hover {
  background: var(--color-primary);
  color: #ffffff;
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
