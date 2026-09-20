/**
 * AI 问答与智能助手相关接口
 */

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
 * 发送 AI 对话流式请求 (SSE)
 */
export function chatStreamApi(params: ChatStreamParams, token?: string): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch('/agent-api/chat/stream', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  })
}

