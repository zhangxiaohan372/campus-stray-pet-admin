/**
 * AI 服务专用 Axios 实例
 * 独立连接 AI Agent 后端（默认端口 8000），提供长超时时间与统一鉴权拦截
 */
import axios from 'axios'
import { useUserStore } from '../stores/user'

const getAiBaseUrl = (): string => {
  const base = import.meta.env.VITE_AI_BASE_URL
  if (base) {
    return base.replace(/\/+$/, '')
  }
  return '/agent-api'
}

const aiService = axios.create({
  baseURL: getAiBaseUrl(),
  timeout: 60000 // AI 大模型生成耗时较长，放宽超时至 60 秒
})

// 请求拦截器：自动注入当前已登录用户的 Bearer Token
aiService.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    const token = userStore.userInfo?.token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
aiService.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[AI Service Error]:', error)
    return Promise.reject(error)
  }
)

export default aiService

