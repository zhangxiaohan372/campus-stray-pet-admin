/**
 * 物资库存管理接口
 */
import service from '../components/request'
import type { ApiResponse, PageResult, PageParams } from './types'

export interface MaterialQueryParams extends PageParams {
  pointCode?: string
  species?: string
  keyword?: string
}

export interface MaterialFormData {
  pointCode: string
  species: string
  materialName: string
  unit: string
  quantity: number | string
  minStock: number | string
  status?: string
  operator?: string
  remark?: string
  [key: string]: any
}

export interface MaterialItem extends MaterialFormData {
  id: number
  createTime?: string
  updateTime?: string
}

export interface SupplementMaterialParams {
  add_count?: number | string
  addCount?: number | string
  unit?: string
  operator?: string
  remark?: string
  [key: string]: any
}

export interface MaterialChartData {
  pieData: { name: string; value: number }[]
  barData: {
    categories: string[]
    quantityData: number[]
    minStockData: number[]
  }
}

/**
 * 分页查询物资库存列表
 */
export function getMaterialsApi(params?: MaterialQueryParams) {
  return service.get<ApiResponse<PageResult<MaterialItem>>>('/api/materials', { params })
}

/**
 * 获取物资统计图表数据（短缺饼图、库存柱状图）
 */
export function getMaterialsChartDataApi() {
  return service.get<ApiResponse<MaterialChartData>>('/api/materials/chart-data')
}

/**
 * 新增物资记录
 */
export function createMaterialApi(data: MaterialFormData) {
  return service.post<ApiResponse<{ id: number }>>('/api/materials', data)
}

/**
 * 修改物资记录
 */
export function updateMaterialApi(id: number | string, data: MaterialFormData) {
  return service.put<ApiResponse<null>>(`/api/materials/${id}`, data)
}

/**
 * 快速补充物资库存
 */
export function supplementMaterialApi(id: number | string, data: SupplementMaterialParams) {
  return service.put<ApiResponse<null>>(`/api/materials/supplement/${id}`, data)
}

/**
 * 删除物资库存
 */
export function deleteMaterialApi(id: number | string) {
  return service.delete<ApiResponse<null>>(`/api/materials/${id}`)
}

