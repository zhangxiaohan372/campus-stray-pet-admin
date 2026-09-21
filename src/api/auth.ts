/**
 * 认证与授权相关接口
 */
import service from '../components/request'
import type { ApiResponse } from './types'

export interface LoginParams {
  name: string
  password: string
}

export interface UserLoginResult {
  id: number
  name: string
  role: string
  token: string
  permissions: string[]
  avatarUrl?: string
}

export interface PermissionsResult {
  permissions: string[]
}

export interface PermissionTreeNode {
  id?: number | string
  label: string
  value: string
  description?: string
  children?: PermissionTreeNode[]
  [key: string]: any
}

/**
 * 用户/管理员登录
 */
export function loginApi(data: LoginParams) {
  return service.post<ApiResponse<UserLoginResult>>('/api/login', data)
}

/**
 * 退出登录
 */
export function logoutApi() {
  return service.post<ApiResponse<null>>('/api/logout')
}

/**
 * 获取当前登录人员权限列表
 */
export function getMyPermissionsApi() {
  return service.get<ApiResponse<PermissionsResult>>('/api/me/permissions')
}

/**
 * 获取系统权限树
 */
export function getPermissionTreeApi() {
  return service.get<ApiResponse<PermissionTreeNode[]>>('/api/permissions/tree')
}

/**
 * Token 身份与权限核验接口
 */
export function verifyAuthTokenApi() {
  return service.get<ApiResponse<any>>('/api/auth/verify')
}

