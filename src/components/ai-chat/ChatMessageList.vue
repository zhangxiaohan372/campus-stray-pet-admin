<template>
  <div class="chat-body" ref="bodyRef">
    <!-- 欢迎态 -->
    <div v-if="messages.length === 0" class="welcome">
      <p class="welcome-title">有什么可以帮助你？</p>
      <div class="quick-list">
        <button
          v-for="q in quickList"
          :key="q"
          class="quick-item"
          @click="$emit('select-quick', q)"
        >
          {{ q }}
        </button>
      </div>
    </div>

    <!-- 消息列表 -->
    <template v-else>
      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="msg-row"
        :class="msg.role === 'user' ? 'msg-user' : 'msg-ai'"
      >
        <div class="bubble" :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'">
          <span class="bubble-text">{{ msg.content }}</span>
          <span
            v-if="msg.role === 'ai' && isStreaming && i === messages.length - 1"
            class="cursor"
          >|</span>
        </div>
        <div class="msg-time">{{ msg.time }}</div>
      </div>
    </template>

    <!-- AI 思考中加载状态 -->
    <div v-if="isLoading && !isStreaming" class="msg-row msg-ai">
      <div class="bubble bubble-ai loading">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import type { Msg } from '../../composables/useAiChat'

defineProps<{
  messages: Msg[]
  isLoading: boolean
  isStreaming: boolean
  quickList?: string[]
}>()

defineEmits<{
  (e: 'select-quick', question: string): void
}>()

const bodyRef = ref<HTMLElement | null>(null)

defineExpose({
  containerEl: bodyRef
})
</script>

<style scoped>
.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #fafafa;
  overflow-anchor: auto;
}

.chat-body::-webkit-scrollbar {
  width: 4px;
}

.chat-body::-webkit-scrollbar-track {
  background: transparent;
}

.chat-body::-webkit-scrollbar-thumb {
  background: #d4d7de;
  border-radius: 4px;
}

/* 欢迎区 */
.welcome {
  margin: auto;
  text-align: center;
  padding: 20px 0;
}

.welcome-title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: #111;
}

.quick-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.quick-item {
  background: #fff;
  border: 1px solid #e4e7ed;
  color: #111;
  border-radius: 6px;
  padding: 9px 13px;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.quick-item:hover {
  border-color: var(--primary, #409eff);
  background: #f0f7ff;
}

/* 消息行与气泡 */
.msg-row {
  display: flex;
  flex-direction: column;
}

.msg-user {
  align-items: flex-end;
}

.msg-ai {
  align-items: flex-start;
}

.bubble {
  max-width: 78%;
  padding: 9px 13px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.65;
  word-break: break-word;
  min-width: 0;
  box-sizing: border-box;
}

.bubble-user {
  background: var(--primary, #409eff);
  color: #fff;
  border-bottom-right-radius: 3px;
}

.bubble-ai {
  background: #fff;
  color: #111;
  border: 1px solid #e4e7ed;
  border-bottom-left-radius: 3px;
}

.bubble-text {
  display: block;
  white-space: pre-wrap;
}

.cursor {
  display: inline-block;
  color: var(--primary, #409eff);
  font-weight: 700;
  animation: blink 0.7s step-end infinite;
  margin-left: 1px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.msg-time {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 4px;
  padding: 0 2px;
}

/* 加载三点 */
.loading {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 12px 16px;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #c0c4cc;
  animation: bounce 1.2s infinite ease-in-out;
}

.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(1); opacity: 0.5; }
  40% { transform: scale(1.3); opacity: 1; }
}
</style>

