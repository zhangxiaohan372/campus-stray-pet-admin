<template>
  <div class="float-ai-wrap">
    <!-- 触发按钮 -->
    <transition name="btn-pop">
      <button v-if="!isOpen" class="ai-trigger-btn" @click="openChat" title="AI 助手">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>AI 助手</span>
      </button>
    </transition>

    <!-- 对话浮窗 -->
    <transition name="chat-pop">
      <div v-if="isOpen" class="chat-window">

        <!-- 头部 -->
        <div class="chat-header">
          <div class="header-left">
            <span class="header-dot"></span>
            <span class="header-title">AI 助手</span>
          </div>
          <div class="header-right">
            <button class="hdr-btn" title="清空对话" @click="clearMessages">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M9 6V4h6v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="hdr-btn" title="关闭" @click="closeChat">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 消息区 -->
        <div class="chat-body" ref="bodyRef">
          <!-- 欢迎态 -->
          <div v-if="messages.length === 0" class="welcome">
            <p class="welcome-title">有什么可以帮助你？</p>
            <div class="quick-list">
              <button
                v-for="q in quickList"
                :key="q"
                class="quick-item"
                @click="sendQuick(q)"
              >{{ q }}</button>
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
                <!-- 使用 pre-wrap 防止流式时抖动 -->
                <span class="bubble-text">{{ msg.content }}</span>
                <span
                  v-if="msg.role === 'ai' && isStreaming && i === messages.length - 1"
                  class="cursor"
                >|</span>
              </div>
              <div class="msg-time">{{ msg.time }}</div>
            </div>
          </template>

          <!-- AI 思考中 -->
          <div v-if="isLoading && !isStreaming" class="msg-row msg-ai">
            <div class="bubble bubble-ai loading">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>
        </div>

        <!-- 输入区 -->
        <div class="chat-footer">
          <div class="input-box" :class="{ 'input-focus': focused }">
            <textarea
              ref="inputRef"
              v-model="inputText"
              class="input"
              placeholder="输入消息… Enter 发送，Shift+Enter 换行"
              rows="1"
              :disabled="isLoading"
              @focus="focused = true"
              @blur="focused = false"
              @keydown.enter.exact.prevent="handleSend"
              @input="autoResize"
            />
            <button
              class="send-btn"
              :disabled="!inputText.trim() || isLoading"
              @click="handleSend"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
            </button>
          </div>
          <p class="footer-hint">由本地 AI 服务驱动</p>
        </div>

      </div>
    </transition>
  </div>
</template>

<script lang="ts" setup>
import { ref, nextTick } from 'vue'
import { useUserStore } from '../stores/user'

interface Msg {
  role: 'user' | 'ai'
  content: string
  time: string
}

const isOpen     = ref(false)
const isLoading  = ref(false)
const isStreaming = ref(false)
const inputText  = ref('')
const focused    = ref(false)
const messages   = ref<Msg[]>([])
const bodyRef    = ref<HTMLElement | null>(null)
const inputRef   = ref<HTMLTextAreaElement | null>(null)
const userStore = useUserStore()
const sessionId = ref(crypto.randomUUID())

const quickList = ['系统有哪些功能？', '怎么添加流浪动物？', '如何管理志愿活动？']

const now = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const scrollBottom = () => nextTick(() => {
  if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
})

const openChat = () => {
  isOpen.value = true
  nextTick(() => inputRef.value?.focus())
}
const closeChat = () => { isOpen.value = false }
const clearMessages = () => {
  if (isLoading.value) return
  messages.value = []
  sessionId.value = crypto.randomUUID()
}

const autoResize = () => {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 112) + 'px'
}

const sendQuick = (q: string) => {
  inputText.value = q
  handleSend()
}

