<template>
  <div class="ai-qa-page">
    <div class="qa-container">
      <div class="qa-header">
        <h2 class="qa-title">
          <el-icon class="title-icon"><ChatDotRound /></el-icon>
          智能助手
        </h2>
        <p class="qa-subtitle">我可以帮您解答关于系统功能、宠物数量的问题</p>
      </div>

      <div class="qa-history" ref="bodyRef">
        <div v-for="(msg, index) in messages" :key="index" :class="['message-item', msg.type]">
          <div class="avatar">
            <el-icon v-if="msg.type === 'user'"><User /></el-icon>
            <el-icon v-else><Comment /></el-icon>
          </div>
          <div class="message-content">
            <div v-if="msg.type === 'bot'" v-html="renderMarkdown(msg.content)"></div>
            <p v-else>{{ msg.content }}</p>
          </div>
        </div>
        
        <div v-if="loading" class="message-item bot">
          <div class="avatar">
            <el-icon><Comment /></el-icon>
          </div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <div class="qa-input">
        <el-input 
          v-model="question" 
          placeholder="请输入您的问题，例如：系统有什么功能？小猫有多少只？"
          @keyup.enter="handleSend"
          size="large"
          :disabled="loading"
        />
        <el-button type="primary" @click="handleSend" :loading="loading">
          <el-icon><Promotion /></el-icon>
          提问
        </el-button>
      </div>

      <div class="qa-tips">
        <span class="tip-label">试试问这些问题：</span>
        <el-tag v-for="tip in quickTips" :key="tip" @click="quickAsk(tip)" class="tip-tag">
          {{ tip }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { ChatDotRound, User, Comment, Promotion } from '@element-plus/icons-vue'
import { marked } from 'marked'

const question = ref('')
const loading = ref(false)
const bodyRef = ref<HTMLElement | null>(null)

interface Message {
  type: 'user' | 'bot'
  content: string
}

const messages = ref<Message[]>([
  { type: 'bot', content: '您好！我是校园流浪动物管理系统的智能助手，请问有什么可以帮助您的？' }
])

const quickTips = [
  '系统有什么功能？',
  '小猫有多少只？',
  '小狗有多少只？',
  '如何照顾流浪猫？'
]

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true
})

const renderMarkdown = (content: string) => {
  return marked.parse(content)
}

const getToken = () => {
  const userStore = sessionStorage.getItem('user-store')
  if (userStore) {
    try {
      const userData = JSON.parse(userStore)
      return userData.state?.token
    } catch {
      return null
    }
  }
  return null
}

