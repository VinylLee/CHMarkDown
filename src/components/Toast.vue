<template>
  <Teleport to="body">
    <div class="toast-container" v-if="toasts.length > 0">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast-item"
        :class="'toast--' + toast.type"
      >
        {{ toast.text }}
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ToastMessage } from '../composables/useToast'

defineProps<{
  toasts: ToastMessage[]
}>()
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  pointer-events: none;
}

.toast-item {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: toast-in 0.25s ease-out;
  pointer-events: auto;
  white-space: nowrap;
}

.toast--success {
  background-color: #38a169;
}

.toast--error {
  background-color: #c53030;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
