<template>
  <div
    class="resize-handle"
    :class="{ 'resize-handle--active': isDragging }"
    @mousedown="$emit('resizestart', $event)"
  />
</template>

<script setup lang="ts">
defineProps<{
  isDragging: boolean
}>()

defineEmits<{
  resizestart: [event: MouseEvent]
}>()
</script>

<style scoped>
.resize-handle {
  width: 6px;
  cursor: col-resize;
  background: transparent;
  transition: background-color var(--transition);
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  user-select: none;
}

.resize-handle::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  background: transparent;
  transition: background-color var(--transition);
}

.resize-handle:hover::after {
  background: var(--color-border);
}

.resize-handle--active::after {
  background: var(--color-primary);
}
</style>
