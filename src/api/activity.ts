/**
 * 志愿活动管理接口
 */
import service from '../components/request'
import type { ApiResponse, PageResult, PageParams } from './types'

export interface ActivityQueryParams extends PageParams {
  keyword?: string
  status?: string
}

export interface ActivityFormData {
  title: string
  content: string
  activityTime: string
  volunteerHours: number | string
  status?: string
  joinedCount?: number
  [key: string]: any
}

export interface ActivityItem extends ActivityFormData {
  id: number
  description?: string
  time?: string
  author?: string
  duration?: number
}

export interface ActivityParticipant {
  id: number
  studentId: string
  name: string
  major?: string
  phone: string
  [key: string]: any
}

export interface ActivityRankingItem {
  studentId: string
  name: string
  activeScore: number
}

/**
 * 分页查询活动列表
 */
export function getActivityApi(params?: ActivityQueryParams) {
  return service.get<ApiResponse<PageResult<ActivityItem>>>('/api/activity', { params })
}

/**
 * 获取活动详情
 */
export function getActivityDetailApi(id: number | string) {
  return service.get<ApiResponse<ActivityItem>>(`/api/activity/${id}`)
}

/**
 * 新增活动
 */
export function createActivityApi(data: ActivityFormData) {
  return service.post<ApiResponse<{ id: number }>>('/api/activity', data)
}

/**
 * 修改活动（若状态变更为 completed 将自动结算积分时长）
 */
export function updateActivityApi(id: number | string, data: ActivityFormData) {
  return service.put<ApiResponse<null>>(`/api/activity/${id}`, data)
}

/**
 * 删除活动
 */
export function deleteActivityApi(id: number | string) {
  return service.delete<ApiResponse<null>>(`/api/activity/${id}`)
}

/**
 * 查看活动已报名的参与者名单
 */
export function getActivityParticipantsApi(id: number | string) {
  return service.get<ApiResponse<ActivityParticipant[]>>(`/api/activity/${id}/participants`)
}

/**
 * 获取活跃度排行榜
 */
export function getActivityRankingApi() {
  return service.get<ApiResponse<ActivityRankingItem[]>>('/api/activity/ranking')
}

