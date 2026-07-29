<template>
  <nav
    class="sidebar"
    :class="{ 'sidebar--collapsed': panel.state.collapsed, 'sidebar--resizing': panel.resizeState.isResizing }"
    :style="{ width: panel.state.collapsed ? '0px' : panel.state.width + 'px' }"
  >
    <!-- Expand button: visible only when collapsed -->
    <button
      v-if="panel.state.collapsed"
      class="sidebar-expand-btn"
      @click="panel.expand()"
      title="展开侧边栏 (Ctrl+B)"
      aria-label="展开侧边栏"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <!-- Main content: hidden when collapsed via v-show -->
    <div class="sidebar-content" v-show="!panel.state.collapsed">
      <div class="sidebar-header">
        <div class="logo-icon" aria-hidden="true">
          <img :src="flowDeskLogo" alt="" class="logo-mark" />
        </div>
        <div class="logo-text">
          <h1 class="app-title">FlowDesk</h1>
          <span class="app-subtitle">个人效率工具</span>
        </div>
      </div>

      <div class="nav-section">
        <span class="nav-section-label">菜单</span>
        <ul class="nav-list">
          <li>
            <router-link to="/" class="nav-item" active-class="nav-item--active">
              <span class="nav-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1.5" y="1.5" width="13" height="13" rx="3" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M4.5 8L7 10.5L11.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <span class="nav-label">待办事项</span>
            </router-link>
          </li>
          <li>
            <router-link to="/notes" class="nav-item" active-class="nav-item--active">
              <span class="nav-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 2.5H10.5L13 5V13.5H3V2.5Z" stroke="currentColor" stroke-width="1.3"/>
                  <path d="M10.5 2.5V5H13" stroke="currentColor" stroke-width="1.3"/>
                  <path d="M5.5 8H10.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                  <path d="M5.5 10.5H9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                </svg>
              </span>
              <span class="nav-label">灵感记录</span>
            </router-link>
          </li>
        </ul>
      </div>

      <div class="sidebar-footer">
        <span class="version">v1.0.1</span>
        <button
          class="sidebar-collapse-btn"
          @click="panel.collapse()"
          title="折叠侧边栏 (Ctrl+B)"
          aria-label="折叠侧边栏"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2.5L4 6L7.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Resize handle on the right edge (hidden when collapsed) -->
    <ResizeHandle
      v-if="!panel.state.collapsed"
      :isDragging="panel.resizeState.isResizing"
      @resizestart="panel.onResizeMouseDown"
    />
  </nav>
</template>

<script setup lang="ts">
import flowDeskLogo from '../assets/flowdesk-logo.svg'
import { useSidebarPanel } from '../composables/useSidebarPanel'
import ResizeHandle from './ResizeHandle.vue'

const panel = useSidebarPanel()
</script>

<style scoped>
.sidebar {
  width: 210px;
  min-width: 0;
  background-color: var(--color-sidebar-bg);
  color: var(--color-sidebar-text);
  display: flex;
  flex-direction: column;
  user-select: none;
  transition: width var(--transition);
  overflow: hidden;
  position: relative;
}

.sidebar--collapsed {
  overflow: visible;
}

.sidebar--resizing {
  transition: none;
}

.sidebar--resizing .sidebar-content {
  pointer-events: none;
}

/* Content wrapper: fade out on collapse */
.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  opacity: 1;
  transition: opacity 0.15s ease;
}

.sidebar--collapsed .sidebar-content {
  opacity: 0;
}

.sidebar-header {
  padding: 20px 18px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  position: relative;
  isolation: isolate;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-icon::after {
  content: "";
  position: absolute;
  inset: 5px;
  z-index: -1;
  border-radius: 12px;
  background: #4a83f3;
  filter: blur(10px);
  opacity: 0.38;
}

.logo-mark {
  display: block;
  width: 40px;
  height: 40px;
  filter: drop-shadow(0 5px 10px rgba(20, 28, 65, 0.3));
}

.logo-text {
  min-width: 0;
}

.app-title {
  font-size: 17px;
  font-weight: 750;
  color: #f1f3ff;
  letter-spacing: 0.25px;
  line-height: 1.2;
}

.app-subtitle {
  font-size: 11px;
  color: var(--color-sidebar-text);
  opacity: 0.6;
}

.nav-section {
  padding: 12px 0;
  flex: 1;
}

.nav-section-label {
  padding: 0 18px 8px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--color-sidebar-text);
  opacity: 0.45;
}

.nav-list {
  list-style: none;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  margin: 1px 8px;
  border-radius: var(--radius-sm);
  color: var(--color-sidebar-text);
  text-decoration: none;
  font-size: 13px;
  transition: all var(--transition);
  border-left: none;
}

.nav-item:hover {
  background-color: var(--color-sidebar-hover);
  color: #c8c8d8;
}

.nav-item--active {
  background-color: var(--color-sidebar-active);
  color: var(--color-sidebar-text-active);
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.7;
}

.nav-item--active .nav-icon {
  opacity: 1;
  color: var(--color-primary);
}

.nav-label {
  font-size: 13px;
  font-weight: 500;
}

/* Collapse toggle button */
.sidebar-collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-sidebar-text);
  opacity: 0.35;
  cursor: pointer;
  transition: opacity var(--transition), background-color var(--transition);
  flex-shrink: 0;
}

.sidebar-collapse-btn:hover {
  opacity: 0.7;
  background-color: var(--color-sidebar-hover);
}

/* Floating expand button (visible when collapsed) */
.sidebar-expand-btn {
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

.sidebar-expand-btn:hover {
  background: var(--color-primary);
  color: #ffffff;
}

.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.version {
  font-size: 11px;
  color: var(--color-sidebar-text);
  opacity: 0.35;
}
</style>
