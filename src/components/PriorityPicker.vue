<template>
  <div
    class="priority-picker"
    :class="{ 'priority-picker--compact': compact }"
    role="radiogroup"
    aria-label="选择优先级"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="priority-option"
      :class="[
        `priority-option--${option.value}`,
        { 'priority-option--active': modelValue === option.value },
      ]"
      role="radio"
      :aria-checked="modelValue === option.value"
      :title="`${option.label}优先级`"
      @click="emit('update:modelValue', option.value)"
    >
      <span class="priority-dot" aria-hidden="true"></span>
      <span>{{ compact ? option.shortLabel : option.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: 'low' | 'medium' | 'high'
  compact?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: 'low' | 'medium' | 'high']
}>()

const options = [
  { value: 'low' as const, label: '低优先', shortLabel: '低' },
  { value: 'medium' as const, label: '中优先', shortLabel: '中' },
  { value: 'high' as const, label: '高优先', shortLabel: '高' },
]
</script>

<style scoped>
.priority-picker {
  --picker-height: 34px;
  display: inline-grid;
  grid-template-columns: repeat(3, minmax(64px, 1fr));
  gap: 3px;
  min-width: 222px;
  padding: 3px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #f4f6f8;
  box-shadow: inset 0 1px 2px rgba(31, 41, 55, 0.035);
}

.priority-picker--compact {
  --picker-height: 30px;
  grid-template-columns: repeat(3, 48px);
  min-width: 0;
}

.priority-option {
  --priority-color: var(--color-text-secondary);
  --priority-tint: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: var(--picker-height);
  padding: 0 9px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--color-text-secondary);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.12s ease;
}

.priority-option--low {
  --priority-color: #4f83b8;
  --priority-tint: #eaf3fd;
}

.priority-option--medium {
  --priority-color: #c98a16;
  --priority-tint: #fff4d8;
}

.priority-option--high {
  --priority-color: #dc5b62;
  --priority-tint: #ffeaec;
}

.priority-option:hover {
  background: rgba(255, 255, 255, 0.78);
  color: var(--color-text);
}

.priority-option:active {
  transform: translateY(1px);
}

.priority-option--active {
  background: var(--priority-tint);
  color: var(--priority-color);
  box-shadow:
    0 1px 3px rgba(31, 41, 55, 0.09),
    inset 0 0 0 1px color-mix(in srgb, var(--priority-color) 18%, transparent);
}

.priority-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--priority-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--priority-color) 11%, transparent);
  opacity: 0.58;
}

.priority-option--active .priority-dot {
  opacity: 1;
}

.priority-option:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid rgba(74, 158, 255, 0.38);
  outline-offset: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .priority-option {
    transition: none;
  }
}
</style>
