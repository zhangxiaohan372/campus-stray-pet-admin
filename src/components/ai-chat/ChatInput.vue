<template>
  <div class="chat-footer">
    <div class="input-box" :class="{ 'input-focus': focused }">
      <textarea
        ref="inputRef"
        v-model="inputText"
        class="input"
        placeholder="输入消息… Enter 发送，Shift+Enter 换行"
        rows="1"
        :disabled="disabled"
        @focus="focused = true"
        @blur="focused = false"
        @keydown.enter.exact.prevent="handleSend"
        @input="autoResize"
      />
      <button
        class="send-btn"
        :disabled="!inputText.trim() || disabled"
        @click="handleSend"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
          <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <polygon
            points="22 2 15 22 11 13 2 9 22 2"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
        </svg>
      </button>
    </div>
    <p class="footer-hint">由本地 AI 服务驱动</p>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

defineProps<{
  disabled: boolean
}>()

const emit = defineEmits<{
  (e: 'send', text: string): void
}>()

const inputText = ref('')
const focused = ref(false)
const inputRef = ref<HTMLTextAreaElement | null>(null)

const autoResize = () => {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 112) + 'px'
}

const handleSend = () => {
  const text = inputText.value.trim()
  if (!text) return
  emit('send', text)
  inputText.value = ''
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
  }
}

const focus = () => {
  inputRef.value?.focus()
}

defineExpose({
  focus,
  setText: (val: string) => {
    inputText.value = val
    autoResize()
  }
})
</script>

<style scoped>
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
  border-color: var(--primary, #409eff);
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
  background: var(--primary, #409eff);
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
</style>

