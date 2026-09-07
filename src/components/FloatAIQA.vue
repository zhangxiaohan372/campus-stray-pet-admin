<template>
  <div class="float-ai-container">
    <div 
      class="float-ai-trigger" 
      @click="toggleChat"
      :class="{ 'active': isOpen }"
    >
      <el-icon class="trigger-icon"><ChatDotRound /></el-icon>
      <span class="notification-badge" v-if="hasNewMessage">●</span>
    </div>

    <transition name="slide-up">
      <div v-if="isOpen" class="float-ai-panel">
        <div class="panel-header">
          <div class="header-title">
            <el-icon class="title-icon"><Comment /></el-icon>
            <span>智能助手</span>
          </div>
          <el-button class="close-btn" @click="isOpen = false">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>

        <div class="panel-body" ref="bodyRef">
          <div 
            v-for="(msg, index) in messages" 
            :key="index" 
            :class="['message-item', { 'user': msg.type === 'user', 'bot': msg.type === 'bot' }]"
          >
            <div class="message-avatar">
              <el-icon v-if="msg.type === 'user'"><User /></el-icon>
              <el-icon v-else><Comment /></el-icon>
            </div>
            <div class="message-bubble" :class="{ 'markdown-body': msg.type === 'bot' }">
              <span v-if="msg.type === 'user'">{{ msg.content }}</span>
              <span v-else v-html="renderMarkdown(msg.content)"></span>
            </div>
          </div>
        </div>

        <div class="panel-footer">
          <el-input 
            v-model="question" 
            placeholder="输入问题..."
            @keyup.enter="handleSend"
            :disabled="loading"
          />
          <el-button 
            type="primary" 
            @click="handleSend" 
            :loading="loading"
            size="small"
          >
            <el-icon><Promotion /></el-icon>
          </el-button>
        </div>

        <div class="quick-tips">
          <span class="tips-label">快速提问：</span>
          <el-tag 
            v-for="tip in quickTips" 
            :key="tip" 
            size="small" 
            @click="quickSend(tip)"
            class="tip-tag"
          >
            {{ tip }}
          </el-tag>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { ChatDotRound, Comment, User, Close, Promotion } from '@element-plus/icons-vue'
import { marked } from 'marked'
import { useUserStore } from '../stores/user'

marked.setOptions({
  breaks: true,
  gfm: true
})

const isOpen = ref(false)
const hasNewMessage = ref(false)
const question = ref('')
const loading = ref(false)
const bodyRef = ref<HTMLElement | null>(null)
const userStore = useUserStore()

interface Message {
  type: 'user' | 'bot'
  content: string
}

const messages = ref<Message[]>([
  { type: 'bot', content: '您好！有什么可以帮助您的？' }
])

const quickTips = [
  '系统功能',
  '小猫数量',
  '小狗数量'
]

const renderMarkdown = (content: string): string => {
  return marked.parse(content) as string
}

const toggleChat = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    hasNewMessage.value = false
    nextTick(() => {
      if (bodyRef.value) {
        bodyRef.value.scrollTop = bodyRef.value.scrollHeight
      }
    })
  }
}

const handleSend = async () => {
  if (!question.value.trim() || loading.value) return

  messages.value.push({ type: 'user', content: question.value })
  const tempQuestion = question.value
  question.value = ''

  await nextTick(() => {
    if (bodyRef.value) {
      bodyRef.value.scrollTop = bodyRef.value.scrollHeight
    }
  })

  loading.value = true

  try {
    await streamAnswer(tempQuestion)
  } catch (err) {
    messages.value.push({ type: 'bot', content: '网络错误，请稍后重试' })
    console.error('AI问答出错：', err)
  } finally {
    loading.value = false
    await nextTick(() => {
      if (bodyRef.value) {
        bodyRef.value.scrollTop = bodyRef.value.scrollHeight
      }
    })
  }
}

const streamAnswer = async (question: string): Promise<void> => {
  if (!userStore.isLogin || !userStore.userInfo?.token) {
    throw new Error('请先登录')
  }

  const response = await fetch('/api/ai/qa/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userStore.userInfo.token}`
    },
    body: JSON.stringify({ question })
  })

  if (!response.ok) {
    throw new Error('请求失败')
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('无法获取响应流')
  }

  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let answerIndex = messages.value.length
  messages.value.push({ type: 'bot', content: '' })

  while (true) {
    const { done, value } = await reader.read()
    
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    
    while (buffer.includes('\n')) {
      const newlineIndex = buffer.indexOf('\n')
      const line = buffer.slice(0, newlineIndex)
      buffer = buffer.slice(newlineIndex + 1)

      if (line.startsWith('data: ')) {
        try {
          const dataStr = line.slice(6)
          if (dataStr.trim() === '[DONE]') {
            return
          }

          const data = JSON.parse(dataStr)
          const answerMessage = messages.value[answerIndex]
          if (data.type === 'chunk' && data.content && answerMessage) {
            answerMessage.content += data.content
            nextTick(() => {
              if (bodyRef.value) {
                bodyRef.value.scrollTop = bodyRef.value.scrollHeight
              }
            })
          } else if (data.type === 'end') {
            return
          } else if (data.type === 'error') {
            if (answerMessage) {
              answerMessage.content = '回答失败：' + data.content
            }
            throw new Error(data.content)
          }
        } catch (err) {
          console.error('解析流式数据失败:', err)
        }
      }
    }
  }
}

