import { ref, nextTick, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getAuthToken } from '../../../stores/user'
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

/**
 * 生成唯一会话 ID (兼容非安全上下文环境)
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function useAiChat(scrollContainerRef?: Ref<HTMLElement | null>) {
  const messages = ref<Msg[]>([])
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const sessionId = ref(generateUUID())
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
    sessionId.value = generateUUID()
    confirmDialog.value = { visible: false, fields: {}, prompt: '' }
  }

  /**
   * 通用 Server-Sent Events (SSE) 流式解析器
   * 1. 严格过滤心跳/注释行 (: ping, : keep-alive 等)
   * 2. 规范拼接多行 data 载荷，支持 [DONE] 终止标志
   * 3. 安全解析各 type 事件，支持 onEvent 返回 true 提前主动终止流读取
   */
  const readSseStream = async (
    response: Response,
    onEvent: (event: ChatStreamEvent) => boolean | void
  ) => {
    if (!response.body) throw new Error('浏览器无法读取流式响应')
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let isFinished = false

    const parseBlock = (raw: string) => {
      if (isFinished || !raw.trim()) return

      const lines = raw.split(/\r?\n/)
      const dataLines: string[] = []

      for (const line of lines) {
        // 忽略心跳与注释行（SSE 规范中以冒号开头的行）
        if (line.startsWith(':') || !line.trim()) {
          continue
        }
        if (line.startsWith('data:')) {
          let value = line.slice(5)
          // SSE 规范：若 data: 后面有前置空格，剥离首个空格
          if (value.startsWith(' ')) {
            value = value.slice(1)
          }
          dataLines.push(value)
        }
      }

      if (dataLines.length === 0) return

      const payload = dataLines.join('\n')

      // 支持 [DONE] 文本标志
      if (payload.trim() === '[DONE]') {
        const stop = onEvent({ type: 'done' })
        if (stop === true) isFinished = true
        return
      }

      try {
        const event = JSON.parse(payload) as ChatStreamEvent
        const stop = onEvent(event)
        if (stop === true) {
          isFinished = true
        }
      } catch (err) {
        console.warn('SSE JSON 解析异常:', err, payload)
      }
    }

    try {
      while (!isFinished) {
        const { done, value } = await reader.read()
        if (done) {
          buffer += decoder.decode()
          if (buffer.trim()) {
            parseBlock(buffer)
          }
          break
        }

        buffer += decoder.decode(value, { stream: true })
        // 标准 SSE 事件通过连续双换行 (\n\n 或 \r\n\r\n) 切分数据块
        buffer = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
        let boundary = buffer.indexOf('\n\n')
        while (boundary !== -1) {
          const block = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          parseBlock(block)
          if (isFinished) break
          boundary = buffer.indexOf('\n\n')
        }
      }
    } finally {
      try {
        reader.releaseLock()
      } catch {
        // ignore
      }
    }
  }

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading.value) return

    messages.value.push({ role: 'user', content: trimmed, time: now() })
    scrollBottom()
    isLoading.value = true

    const token = getAuthToken()
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
        summary: planData.summary || '任务执行规划',
        tasks: Array.isArray(planData.tasks) ? planData.tasks.map(t => ({ ...t })) : [],
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
          msg.plan.tasks.push({
            id: taskData.id,
            title: taskData.title || `任务 #${taskData.id}`,
            status: taskData.status || 'running',
            result: taskData.result,
            type: taskData.type,
          })
        }
      } else {
        msg.plan = {
          summary: '任务执行规划',
          tasks: [{
            id: taskData.id,
            title: taskData.title || `任务 #${taskData.id}`,
            status: taskData.status || 'running',
            result: taskData.result,
            type: taskData.type,
          }],
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

      if (!response.ok) {
        if (response.status === 401) {
          ElMessage.error('登录状态已失效，请重新登录')
          throw new Error('登录状态已失效，请重新登录业务系统后再试')
        }
        throw new Error(`AI 请求失败（HTTP ${response.status}）`)
      }

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
        if (event.type === 'token' && typeof event.content === 'string') {
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
        if (event.type === 'done') {
          isStreaming.value = false
          isLoading.value = false
          // 兜底自愈：若后端未及时推送 task_updated，而会话已收到 done 正常结束，自动将规划任务标记为已完成
          if (answer?.plan?.tasks) {
            answer.plan.tasks.forEach(t => {
              if (t.status === 'running' || t.status === 'pending') {
                t.status = 'completed'
              }
            })
          }
          return true
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
      // 保证流结束时任务状态不悬停在 running/pending
      if (answer?.plan?.tasks) {
        answer.plan.tasks.forEach(t => {
          if (t.status === 'running') {
            t.status = 'completed'
          }
        })
      }
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

    const token = getAuthToken()
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
        summary: planData.summary || '任务执行规划',
        tasks: Array.isArray(planData.tasks) ? planData.tasks.map(t => ({ ...t })) : [],
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
          msg.plan.tasks.push({
            id: taskData.id,
            title: taskData.title || `任务 #${taskData.id}`,
            status: taskData.status || 'running',
            result: taskData.result,
            type: taskData.type,
          })
        }
      } else {
        msg.plan = {
          summary: '任务执行规划',
          tasks: [{
            id: taskData.id,
            title: taskData.title || `任务 #${taskData.id}`,
            status: taskData.status || 'running',
            result: taskData.result,
            type: taskData.type,
          }],
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

      if (!response.ok) {
        if (response.status === 401) {
          ElMessage.error('登录状态已失效，请重新登录')
          throw new Error('登录状态已失效，请重新登录业务系统后再试')
        }
        throw new Error(`操作请求失败（HTTP ${response.status}）`)
      }

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
        if (event.type === 'token' && typeof event.content === 'string') {
          isStreaming.value = true
          appendAnswer(event.content)
        }
        if (event.type === 'confirm_dialog') {
          const promptText = event.prompt || '请核对拟提交的登记信息并确认：'
          appendAnswer(promptText)

          const msg = getOrCreateAnswer()
          msg.isConfirm = true
          msg.fields = event.fields || {}

          confirmDialog.value = {
            visible: true,
            fields: event.fields || {},
            prompt: promptText,
          }
        }
        if (event.type === 'done') {
          isStreaming.value = false
          isLoading.value = false
          // 兜底自愈：若后端未及时推送 task_updated，而确认流程已收到 done 结束，自动将规划任务标记为已完成
          if (answer?.plan?.tasks) {
            answer.plan.tasks.forEach(t => {
              if (t.status === 'running' || t.status === 'pending') {
                t.status = 'completed'
              }
            })
          }
          return true
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
      if (answer?.plan?.tasks) {
        answer.plan.tasks.forEach(t => {
          if (t.status === 'running') {
            t.status = 'completed'
          }
        })
      }
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