const handleSend = async () => {
  const text = inputText.value.trim()
  if (!text || isLoading.value) return

  messages.value.push({ role: 'user', content: text, time: now() })
  inputText.value = ''
  if (inputRef.value) inputRef.value.style.height = 'auto'
  scrollBottom()
  isLoading.value = true

  const userId = userStore.userInfo?.id
  if (userId == null) {
    messages.value.push({ role: 'ai', content: '请先登录后使用 AI 助手。', time: now() })
    isLoading.value = false
    scrollBottom()
    return
  }

  let answer: Msg | null = null
  const appendAnswer = (content: string) => {
    if (!answer) {
      answer = { role: 'ai', content: '', time: now() }
      messages.value.push(answer)
    }
    answer.content += content
    scrollBottom()
  }

  const processEvent = (raw: string) => {
    const data = raw.split('\n').filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trimStart()).join('\n')
    if (!data) return
    const event = JSON.parse(data) as { type: string; content?: string; message?: string }
    if (event.type === 'error') throw new Error(event.message || 'AI 服务出错')
    if (event.type === 'token' && event.content) {
      isStreaming.value = true
      appendAnswer(event.content)
    }
  }

  try {
    const response = await fetch('/agent-api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        user_id: String(userId),
        session_id: sessionId.value,
      }),
    })
    if (!response.ok) throw new Error(`AI 请求失败（HTTP ${response.status}）`)
    if (!response.body) throw new Error('浏览器无法读取流式响应')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r\n/g, '\n')
      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        processEvent(buffer.slice(0, boundary))
        buffer = buffer.slice(boundary + 2)
        boundary = buffer.indexOf('\n\n')
      }
      if (done) {
        if (buffer.trim()) processEvent(buffer)
        break
      }
    }
    if (!answer) appendAnswer('AI 没有返回内容，请稍后重试。')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 请求失败'
    appendAnswer(answer ? `\n\n[请求中断：${message}]` : `请求失败：${message}`)
  } finally {
    isLoading.value = false
    isStreaming.value = false
  }
}
</script>

<style scoped>
/* ── 主题色变量 ── */
:root {
  --primary: #409eff;
}
/* scoped 内使用 */
.float-ai-wrap {
  --primary: #409eff;
}

/* ── 定位 ── */
.float-ai-wrap {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
}

/* ── 触发按钮 ── */
.ai-trigger-btn {
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
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  transition: opacity 0.2s, box-shadow 0.2s;
}
.ai-trigger-btn:hover {
  opacity: 0.88;
  box-shadow: 0 4px 16px rgba(0,0,0,0.16);
}

/* ── 对话窗口 ── */
.chat-window {
  width: 360px;
  height: 540px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  overflow: hidden;
}

/* ── 头部 ── */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--primary);
  flex-shrink: 0;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
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
  background: rgba(255,255,255,0.18);
  color: #fff;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.hdr-btn:hover {
  background: rgba(255,255,255,0.32);
}

/* ── 消息区 ── */
.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #fafafa;
  /* 防止流式时宽度跳动 */
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

/* ── 欢迎区 ── */
.welcome {
  margin: auto;
  text-align: center;
  padding: 20px 0;
}
.welcome-icon {
  font-size: 40px;
  margin-bottom: 10px;
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
  border-color: var(--primary);
  background: #f0f7ff;
}

/* ── 消息行 ── */
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

/* ── 气泡 ── */
.bubble {
  max-width: 78%;
  padding: 9px 13px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.65;
  word-break: break-word;
  /* 固定宽度基准，防止流式抖动 */
  min-width: 0;
  box-sizing: border-box;
}
.bubble-user {
  background: var(--primary);
  color: #fff;
  border-bottom-right-radius: 3px;
}
.bubble-ai {
  background: #fff;
  color: #111;
  border: 1px solid #e4e7ed;
  border-bottom-left-radius: 3px;
}
/* 流式文本：pre-wrap 保持换行，不强制撑宽 */
.bubble-text {
  display: block;
  white-space: pre-wrap;
}
.cursor {
  display: inline-block;
  color: var(--primary);
  font-weight: 700;
  animation: blink 0.7s step-end infinite;
  margin-left: 1px;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
.msg-time {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 4px;
  padding: 0 2px;
}

/* ── Loading 三点 ── */
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
  0%, 80%, 100% { transform: scale(1);   opacity: 0.5; }
  40%           { transform: scale(1.3); opacity: 1;   }
}

/* ── 输入区 ── */
.chat-footer {
  flex-shrink: 0;
  padding: 10px 12px 10px;
  border-top: 1px solid #e4e7ed;
  background: #fff;
}
.input-box {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 7px 8px 7px 12px;
  background: #fff;
  transition: border-color 0.2s;
}
.input-box.input-focus {
  border-color: var(--primary);
}
.input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #111;
  background: transparent;
  resize: none;
  line-height: 1.5;
  max-height: 112px;
  font-family: inherit;
}
.input::placeholder {
  color: #c0c4cc;
}
.send-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: var(--primary);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}
.send-btn:disabled {
  background: #c0c4cc;
  cursor: not-allowed;
}
.send-btn:not(:disabled):hover {
  opacity: 0.85;
}
.footer-hint {
  margin: 6px 0 0;
  text-align: center;
  font-size: 11px;
  color: #c0c4cc;
}

/* ── 动画 ── */
.btn-pop-enter-active  { animation: popIn 0.25s ease; }
.btn-pop-leave-active  { animation: popIn 0.15s ease reverse; }
.chat-pop-enter-active { animation: slideUp 0.25s ease; }
.chat-pop-leave-active { animation: slideUp 0.15s ease reverse; }

@keyframes popIn {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
