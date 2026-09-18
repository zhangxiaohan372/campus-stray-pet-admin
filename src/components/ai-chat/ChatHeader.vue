<template>
  <div class="chat-header" @pointerdown="onPointerDown">
    <div class="header-left">
      <span class="header-dot"></span>
      <span class="header-title">AI 助手</span>
    </div>
    <div class="header-right" @pointerdown.stop>
      <button class="hdr-btn" title="清空对话" @click="$emit('clear')">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
          <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M9 6V4h6v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button class="hdr-btn" title="关闭" @click="$emit('close')">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
const emit = defineEmits<{
  (e: 'clear'): void
  (e: 'close'): void
  (e: 'drag-start', event: PointerEvent): void
}>()

const onPointerDown = (event: PointerEvent) => {
  emit('drag-start', event)
}
</script>

<style scoped>
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--primary, #409eff);
  flex-shrink: 0;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.chat-header:active {
  cursor: grabbing;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.header-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  opacity: 0.85;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.3px;
}

.header-right {
  display: flex;
  gap: 4px;
}

.hdr-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.hdr-btn:hover {
  background: rgba(255, 255, 255, 0.32);
}
</style>
