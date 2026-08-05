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

    <div class="slider-wrap">
      <label class="slider-label">
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
      </label>
      <label class="value-input-wrap">
        <input
          ref="numberInputRef"
          class="value-input"
          type="number"
          min="10"
          max="100"
          step="5"
          :value="numberText"
          @input="handleNumberInput"
          aria-label="输入图片宽度百分比"
        />
        <span class="value-input-suffix">%</span>
      </label>
    </div>

    <button type="button" class="close-button" title="取消选择图片" @click="emit('close')">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

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
const numberInputRef = ref<HTMLInputElement | null>(null)
const numberText = ref('100')

watch(
  () => props.modelValue,
  (value) => {
    if (document.activeElement !== numberInputRef.value) {
      numberText.value = value === null ? '100' : String(value)
    }
  },
  { immediate: true },
)

function handleSliderInput(event: Event): void {
  emit('update:modelValue', Number((event.target as HTMLInputElement).value))
}

function handleNumberInput(event: Event): void {
  const input = event.target as HTMLInputElement
  numberText.value = input.value
  const raw = input.value.trim()
  if (raw === '') return
  const width = Number(raw)
  if (!Number.isFinite(width)) return
  const clamped = Math.min(100, Math.max(10, Math.round(width)))
  const current = props.modelValue ?? 100
  if (clamped === current) return
  emit('update:modelValue', clamped)
}
</script>

<style scoped>
.image-size-control {
  min-height: 46px;
  padding: 7px 12px 7px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid var(--color-border);
  background:
    linear-gradient(90deg, rgba(74, 158, 255, 0.08), transparent 34%),
    var(--color-surface-soft);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.control-heading {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 150px;
  color: var(--color-text);
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
  background: var(--color-control-bg);
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
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-control-bg);
}

.preset-button {
  min-width: 42px;
  height: 25px;
  padding: 0 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 550;
  cursor: pointer;
  transition: color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.preset-button:hover {
  color: var(--color-primary);
  background: var(--color-active);
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

.slider-label {
  display: inline-flex;
  align-items: center;
}

.size-slider {
  width: 112px;
  height: 4px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.value-input-wrap {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--color-text-secondary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.value-input {
  width: 44px;
  padding: 2px 3px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-control-bg);
  color: var(--color-text);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.value-input::-webkit-outer-spin-button,
.value-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.value-input {
  -moz-appearance: textfield;
  appearance: textfield;
}

.value-input:focus {
  outline: none;
  border-color: var(--color-primary);
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
  color: var(--color-text-muted);
  cursor: pointer;
}

.close-button:hover {
  border-color: var(--color-border);
  background: var(--color-control-bg);
  color: var(--color-text-secondary);
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
