/**
 * AI 问答与智能助手相关接口
 */

export interface ChatStreamParams {
  message: string
  user_id: string
  session_id: string
}

export interface ChatStreamEvent {
  type: 'token' | 'error' | string
  content?: string
  message?: string
}

/**
 * 发送 AI 对话流式请求 (SSE)
 */
export function chatStreamApi(params: ChatStreamParams): Promise<Response> {
  return fetch('/agent-api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })
}

