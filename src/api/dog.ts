/**
 * 狗狗档案管理接口
 */
import service from '../components/request'
import type { ApiResponse, PageResult, PageParams } from './types'

export interface DogQueryParams extends PageParams {
  keyword?: string
  healthStatus?: string
}

export interface DogFormData {
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

export interface DogItem extends DogFormData {
  id: number
}

/**
 * 狗狗图片上传接口地址
 */
export const DOG_UPLOAD_URL = '/api/upload/image'

/**
 * 分页查询狗狗列表
 */
export function getDogsApi(params?: DogQueryParams) {
  return service.get<ApiResponse<PageResult<DogItem>>>('/api/dogs', { params })
}

/**
 * 新增狗狗信息
 */
export function createDogApi(data: DogFormData) {
  return service.post<ApiResponse<{ id: number }>>('/api/dogs', data)
}

/**
 * 修改狗狗信息
 */
export function updateDogApi(id: number | string, data: DogFormData) {
  return service.put<ApiResponse<null>>(`/api/dogs/${id}`, data)
}

/**
 * 删除狗狗档案
 */
export function deleteDogApi(id: number | string) {
  return service.delete<ApiResponse<null>>(`/api/dogs/${id}`)
}

