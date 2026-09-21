/**
 * 通用 API 响应与分页类型定义
 */

export interface ApiResponse<T = any> {
  code?: number
  success: boolean
  data: T
  msg?: string
  message?: string
}

export interface PageParams {
  page?: number
  pageSize?: number
  [key: string]: any
}

export interface PageResult<T = any> {
  list: T[]
  total: number
  page?: number
  pageSize?: number
}

