<template>
  <div class="image-size-control" role="toolbar" aria-label="图片大小">
    <div class="control-heading">
      <span class="heading-icon" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.4"/>
          <path d="M3 11L6.2 7.8L8.6 10.2L10.5 8.3L13 10.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="10.8" cy="6.2" r="1" fill="currentColor"/>
        </svg>
      </span>
      <span>图片大小</span>
      <span class="current-value">{{ displayValue }}</span>
    </div>

    <div class="preset-group" aria-label="常用尺寸">
      <button
        v-for="preset in presets"
        :key="preset.label"
        type="button"
        class="preset-button"
        :class="{ 'preset-button--active': modelValue === preset.value }"
        :aria-pressed="modelValue === preset.value"
        @click="emit('update:modelValue', preset.value)"
      >
        {{ preset.label }}
      </button>
    </div>

    <label class="slider-wrap">
      <span class="sr-only">精细调整图片宽度</span>
      <input
        class="size-slider"
        type="range"
        min="10"
        max="100"
        step="5"
        :value="sliderValue"
        @input="handleSliderInput"
      />
      <span class="slider-value">{{ sliderValue }}%</span>
    </label>

    <button type="button" class="close-button" title="取消选择图片" @click="emit('close')">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  close: []
}>()

const presets: Array<{ label: string; value: number | null }> = [
  { label: '原始', value: null },
  { label: '25%', value: 25 },
  { label: '50%', value: 50 },
  { label: '75%', value: 75 },
  { label: '满宽', value: 100 },
]

const sliderValue = computed(() => props.modelValue ?? 100)
const displayValue = computed(() => props.modelValue === null ? '原始比例' : `${props.modelValue}%`)

function handleSliderInput(event: Event): void {
  emit('update:modelValue', Number((event.target as HTMLInputElement).value))
}
</script>

<style scoped>
.image-size-control {
  min-height: 46px;
  padding: 7px 12px 7px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid #dbe7f5;
  background:
    linear-gradient(90deg, rgba(74, 158, 255, 0.08), transparent 34%),
    #f8fbff;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.control-heading {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 150px;
  color: #334155;
  font-size: 12px;
  font-weight: 650;
}

.heading-icon {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--color-primary);
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(43, 110, 181, 0.14);
}

.current-value {
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 600;
}

.preset-group {
  display: flex;
  align-items: center;
  padding: 2px;
  gap: 2px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
}

.preset-button {
  min-width: 42px;
  height: 25px;
  padding: 0 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  font-size: 11px;
  font-weight: 550;
  cursor: pointer;
  transition: color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.preset-button:hover {
  color: #1e609f;
  background: #eef6ff;
}

.preset-button--active {
  color: #ffffff;
  background: var(--color-primary);
  box-shadow: 0 2px 6px rgba(74, 158, 255, 0.24);
}

.slider-wrap {
  min-width: 150px;
  display: flex;
  align-items: center;
  gap: 9px;
}

.size-slider {
  width: 112px;
  height: 4px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.slider-value {
  width: 34px;
  color: #475569;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.close-button {
  width: 26px;
  height: 26px;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
}

.close-button:hover {
  border-color: #dbe3ee;
  background: #ffffff;
  color: #475569;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 900px) {
  .image-size-control {
    gap: 8px;
  }

  .control-heading {
    min-width: auto;
  }

  .current-value,
  .slider-wrap {
    display: none;
  }
}
</style>
