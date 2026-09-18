<template>
  <div class="float-ai-wrap">
    <!-- 悬浮触发按钮 -->
    <transition name="btn-pop">
      <button v-if="!isOpen" class="ai-trigger-btn" @click="openChat" title="AI 助手">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>AI 助手</span>
      </button>
    </transition>

    <!-- 可拖拽对话主弹窗 -->
    <transition name="chat-pop">
      <div
        v-if="isOpen"
        class="chat-window"
        :class="{ 'is-dragging': isDragging }"
        :style="windowStyle"
      >
        <!-- 1. 顶部操作栏（按住可拖动） -->
        <ChatHeader
          @clear="clearMessages"
          @close="isOpen = false"
          @drag-start="onPointerDown"
        />

        <!-- 2. 消息流与欢迎区 -->
        <ChatMessageList
          ref="messageListRef"
          :messages="messages"
          :is-loading="isLoading"
          :is-streaming="isStreaming"
          :quick-list="quickList"
          @select-quick="handleQuickSelect"
        />

        <!-- 3. 底部输入区 -->
        <ChatInput
          ref="inputRef"
          :disabled="isLoading"
          @send="sendMessage"
        />
      </div>
    </transition>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, nextTick } from 'vue'
import { useAiChat, useDraggable } from '../composables'
import ChatHeader from './ai-chat/ChatHeader.vue'
import ChatChatMessageList from './ai-chat/ChatMessageList.vue'
import ChatInput from './ai-chat/ChatInput.vue'

const isOpen = ref(false)
const messageListRef = ref<InstanceType<typeof ChatChatMessageList> | null>(null)
const inputRef = ref<InstanceType<typeof ChatInput> | null>(null)

const quickList = ['系统有哪些功能？', '怎么添加流浪动物？', '如何管理志愿活动？']

// 拖拽控制（弹窗默认 360 x 540，屏幕边距 24px）
const { pos, isDragging, initDefaultPosition, onPointerDown } = useDraggable(360, 540, 24)

const windowStyle = computed(() => {
  if (!pos.value) return {}
  return {
    left: `${pos.value.x}px`,
    top: `${pos.value.y}px`,
    right: 'auto',
    bottom: 'auto',
  }
})

// 关联消息列表的滚动容器 DOM 给 Hook
const scrollContainer = computed(() => messageListRef.value?.containerEl || null)
const { messages, isLoading, isStreaming, sendMessage, clearMessages } = useAiChat(scrollContainer)

const openChat = () => {
  isOpen.value = true
  if (!pos.value) {
    initDefaultPosition()
  }
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const handleQuickSelect = (question: string) => {
  sendMessage(question)
}
</script>

<style scoped>
/* ── 主题色变量 ── */
:root {
  --primary: #409eff;
}

.float-ai-wrap {
  --primary: #409eff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
}

/* ── 触发按钮 ── */
.ai-trigger-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 18px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  transition: opacity 0.2s, box-shadow 0.2s;
}

.ai-trigger-btn:hover {
  opacity: 0.88;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
}

/* ── 对话窗口 ── */
.chat-window {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  width: 360px;
  height: 540px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.chat-window.is-dragging {
  /* 拖拽中禁用平滑过渡，确保完全跟手 */
  transition: none !important;
}

/* ── 动画 ── */
.btn-pop-enter-active { animation: popIn 0.25s ease; }
.btn-pop-leave-active { animation: popIn 0.15s ease reverse; }
.chat-pop-enter-active { animation: slideUp 0.25s ease; }
.chat-pop-leave-active { animation: slideUp 0.15s ease reverse; }

@keyframes popIn {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
