import { ref, nextTick, type Ref } from 'vue'
import { useUserStore } from '../stores/user'

export interface Msg {
  role: 'user' | 'ai'
  content: string
  time: string
}

export function useAiChat(scrollContainerRef?: Ref<HTMLElement | null>) {
  const userStore = useUserStore()
  const messages = ref<Msg[]>([])
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const sessionId = ref(crypto.randomUUID())

  const now = () => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const scrollBottom = () => {
    nextTick(() => {
      if (scrollContainerRef?.value) {
        scrollContainerRef.value.scrollTop = scrollContainerRef.value.scrollHeight
      }
    })
  }

  const clearMessages = () => {
    if (isLoading.value) return
    messages.value = []
    sessionId.value = crypto.randomUUID()
  }

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading.value) return

    messages.value.push({ role: 'user', content: trimmed, time: now() })
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
          message: trimmed,
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

  return {
    messages,
    isLoading,
    isStreaming,
    sessionId,
    sendMessage,
    clearMessages,
    scrollBottom,
  }
}

