/**
 * 用户管理与个人中心接口
 */
import service from '../components/request'
import type { ApiResponse, PageResult, PageParams } from './types'

export interface UserQueryParams extends PageParams {
  keyword?: string
  role?: string
}

export interface UserFormData {
  studentId: string
  name: string
  phone?: string
  email?: string
  role?: string
  registerTime?: string
  lastActiveTime?: string
  volunteerTime?: number
  loginCount?: number
  lastLoginTime?: string
  volunteerActivityCount?: number
  activeScore?: number
  major?: string
  avatarUrl?: string
  password?: string
  createTime?: string
  updateTime?: string
  [key: string]: any
}

export interface UserItem extends UserFormData {
  id: number
}

export interface VolunteerRankingItem {
  studentId: string
  name: string
  volunteerTime: number
}

export interface UpdatePasswordParams {
  oldPassword: string
  newPassword: string
}

/**
 * 分页查询学生/用户列表
 */
export function getUsersApi(params?: UserQueryParams) {
  return service.get<ApiResponse<PageResult<UserItem>>>('/api/users', { params })
}

/**
 * 新增学生/用户
 */
export function createUserApi(data: UserFormData) {
  return service.post<ApiResponse<{ id: number }>>('/api/users', data)
}

/**
 * 修改学生/用户信息
 */
export function updateUserApi(studentId: string, data: UserFormData) {
  return service.put<ApiResponse<null>>(`/api/users/${studentId}`, data)
}

/**
 * 删除用户
 */
export function deleteUserApi(studentId: string) {
  return service.delete<ApiResponse<null>>(`/api/users/${studentId}`)
}

/**
 * 获取志愿时长排行榜
 */
export function getVolunteerRankingApi() {
  return service.get<ApiResponse<VolunteerRankingItem[]>>('/api/volunteer/ranking')
}

/**
 * 修改当前用户密码
 */
export function updatePasswordApi(data: UpdatePasswordParams) {
  return service.post<ApiResponse<null>>('/api/user/password', data)
}

