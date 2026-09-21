/**
 * AI 问答与智能助手相关接口
 */
import { useUserStore } from '../stores/user'
import aiService from './aiRequest'

export interface ChatStreamParams {
  message: string
  session_id: string
  user_id?: string
}

export interface ChatStreamEvent {
  type: 'token' | 'error' | string
  content?: string
  message?: string
}

/**
 * 动态组装 AI 服务的完整请求路径
 * 兼容 Vite 本地代理 (/agent-api) 与生产/外网直连地址 (如 http://47.93.227.166:8000)
 */
export function getAiUrl(path: string): string {
  const base = (import.meta.env.VITE_AI_BASE_URL || '/agent-api').replace(/\/+$/, '')
  const cleanPath = path.replace(/^\/+/, '')

  // 若使用开发代理 /agent-api，vite 会自动 rewrite 映射为 /api
  if (base.startsWith('/agent-api')) {
    return `${base}/${cleanPath.replace(/^api\//, '')}`
  }

  // 若直连外网或真实域名，确保路由带有 /api 前缀（FastAPI 挂载于 /api）
  if (!cleanPath.startsWith('api/') && !base.endsWith('/api')) {
    return `${base}/api/${cleanPath}`
  }
  return `${base}/${cleanPath}`
}

/**
 * 发送 AI 对话流式请求 (SSE)
 * 自动从 userStore 读取 Token 注入 Authorization 请求头，支持跨服务鉴权
 */
export function chatStreamApi(params: ChatStreamParams, customToken?: string): Promise<Response> {
  const userStore = useUserStore()
  const token = customToken || userStore.userInfo?.token

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const requestUrl = getAiUrl('chat/stream')

  return fetch(requestUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  })
}

// 导出 AI Axios 实例
export { aiService, aiService as aiRequest }