const quickSend = (tip: string) => {
  question.value = tip
  handleSend()
}
</script>

<style lang="scss" scoped>
.float-ai-container {
  position: fixed;
  right: 40px;
  bottom: 40px;
  z-index: 9999;
}

.float-ai-trigger {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(64, 158, 255, 0.4);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 30px rgba(64, 158, 255, 0.5);
  }

  &.active {
    background: #66b1ff;
  }

  .trigger-icon {
    font-size: 24px;
    color: white;
  }

  .notification-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ff4757;
    color: white;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.float-ai-panel {
  position: absolute;
  right: 0;
  bottom: 80px;
  width: 360px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.panel-header {
  background: #409eff;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: white;
    font-weight: 500;
    font-size: 15px;
  }

  .title-icon {
    font-size: 18px;
  }

  .close-btn {
    width: 28px;
    height: 28px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 50%;

    :deep(.el-icon) {
      color: white;
      font-size: 14px;
    }
  }
}

.panel-body {
  height: 280px;
  overflow-y: auto;
  padding: 16px;
  background: #f8f9fa;
}

.message-item {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;

  &.user {
    flex-direction: row-reverse;

    .message-bubble {
      background: #409eff;
      color: white;
      border-radius: 12px 4px 12px 12px;
    }
  }

  &.bot {
    .message-bubble {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 4px 12px 12px 12px;
    }
  }

  .message-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: #e5e9f2;

    :deep(.el-icon) {
      font-size: 14px;
      color: #666;
    }

    .user & {
      background: #409eff;

      :deep(.el-icon) {
        color: white;
      }
    }
  }

  .message-bubble {
    max-width: 75%;
    padding: 10px 14px;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;

    &.markdown-body {
      white-space: normal;
      
      :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
        margin: 8px 0;
        font-weight: 600;
        line-height: 1.3;
      }
      
      :deep(h1) { font-size: 18px; }
      :deep(h2) { font-size: 16px; }
      :deep(h3) { font-size: 15px; }
      
      :deep(p) {
        margin: 6px 0;
      }
      
      :deep(ul), :deep(ol) {
        margin: 6px 0;
        padding-left: 20px;
      }
      
      :deep(li) {
        margin: 4px 0;
      }
      
      :deep(code) {
        background: #f5f5f5;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 13px;
      }
      
      :deep(pre) {
        background: #f5f5f5;
        padding: 10px;
        border-radius: 6px;
        overflow-x: auto;
        margin: 8px 0;
        
        code {
          background: transparent;
          padding: 0;
        }
      }
      
      :deep(blockquote) {
        border-left: 3px solid #409eff;
        padding-left: 10px;
        margin: 8px 0;
        color: #666;
      }
      
      :deep(strong) {
        font-weight: 600;
      }
      
      :deep(em) {
        font-style: italic;
      }
      
      :deep(a) {
        color: #409eff;
        text-decoration: none;
        
        &:hover {
          text-decoration: underline;
        }
      }
      
      :deep(table) {
        border-collapse: collapse;
        margin: 8px 0;
        
        th, td {
          border: 1px solid #ddd;
          padding: 6px 10px;
        }
        
        th {
          background: #f5f5f5;
          font-weight: 600;
        }
      }
      
      :deep(hr) {
        border: none;
        border-top: 1px solid #e0e0e0;
        margin: 10px 0;
      }
    }
  }
}

.panel-footer {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;

  :deep(.el-input) {
    flex: 1;
  }

  :deep(.el-button) {
    padding: 0 16px;
  }
}

.quick-tips {
  padding: 12px 16px;
  background: #f5f7fa;
  border-top: 1px solid #e0e0e0;

  .tips-label {
    font-size: 12px;
    color: #909399;
    margin-right: 8px;
  }

  .tip-tag {
    margin-right: 6px;
    margin-bottom: 6px;
    cursor: pointer;
    font-size: 12px;

    &:hover {
      background: #409eff;
      color: white;
    }
  }
}

@media (max-width: 480px) {
  .float-ai-container {
    right: 20px;
    bottom: 20px;
  }

  .float-ai-panel {
    width: calc(100vw - 60px);
    max-width: 320px;
  }

  .float-ai-trigger {
    width: 50px;
    height: 50px;

    .trigger-icon {
      font-size: 20px;
    }
  }
}
</style>