const streamAnswer = async (question: string): Promise<void> => {
  const token = getToken()
  if (!token) throw new Error('请先登录')

  const response = await fetch('/api/ai/qa/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ question })
  })

  if (!response.ok) throw new Error('请求失败')

  const reader = response.body!.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  const answerIndex = messages.value.length
  messages.value.push({ type: 'bot', content: '' })

  while (true) {
    const { done, value } = await reader.read()
    if (done) return

    buffer += decoder.decode(value, { stream: true })
    
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // 保留不完整的行

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue

      const dataStr = trimmed.slice(6).trim()
      if (dataStr === '[DONE]') return
      console.log('Received chunk:', dataStr)
      const data = JSON.parse(dataStr)
      
      if (data.type === 'chunk' && data.content) {
        if (messages.value[answerIndex]) {
          messages.value[answerIndex].content += data.content
        }
        await nextTick(() => {
          if (bodyRef.value) {
            bodyRef.value.scrollTop = bodyRef.value.scrollHeight
          }
        })
      } else if (data.type === 'end') {
        return
      } else if (data.type === 'error') {
        if (messages.value[answerIndex]) {
          messages.value[answerIndex].content = '回答失败：' + data.content
        }
        throw new Error(data.content)
      }
    }
  }
}
const handleSend = async () => {
  if (!question.value.trim()) {
    ElMessage.warning('请输入问题')
    return
  }
  
  if (!getToken()) {
    ElMessage.error('请先登录')
    return
  }

  messages.value.push({ type: 'user', content: question.value })
  const tempQuestion = question.value
  question.value = ''
  loading.value = true

  await nextTick(() => {
    if (bodyRef.value) {
      bodyRef.value.scrollTop = bodyRef.value.scrollHeight
    }
  })

  try {
    await streamAnswer(tempQuestion)
  } catch (err) {
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

const quickAsk = (tip: string) => {
  question.value = tip
  handleSend()
}
</script>

<style lang="scss" scoped>
.ai-qa-page {
  min-height: 100vh;
  padding: 40px 20px;
}

.qa-container {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.qa-header {
  background: #409eff;
  padding: 30px;
  text-align: center;
  
  .qa-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: white;
    font-size: 24px;
    margin: 0 0 10px 0;
  }
  
  .title-icon {
    font-size: 28px;
  }
  
  .qa-subtitle {
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    margin: 0;
  }
}

.qa-history {
  height: 400px;
  overflow-y: auto;
  padding: 20px;
  background: #f8f9fa;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  
  &.user {
    flex-direction: row-reverse;
    
    .message-content {
      background: #409eff;
      color: white;
      border-radius: 16px 4px 16px 16px;
    }
    
    .avatar {
      background: #409eff;
      
      :deep(.el-icon) {
        color: white;
      }
    }
  }
  
  &.bot {
    .avatar {
      background: #e5e9f2;
    }
    
    .message-content {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 4px 16px 16px 16px;
    }
  }
  
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    :deep(.el-icon) {
      color: #666;
      font-size: 18px;
    }
  }
  
  .message-content {
    max-width: 70%;
    padding: 12px 16px;
    line-height: 1.6;
    white-space: pre-wrap;
    
    p {
      margin: 0;
    }
    
    :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
      margin: 10px 0 5px 0;
      color: #333;
    }
    
    :deep(ul), :deep(ol) {
      padding-left: 20px;
      margin: 8px 0;
    }
    
    :deep(li) {
      margin: 4px 0;
    }
    
    :deep(code) {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
    }
    
    :deep(pre) {
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      
      code {
        background: none;
        padding: 0;
      }
    }
    
    :deep(blockquote) {
      border-left: 3px solid #409eff;
      padding-left: 10px;
      margin: 8px 0;
      color: #666;
    }
    
    :deep(table) {
      border-collapse: collapse;
      width: 100%;
      margin: 8px 0;
    }
    
    :deep(th), :deep(td) {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    
    :deep(th) {
      background: #f5f5f5;
    }
    
    :deep(a) {
      color: #409eff;
      text-decoration: none;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.typing-indicator {
  display: flex;
  gap: 4px;
  
  span {
    width: 8px;
    height: 8px;
    background: #999;
    border-radius: 50%;
    animation: typing 1.4s infinite ease-in-out;
    
    &:nth-child(1) {
      animation-delay: 0s;
    }
    
    &:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.qa-input {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  
  :deep(.el-input) {
    flex: 1;
  }
  
  :deep(.el-button) {
    padding: 0 24px;
  }
}

.qa-tips {
  padding: 16px 20px;
  background: #f5f7fa;
  border-top: 1px solid #e0e0e0;
  
  .tip-label {
    font-size: 13px;
    color: #909399;
    margin-right: 12px;
  }
  
  .tip-tag {
    margin-right: 8px;
    margin-bottom: 8px;
    cursor: pointer;
    
    &:hover {
      background: #409eff;
      color: white;
    }
  }
}

@media (max-width: 768px) {
  .ai-qa-page {
    padding: 20px 12px;
  }
  
  .qa-container {
    border-radius: 12px;
  }
  
  .qa-header {
    padding: 20px;
    
    .qa-title {
      font-size: 20px;
    }
  }
  
  .qa-history {
    height: 350px;
  }
  
  .message-item .message-content {
    max-width: 80%;
  }
}
</style>
