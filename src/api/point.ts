/**
 * 投喂救助点管理接口
 */
import service from '../components/request'
import type { ApiResponse } from './types'

export interface PointFormData {
  name: string
  address: string
  desc?: string
  food?: string
  contact?: string
  lng?: number
  lat?: number
  position?: [number, number]
  [key: string]: any
}

export interface PointItem extends PointFormData {
  id: number
}

export interface PointScopeParams {
  minLng: number
  maxLng: number
  minLat: number
  maxLat: number
}

/**
 * 获取所有救助点列表
 */
export function getPointsApi() {
  return service.get<ApiResponse<PointItem[]>>('/api/points')
}

/**
 * 新增救助点
 */
export function createPointApi(data: PointFormData) {
  return service.post<ApiResponse<{ id: number }>>('/api/points', data)
}

/**
 * 修改救助点信息
 */
export function updatePointApi(id: number | string, data: PointFormData) {
  return service.put<ApiResponse<null>>(`/api/points/${id}`, data)
}

/**
 * 删除救助点
 */
export function deletePointApi(id: number | string) {
  return service.delete<ApiResponse<null>>(`/api/points/${id}`)
}

/**
 * 地图视野范围检索救助点
 */
export function getPointsScopeApi(params: PointScopeParams) {
  return service.get<ApiResponse<PointItem[]>>('/api/points/scope', { params })
}

