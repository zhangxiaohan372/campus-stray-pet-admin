/**
 * 猫咪档案管理接口
 */
import service from '../components/request'
import type { ApiResponse, PageResult, PageParams } from './types'

export interface CatQueryParams extends PageParams {
  keyword?: string
  healthStatus?: string
}

export interface CatFormData {
  name: string
  age: string
  breed: string
  healthStatus: 'normal' | 'emergency' | 'attention' | 'dead' | any
  health: string
  area: string
  foundTime?: string
  isDead?: number
  deadTime?: string | null
  imageUrl?: string
  [key: string]: any
}

export interface CatItem extends CatFormData {
  id: number
}

/**
 * 猫咪/宠物图片上传接口地址
 */
export const CAT_UPLOAD_URL = '/api/upload/image'

/**
 * 分页查询猫咪列表
 */
export function getCatsApi(params?: CatQueryParams) {
  return service.get<ApiResponse<PageResult<CatItem>>>('/api/cats', { params })
}

/**
 * 新增猫咪信息
 */
export function createCatApi(data: CatFormData) {
  return service.post<ApiResponse<{ id: number }>>('/api/cats', data)
}

/**
 * 修改猫咪信息
 */
export function updateCatApi(id: number | string, data: CatFormData) {
  return service.put<ApiResponse<null>>(`/api/cats/${id}`, data)
}

/**
 * 删除猫咪档案
 */
export function deleteCatApi(id: number | string) {
  return service.delete<ApiResponse<null>>(`/api/cats/${id}`)
}

