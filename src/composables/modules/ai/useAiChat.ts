import { ref, nextTick, type Ref } from 'vue'
import { useUserStore } from '../../../stores/user'
import {
  chatStreamApi,
  confirmApi,
  type ChatStreamEvent,
  type TaskItem,
  type TaskPlan
} from '../../../api/ai'

export type { TaskItem, TaskPlan }

const AI_REQUEST_TIMEOUT_MS = 60_000

export interface Msg {
  role: 'user' | 'ai'
  content: string
  time: string
  isConfirm?: boolean
  fields?: Record<string, string>
  confirmedAction?: 'confirm' | 'cancel'
  plan?: TaskPlan
}

export interface ConfirmDialogState {
  visible: boolean
  fields: Record<string, string>
  prompt: string
}

export function useAiChat(scrollContainerRef?: Ref<HTMLElement | null>) {
  const userStore = useUserStore()
  const messages = ref<Msg[]>([])
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const sessionId = ref(crypto.randomUUID())
  const confirmDialog = ref<ConfirmDialogState>({
    visible: false,
    fields: {},
    prompt: '',
  })

  const now = () => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const getRequestErrorMessage = (
    error: unknown,
    signal: AbortSignal,
    fallback: string,
    timeoutMessage: string
  ) => {
    if (signal.aborted) return timeoutMessage
    return error instanceof Error ? error.message : fallback
  }

  // 发消息或 AI 打字时，让聊天窗口的滚动条自动滑到最底部
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
    confirmDialog.value = { visible: false, fields: {}, prompt: '' }
  }

  // 通用 SSE 读取器
  const readSseStream = async (
    response: Response,
    onEvent: (event: ChatStreamEvent) => void
  ) => {
    if (!response.body) throw new Error('浏览器无法读取流式响应')
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const parseBlock = (raw: string) => {
      const data = raw
        .split('\n')
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trimStart())
        .join('\n')
      if (!data) return
      try {
        const event = JSON.parse(data) as ChatStreamEvent
        onEvent(event)
      } catch (err) {
        console.warn('SSE 解析异常:', err, data)
      }
    }

    while (true) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r\n/g, '\n')
      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        parseBlock(buffer.slice(0, boundary))
        buffer = buffer.slice(boundary + 2)
        boundary = buffer.indexOf('\n\n')
      }
      if (done) {
        if (buffer.trim()) parseBlock(buffer)
        break
      }
    }
  }

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading.value) return

    messages.value.push({ role: 'user', content: trimmed, time: now() })
    scrollBottom()
    isLoading.value = true

    const token = userStore.userInfo?.token
    if (!token) {
      messages.value.push({ role: 'ai', content: '请先登录后使用 AI 助手。', time: now() })
      isLoading.value = false
      scrollBottom()
      return
    }

    let answer: Msg | null = null
    const getOrCreateAnswer = () => {
      if (!answer) {
        answer = { role: 'ai', content: '', time: now() }
        messages.value.push(answer)
      }
      return answer
    }
    const appendAnswer = (content: string) => {
      const msg = getOrCreateAnswer()
      msg.content += content
      scrollBottom()
    }

    const handlePlanCreated = (planData: TaskPlan) => {
      isStreaming.value = true
      const msg = getOrCreateAnswer()
      msg.plan = {
        summary: planData.summary,
        tasks: planData.tasks.map(t => ({ ...t })),
      }
      scrollBottom()
    }

    const handleTaskUpdated = (taskData: TaskItem) => {
      isStreaming.value = true
      const msg = getOrCreateAnswer()
      if (msg.plan) {
        const idx = msg.plan.tasks.findIndex(t => t.id === taskData.id)
        if (idx !== -1) {
          msg.plan.tasks[idx] = {
            ...msg.plan.tasks[idx],
            ...taskData,
          }
        } else {
          msg.plan.tasks.push({ ...taskData })
        }
      } else {
        msg.plan = {
          summary: '任务执行规划',
          tasks: [{ ...taskData }],
        }
      }
      scrollBottom()
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS)
    try {
      const response = await chatStreamApi({
        message: trimmed,
        session_id: sessionId.value,
      }, token, controller.signal)
      if (!response.ok) throw new Error(`AI 请求失败（HTTP ${response.status}）`)

      await readSseStream(response, (event) => {
        if (event.type === 'error') {
          throw new Error(event.message || 'AI 服务出错')
        }
        if (event.type === 'plan_created' && event.plan) {
          handlePlanCreated(event.plan)
        }
        if (event.type === 'task_updated' && event.task) {
          handleTaskUpdated(event.task)
        }
        if (event.type === 'token' && event.content) {
          isStreaming.value = true
          appendAnswer(event.content)
        }
        if (event.type === 'confirm_dialog') {
          // 1. 若带有 prompt 确认文案，追加到 AI 回复内容中展示
          const promptText = event.prompt || '请核对拟提交的登记信息并确认：'
          appendAnswer(promptText)

          const msg = getOrCreateAnswer()
          msg.isConfirm = true
          msg.fields = event.fields || {}

          // 2. 唤起登记信息核对弹窗
          confirmDialog.value = {
            visible: true,
            fields: event.fields || {},
            prompt: promptText,
          }
        }
      })

      if (!answer) appendAnswer('AI 没有返回内容，请稍后重试。')
    } catch (error) {
      const message = getRequestErrorMessage(error, controller.signal, 'AI 请求失败', 'AI 请求超时，请稍后重试。')
      appendAnswer(answer ? `\n\n[请求中断：${message}]` : `请求失败：${message}`)
    } finally {
      clearTimeout(timeoutId)
      isLoading.value = false
      isStreaming.value = false
    }
  }

  // 确认 / 取消登记处理
  const handleConfirm = async (action: 'confirm' | 'cancel') => {
    if (isLoading.value) return
    confirmDialog.value.visible = false

    // 标记上一条待确认消息的动作状态
    const lastConfirmMsg = [...messages.value].reverse().find(m => m.isConfirm && !m.confirmedAction)
    if (lastConfirmMsg) {
      lastConfirmMsg.confirmedAction = action
    }

    const actionText = action === 'confirm' ? '确认提交' : '取消登记'
    messages.value.push({ role: 'user', content: actionText, time: now() })
    scrollBottom()
    isLoading.value = true

    const token = userStore.userInfo?.token
    if (!token) {
      messages.value.push({ role: 'ai', content: '请先登录后操作。', time: now() })
      isLoading.value = false
      scrollBottom()
      return
    }

    let answer: Msg | null = null
    const getOrCreateAnswer = () => {
      if (!answer) {
        answer = { role: 'ai', content: '', time: now() }
        messages.value.push(answer)
      }
      return answer
    }
    const appendAnswer = (content: string) => {
      const msg = getOrCreateAnswer()
      msg.content += content
      scrollBottom()
    }

    const handlePlanCreated = (planData: TaskPlan) => {
      isStreaming.value = true
      const msg = getOrCreateAnswer()
      msg.plan = {
        summary: planData.summary,
        tasks: planData.tasks.map(t => ({ ...t })),
      }
      scrollBottom()
    }

    const handleTaskUpdated = (taskData: TaskItem) => {
      isStreaming.value = true
      const msg = getOrCreateAnswer()
      if (msg.plan) {
        const idx = msg.plan.tasks.findIndex(t => t.id === taskData.id)
        if (idx !== -1) {
          msg.plan.tasks[idx] = {
            ...msg.plan.tasks[idx],
            ...taskData,
          }
        } else {
          msg.plan.tasks.push({ ...taskData })
        }
      } else {
        msg.plan = {
          summary: '任务执行规划',
          tasks: [{ ...taskData }],
        }
      }
      scrollBottom()
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS)
    try {
      const response = await confirmApi({
        session_id: sessionId.value,
        action,
      }, token, controller.signal)
      if (!response.ok) throw new Error(`操作请求失败（HTTP ${response.status}）`)

      await readSseStream(response, (event) => {
        if (event.type === 'error') {
          throw new Error(event.message || '操作失败')
        }
        if (event.type === 'plan_created' && event.plan) {
          handlePlanCreated(event.plan)
        }
        if (event.type === 'task_updated' && event.task) {
          handleTaskUpdated(event.task)
        }
        if (event.type === 'token' && event.content) {
          isStreaming.value = true
          appendAnswer(event.content)
        }
      })

      if (!answer) {
        appendAnswer(action === 'confirm' ? '登记信息已成功确认提交。' : '已取消本次登记。')
      }
    } catch (error) {
      const message = getRequestErrorMessage(error, controller.signal, '操作失败', '操作请求超时，请稍后重试。')
      appendAnswer(answer ? `\n\n[请求中断：${message}]` : `操作失败：${message}`)
    } finally {
      clearTimeout(timeoutId)
      isLoading.value = false
      isStreaming.value = false
    }
  }

  return {
    messages,
    isLoading,
    isStreaming,
    sessionId,
    confirmDialog,
    handleConfirm,
    sendMessage,
    clearMessages,
    scrollBottom,
  }
}


