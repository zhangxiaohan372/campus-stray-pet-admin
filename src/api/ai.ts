/**
 * AI 问答与智能助手相关接口
 */
import { getAuthToken } from '../stores/user'
import aiService from './aiRequest'

export interface ChatStreamParams {
  message: string
  session_id: string
  user_id?: string
}

export interface TaskItem {
  id: number
  title: string
  type?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: string | null
}

export interface TaskPlan {
  summary: string
  tasks: TaskItem[]
}

export interface ChatStreamEvent {
  type:
    | 'token'
    | 'done'
    | 'context'
    | 'confirm_dialog'
    | 'error'
    | 'plan_created'
    | 'task_updated'
    | string
  content?: string
  message?: string
  fields?: Record<string, string>
  prompt?: string
  plan?: TaskPlan
  task?: TaskItem
}

export interface ConfirmParams {
  session_id: string
  action: 'confirm' | 'cancel'
}

/**
 * 动态组装 AI 服务的完整请求路径
 * 默认走 Vite 本地代理分流（/api/chat -> 8000），同时也兼容直连配置 (如 http://127.0.0.1:8000)
 */
export function getAiUrl(path: string): string {
  const base = (import.meta.env.VITE_AI_BASE_URL || '').replace(/\/+$/, '')
  const cleanPath = path.replace(/^\/+/, '')

  // 保证路径带有 api/ 前缀，匹配 Vite 代理与 FastAPI 路由
  const fullApiPath = cleanPath.startsWith('api/') ? cleanPath : `api/${cleanPath}`

  if (!base) {
    // 默认相对路径，触发 Vite 反向代理（/api/chat -> 8000）
    return `/${fullApiPath}`
  }

  // 若配置了自定义 Base URL (例如 http://127.0.0.1:8000 或带有 /api)
  if (base.endsWith('/api')) {
    return `${base}/${fullApiPath.replace(/^api\//, '')}`
  }
  return `${base}/${fullApiPath}`
}

/**
 * 生成统一的鉴权请求头
 * 自动注入当前登录用户的真实 Token (Bearer Token 规范)
 */
export function getAuthHeaders(customToken?: string): Record<string, string> {
  const token = customToken || getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`
  }
  return headers
}

/**
 * 发送 AI 对话流式请求 (SSE)
 * 自动从 userStore / localStorage 读取 Token 注入 Authorization 请求头，支持跨服务鉴权
 */
export function chatStreamApi(
  params: ChatStreamParams,
  customToken?: string,
  signal?: AbortSignal
): Promise<Response> {
  const headers = getAuthHeaders(customToken)
  const requestUrl = getAiUrl('chat/stream')

  return fetch(requestUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
    signal,
  })
}

/**
 * 弹窗确认/取消登记接口 (SSE)
 * 用户在弹窗中点击"确认提交"或"取消"后调用，后端执行真正写入或取消并流式返回结果
 */
export function confirmApi(
  params: ConfirmParams,
  customToken?: string,
  signal?: AbortSignal
): Promise<Response> {
  const headers = getAuthHeaders(customToken)
  const requestUrl = getAiUrl('chat/confirm')

  return fetch(requestUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
    signal,
  })
}

// 导出 AI Axios 实例
export { aiService, aiService as aiRequest }
