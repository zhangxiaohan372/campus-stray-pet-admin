/**
 * 首页大屏监控与统计图表接口
 */
import service from '../components/request'
import type { ApiResponse } from './types'

export interface HomeHealthStatusCounts {
  normal: number
  attention: number
  emergency: number
  dead: number
}

export interface HomeAnimalItem {
  id: number
  name: string
  age: string
  breed: string
  healthStatus: string
  health: string
  foundTime: string
  area: string
  deadTime?: string | null
  isDead?: boolean | number | null
}

export interface HomeChartDataResult {
  catMonthlyData: number[]
  dogMonthlyData: number[]
  healthStatusData: HomeHealthStatusCounts
  currentYear: number
  cats: HomeAnimalItem[]
  dogs: HomeAnimalItem[]
  volunteerCount: number
}

/**
 * 获取首页大屏综合统计数据
 */
export function getHomeChartDataApi() {
  return service.get<ApiResponse<HomeChartDataResult>>('/api/home/chart-data')
}

