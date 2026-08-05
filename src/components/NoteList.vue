<template>
  <div
    class="note-list-panel"
    :class="{
      'note-list-panel--collapsed': panel.state.collapsed,
      'note-list-panel--resizing': panel.resizeState.isResizing,
      'note-list-panel--recent-resizing': recentFilesSection.resizeState.isResizing,
    }"
    :style="{ width: panel.state.collapsed ? '0px' : panel.state.width + 'px' }"
  >
    <!-- Expand button (visible when collapsed) -->
    <button
      v-if="panel.state.collapsed"
      class="notelist-expand-btn"
      @click="panel.expand()"
      title="展开笔记列表 (Ctrl+B)"
      aria-label="展开笔记列表"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <!-- Content: hidden when collapsed -->
    <div class="note-list-content" v-show="!panel.state.collapsed">
      <div class="panel-header">
        <span class="panel-title">文档列表</span>
        <div class="panel-header-actions">
          <span class="notelist-shortcut">Ctrl+B</span>
          <span class="panel-count" v-if="documentCount > 0">{{ documentCount }}</span>
          <button
            class="notelist-settings-btn"
            title="编辑器偏好设置"
            aria-label="打开编辑器偏好设置"
            @click="$emit('settings')"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="2" stroke="currentColor" stroke-width="1.2" />
              <path d="M6 1.5V2.5M6 9.5V10.5M1.5 6H2.5M9.5 6H10.5M2.8 2.8L3.5 3.5M8.5 8.5L9.2 9.2M9.2 2.8L8.5 3.5M3.5 8.5L2.8 9.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
            </svg>
          </button>
          <button
            class="notelist-collapse-btn"
            @click="panel.collapse()"
            title="折叠笔记列表 (Ctrl+B)"
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
      <section
        class="recent-files"
        :class="{ 'recent-files--collapsed': recentFilesSection.state.collapsed }"
        :style="recentFilesSection.state.collapsed ? undefined : { height: `${recentFilesSection.state.height}px` }"
        aria-label="最近文件"
      >
        <div class="recent-files-header">
          <button
            class="recent-files-toggle"
            :aria-expanded="!recentFilesSection.state.collapsed"
            aria-controls="recent-files-content"
            :title="recentFilesSection.state.collapsed ? '展开最近文件' : '折叠最近文件'"
            @click="recentFilesSection.toggle()"
          >
            <svg
              class="recent-files-chevron"
              :class="{ 'recent-files-chevron--collapsed': recentFilesSection.state.collapsed }"
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              aria-hidden="true"
            >
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>最近文件</span>
            <span v-if="recentFiles.length > 0" class="recent-files-count">{{ recentFiles.length }}</span>
          </button>
          <button
            v-if="recentFiles.length > 0 && !recentFilesSection.state.collapsed"
            class="recent-clear"
            title="清除最近文件记录"
            @click="$emit('clearRecent')"
          >
            清除
          </button>
        </div>
        <div v-show="!recentFilesSection.state.collapsed" id="recent-files-content" class="recent-files-content">
          <p v-if="recentFiles.length === 0" class="recent-empty">暂无最近文件</p>
          <div v-else class="recent-file-list">
            <div
              v-for="file in recentFiles"
              :key="file.filePath.toLowerCase()"
              class="recent-file-item"
              :title="file.filePath"
              @click="$emit('openRecent', file.filePath)"
              @contextmenu.prevent="openRecentContextMenu($event, file.filePath)"
            >
              <div class="recent-file-text">
                <span class="recent-file-name">{{ file.fileName }}</span>
                <span class="recent-file-path">{{ file.filePath }}</span>
              </div>
              <button
                class="recent-file-remove"
                :aria-label="`移除 ${file.fileName} 的最近记录`"
                title="从最近文件中移除"
                @click.stop="$emit('removeRecent', file.filePath)"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </section>
      <div
        v-if="!recentFilesSection.state.collapsed"
        class="recent-files-resize-handle"
        :class="{ 'recent-files-resize-handle--active': recentFilesSection.resizeState.isResizing }"
        role="separator"
        aria-orientation="horizontal"
        title="拖动调整最近文件高度"
        @mousedown="recentFilesSection.onResizeMouseDown"
      ></div>
      <div class="note-list" @dblclick="handleNoteListBlankClick">
        <div v-if="documentCount === 0" class="empty-hint">
          <div class="empty-icon">📝</div>
          <p>还没有笔记</p>
          <p class="empty-sub">点击上方按钮创建第一篇</p>
        </div>
        <div
          v-for="document in orderedDocuments"
          :key="document.id"
          class="note-item"
          :class="{
            'note-item--active': document.id === selectedId,
            'note-item--dragging': draggingId === document.id,
            'note-item--drop-before': dropTarget?.id === document.id && dropTarget.placement === 'before',
            'note-item--drop-after': dropTarget?.id === document.id && dropTarget.placement === 'after',
          }"
          draggable="true"
          @click="$emit('select', document.id)"
          @contextmenu.prevent="openContextMenu($event, document.id)"
          @dragstart="handleDragStart($event, document.id)"
          @dragover="handleDragOver($event, document.id)"
          @dragleave="handleDragLeave"
          @drop="handleDrop($event, document.id)"
          @dragend="handleDragEnd"
        >
          <div class="note-item-head">
            <span class="note-item-title">
              <span v-if="document.kind === 'file'" class="document-kind">文件</span>
              <span class="note-title-text">{{ document.title || '未命名笔记' }}</span>
            </span>
            <button
              class="note-item-close"
              :title="document.kind === 'file' ? '关闭文件' : '删除本地笔记'"
              :aria-label="document.kind === 'file' ? `关闭 ${document.title}` : `删除 ${document.title}`"
              @click.stop="$emit('close', document.id, document.kind)"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="note-item-foot">
            <span class="note-item-time">{{ formatTime(document.updatedAt) }}</span>
            <span class="note-item-preview">{{ contentPreview(document.content) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="contextMenu"
      class="context-menu-backdrop"
      @click="closeContextMenu"
      @contextmenu.prevent="closeContextMenu"
    ></div>
    <div
      v-if="contextMenu"
      class="context-menu"
      role="menu"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      @contextmenu.prevent
    >
      <button
        type="button"
        class="context-menu-item"
        role="menuitem"
        :disabled="aboveCount === 0"
        @click="emitCloseRange('above')"
      >
        {{ contextMenu.source === 'recent' ? '关闭以上' : '关闭以上标签' }}
      </button>
      <button
        type="button"
        class="context-menu-item"
        role="menuitem"
        :disabled="belowCount === 0"
        @click="emitCloseRange('below')"
      >
        {{ contextMenu.source === 'recent' ? '关闭以下' : '关闭以下标签' }}
      </button>
      <button
        type="button"
        class="context-menu-item"
        role="menuitem"
        :disabled="othersCount === 0"
        @click="emitCloseRange('others')"
      >
        {{ contextMenu.source === 'recent' ? '关闭其他' : '关闭其他标签' }}
      </button>
      <template v-if="contextMenu.source === 'recent' || contextMenu.kind === 'file'">
        <div class="context-menu-sep" role="separator"></div>
        <button
          type="button"
          class="context-menu-item"
          role="menuitem"
          @click="handleOpenInExplorer"
        >
          在资源管理器中打开
        </button>
      </template>
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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useNoteListPanel } from '../composables/useNoteListPanel'
import { useRecentFilesSection } from '../composables/useRecentFilesSection'
import type { DocumentCloseRange } from '../utils/documentCloseRange'
import type { DocumentDropPlacement } from '../utils/documentOrder'
import ResizeHandle from './ResizeHandle.vue'
import type { OpenMarkdownFile } from '../utils/openMarkdownFiles'

const panel = useNoteListPanel()
const recentFilesSection = useRecentFilesSection()

const props = defineProps<{
  notes: Note[]
  externalFiles: OpenMarkdownFile[]
  recentFiles: RecentFile[]
  selectedId: string | null
  documentOrder: string[]
}>()

const emit = defineEmits<{
  select: [id: string]
  close: [id: string, kind: 'note' | 'file']
  create: []
  openRecent: [filePath: string]
  removeRecent: [filePath: string]
  clearRecent: []
  settings: []
  'close-range': [range: DocumentCloseRange, id: string]
  'recent-close-range': [range: DocumentCloseRange, filePath: string]
  'reorder': [sourceId: string, targetId: string, placement: DocumentDropPlacement]
  'open-in-explorer': [filePath: string]
}>()

interface DocumentListItem {
  id: string
  kind: 'note' | 'file'
  title: string
  content: string
  updatedAt: string
  filePath: string | null
}

interface ContextMenuState {
  x: number
  y: number
  source: 'documents' | 'recent'
  id?: string
  kind?: 'note' | 'file'
  filePath: string | null
  index: number
}

const documents = computed<DocumentListItem[]>(() => [
  ...props.externalFiles.map((file) => ({
    id: file.id,
    kind: 'file' as const,
    title: file.fileName,
    content: file.content,
    updatedAt: file.openedAt,
    filePath: file.filePath,
  })),
  ...props.notes.map((note) => ({
    id: note.id,
    kind: 'note' as const,
    title: note.title,
    content: note.content,
    updatedAt: note.updatedAt,
    filePath: null,
  })),
])

const documentCount = computed(() => documents.value.length)

const orderedDocuments = computed(() => {
  const order = new Map(props.documentOrder.map((id, index) => [id, index]))
  return [...documents.value].sort((a, b) => {
    const leftIndex = order.get(a.id)
    const rightIndex = order.get(b.id)
    if (leftIndex !== undefined || rightIndex !== undefined) {
      if (leftIndex === undefined) return 1
      if (rightIndex === undefined) return -1
      return leftIndex - rightIndex
    }
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

const contextMenu = ref<ContextMenuState | null>(null)

const contextMenuListLength = computed(() => {
  if (contextMenu.value?.source === 'recent') return props.recentFiles.length
  return orderedDocuments.value.length
})

const aboveCount = computed(() => {
  if (!contextMenu.value) return 0
  return Math.max(0, contextMenu.value.index)
})
const belowCount = computed(() => {
  if (!contextMenu.value) return 0
  return Math.max(0, contextMenuListLength.value - contextMenu.value.index - 1)
})
const othersCount = computed(() => Math.max(0, contextMenuListLength.value - 1))

function openContextMenu(event: MouseEvent, id: string): void {
  const item = orderedDocuments.value.find((document) => document.id === id)
  if (!item) return
  const x = Math.min(event.clientX, window.innerWidth - 190)
  const y = Math.min(event.clientY, window.innerHeight - 170)
  const index = orderedDocuments.value.findIndex((document) => document.id === id)
  contextMenu.value = {
    x: Math.max(0, x),
    y: Math.max(0, y),
    source: 'documents',
    id,
    kind: item.kind,
    filePath: item.filePath,
    index,
  }
}

function openRecentContextMenu(event: MouseEvent, filePath: string): void {
  const x = Math.min(event.clientX, window.innerWidth - 190)
  const y = Math.min(event.clientY, window.innerHeight - 170)
  const index = props.recentFiles.findIndex((file) => file.filePath === filePath)
  if (index < 0) return
  contextMenu.value = {
    x: Math.max(0, x),
    y: Math.max(0, y),
    source: 'recent',
    filePath,
    index,
  }
}

function closeContextMenu(): void {
  contextMenu.value = null
}

function emitCloseRange(range: DocumentCloseRange): void {
  const menu = contextMenu.value
  if (!menu) return
  closeContextMenu()
  if (menu.source === 'recent') {
    if (menu.filePath) emit('recent-close-range', range, menu.filePath)
    return
  }
  if (menu.id) emit('close-range', range, menu.id)
}

function handleOpenInExplorer(): void {
  const filePath = contextMenu.value?.filePath
  if (!filePath) return
  closeContextMenu()
  emit('open-in-explorer', filePath)
}

function handleNoteListBlankClick(event: MouseEvent): void {
  const target = event.target as HTMLElement
  if (target.closest('.note-item') || target.closest('button')) return
  emit('create')
}

const draggingId = ref<string | null>(null)
const dropTarget = ref<{ id: string; placement: DocumentDropPlacement } | null>(null)

function handleDragStart(event: DragEvent, id: string): void {
  draggingId.value = id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }
}

function handleDragOver(event: DragEvent, id: string): void {
  if (draggingId.value === null || draggingId.value === id) return
  event.preventDefault()
  if (!event.dataTransfer) return
  event.dataTransfer.dropEffect = 'move'
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const placement = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
  dropTarget.value = { id, placement }
}

function handleDragLeave(event: DragEvent): void {
  const related = event.relatedTarget as Node | null
  const current = event.currentTarget as HTMLElement
  if (related && current.contains(related)) return
  dropTarget.value = null
}

function handleDrop(event: DragEvent, id: string): void {
  event.preventDefault()
  event.stopPropagation()
  const sourceId = draggingId.value
  if (sourceId && sourceId !== id && dropTarget.value) {
    emit('reorder', sourceId, id, dropTarget.value.placement)
  }
  clearDragState()
}

function handleDragEnd(): void {
  clearDragState()
}

function clearDragState(): void {
  draggingId.value = null
  dropTarget.value = null
}

function handleWindowKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeContextMenu()
}

onMounted(() => {
  window.addEventListener('keydown', handleWindowKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleWindowKeydown)
})
</script>

<style scoped>
.note-list-panel {
  width: 260px;
  min-width: 0;
  background: var(--color-surface-muted);
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

.note-list-panel--recent-resizing .recent-files-content {
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
.notelist-collapse-btn,
.notelist-settings-btn {
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

.notelist-collapse-btn:hover,
.notelist-settings-btn:hover {
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
  border: 1px dashed var(--color-border);
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

.recent-files {
  margin: 0 12px;
  padding: 8px 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.recent-files-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.4px;
}

.recent-files-toggle {
  min-width: 0;
  padding: 2px 0;
  border: none;
  background: transparent;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 4px;
  font: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
  cursor: pointer;
}

.recent-files-toggle:hover,
.recent-files-toggle:focus-visible {
  color: var(--color-primary);
}

.recent-files-chevron {
  flex-shrink: 0;
  transition: transform var(--transition);
}

.recent-files-chevron--collapsed {
  transform: rotate(-90deg);
}

.recent-files-count {
  padding: 0 4px;
  border-radius: 6px;
  background: var(--color-border);
  color: var(--color-text-secondary);
  font-size: 9px;
}

.recent-files-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-top: 5px;
}

.recent-clear {
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 10px;
  cursor: pointer;
}

.recent-clear:hover {
  color: var(--color-danger);
}

.recent-empty {
  padding: 4px 2px 1px;
  color: var(--color-text-muted);
  font-size: 10px;
}

.recent-file-list {
  overflow-y: auto;
}

.recent-files-resize-handle {
  position: relative;
  height: 6px;
  margin: 0 12px 8px;
  flex-shrink: 0;
  cursor: row-resize;
}

.recent-files-resize-handle::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 2px;
  height: 1px;
  background: var(--color-border);
}

.recent-files-resize-handle:hover::before,
.recent-files-resize-handle--active::before {
  top: 1px;
  height: 3px;
  background: var(--color-primary);
}

.recent-file-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 2px;
  border-radius: 4px;
  cursor: pointer;
}

.recent-file-item:hover {
  background: var(--color-hover);
}

.recent-file-text {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
}

.recent-file-name,
.recent-file-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-file-name {
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
}

.recent-file-path {
  color: var(--color-text-muted);
  font-size: 9px;
}

.recent-file-remove {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  opacity: 0;
}

.recent-file-item:hover .recent-file-remove,
.recent-file-remove:focus-visible {
  opacity: 1;
}

.recent-file-remove:hover {
  color: var(--color-danger);
  background: var(--color-danger-bg);
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
  border-bottom: 1px solid var(--color-border);
  transition: background-color var(--transition);
  border-left: 3px solid transparent;
}

.note-item:hover {
  background-color: var(--color-hover);
}

.note-item--active {
  background-color: var(--color-active);
  border-left-color: var(--color-primary);
}

.note-item--dragging {
  opacity: 0.5;
}

.note-item--drop-before {
  box-shadow: inset 0 2px 0 var(--color-primary);
}

.note-item--drop-after {
  box-shadow: inset 0 -2px 0 var(--color-primary);
}

.note-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
}

.note-item-title {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-kind {
  flex-shrink: 0;
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(74, 158, 255, 0.12);
  color: var(--color-primary);
  font-size: 9px;
  font-weight: 600;
}

.note-title-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-item-close {
  width: 20px;
  height: 20px;
  margin-left: 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity var(--transition), color var(--transition), background-color var(--transition);
}

.note-item:hover .note-item-close,
.note-item--active .note-item-close,
.note-item-close:focus-visible {
  opacity: 1;
}

.note-item-close:hover {
  color: var(--color-danger);
  background: var(--color-danger-bg);
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
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.context-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
}

.context-menu {
  position: fixed;
  z-index: 61;
  min-width: 160px;
  padding: 4px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.context-menu-item {
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.context-menu-item:hover:not(:disabled) {
  background: var(--color-active);
  color: var(--color-primary);
}

.context-menu-item:disabled {
  color: var(--color-text-muted);
  cursor: default;
  opacity: 0.55;
}

.context-menu-sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--color-border);
}
</style>
