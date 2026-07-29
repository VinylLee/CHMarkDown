<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div
        v-if="state.visible"
        class="confirm-overlay"
        @mousedown.self="resolveConfirm('cancel')"
        @keydown.esc.stop.prevent="resolveConfirm('cancel')"
      >
        <section
          class="confirm-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-message"
        >
          <div class="confirm-accent" :class="{ 'confirm-accent--danger': state.danger }"></div>

          <div class="confirm-content">
            <div class="confirm-heading">
              <span class="confirm-mark" :class="{ 'confirm-mark--danger': state.danger }">
                {{ state.danger ? '!' : '◆' }}
              </span>
              <h2 id="confirm-title">{{ state.title }}</h2>
            </div>
            <p id="confirm-message">{{ state.message }}</p>
          </div>

          <div class="confirm-actions">
            <button
              v-if="state.secondaryText"
              class="confirm-btn confirm-btn--secondary"
              type="button"
              @click="resolveConfirm('secondary')"
            >
              {{ state.secondaryText }}
            </button>

            <span class="confirm-actions-spacer"></span>

            <button
              ref="cancelButtonRef"
              class="confirm-btn confirm-btn--cancel"
              type="button"
              @click="resolveConfirm('cancel')"
            >
              {{ state.cancelText }}
            </button>
            <button
              class="confirm-btn confirm-btn--primary"
              :class="{ 'confirm-btn--danger': state.danger }"
              type="button"
              @click="resolveConfirm('confirm')"
            >
              {{ state.confirmText }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { useConfirm } from '../composables/useConfirm'

const { state, resolveConfirm } = useConfirm()
const cancelButtonRef = ref<HTMLButtonElement | null>(null)
let previouslyFocusedElement: HTMLElement | null = null

watch(
  () => state.visible,
  async (visible) => {
    if (!visible) {
      await nextTick()
      if (previouslyFocusedElement?.isConnected) {
        previouslyFocusedElement.focus()
      }
      previouslyFocusedElement = null
      return
    }

    previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    cancelButtonRef.value?.focus()
  }
)

onUnmounted(() => {
  resolveConfirm('cancel')
})
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(20, 22, 33, 0.46);
  backdrop-filter: blur(2px);
}

.confirm-card {
  position: relative;
  width: min(430px, 100%);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: var(--radius-lg);
  background: #ffffff;
  box-shadow:
    0 24px 70px rgba(17, 24, 39, 0.24),
    0 3px 12px rgba(17, 24, 39, 0.1);
}

.confirm-accent {
  height: 4px;
  background: linear-gradient(90deg, var(--color-primary), #6f7bf7);
}

.confirm-accent--danger {
  background: linear-gradient(90deg, #ef4444, #f97316);
}

.confirm-content {
  padding: 22px 24px 20px;
}

.confirm-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.confirm-heading h2 {
  font-size: 16px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--color-text);
}

.confirm-mark {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 7px;
  background: rgba(74, 158, 255, 0.12);
  color: var(--color-primary);
  font-size: 10px;
}

.confirm-mark--danger {
  background: var(--color-danger-bg);
  color: var(--color-danger);
  font-size: 14px;
  font-weight: 800;
}

.confirm-content p {
  padding-left: 34px;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.confirm-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--color-border);
  background: #fafbfc;
}

.confirm-actions-spacer {
  flex: 1;
}

.confirm-btn {
  min-height: 34px;
  padding: 7px 14px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color var(--transition),
    border-color var(--transition),
    color var(--transition),
    transform 0.12s ease;
}

.confirm-btn:active {
  transform: translateY(1px);
}

.confirm-btn:focus-visible {
  outline: 2px solid rgba(74, 158, 255, 0.35);
  outline-offset: 2px;
}

.confirm-btn--secondary {
  padding-left: 4px;
  padding-right: 4px;
  background: transparent;
  color: var(--color-danger);
}

.confirm-btn--secondary:hover {
  color: #dc2626;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.confirm-btn--cancel {
  border-color: var(--color-border);
  background: #ffffff;
  color: var(--color-text-secondary);
}

.confirm-btn--cancel:hover {
  border-color: #c9d0d9;
  color: var(--color-text);
}

.confirm-btn--primary {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #ffffff;
}

.confirm-btn--primary:hover {
  border-color: var(--color-primary-hover);
  background: var(--color-primary-hover);
}

.confirm-btn--danger {
  border-color: var(--color-danger);
  background: var(--color-danger);
}

.confirm-btn--danger:hover {
  border-color: #dc2626;
  background: #dc2626;
}

.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.16s ease;
}

.confirm-fade-enter-active .confirm-card,
.confirm-fade-leave-active .confirm-card {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

.confirm-fade-enter-from .confirm-card,
.confirm-fade-leave-to .confirm-card {
  opacity: 0;
  transform: translateY(8px) scale(0.985);
}

@media (prefers-reduced-motion: reduce) {
  .confirm-fade-enter-active,
  .confirm-fade-leave-active,
  .confirm-fade-enter-active .confirm-card,
  .confirm-fade-leave-active .confirm-card,
  .confirm-btn {
    transition: none;
  }
}
</style>
