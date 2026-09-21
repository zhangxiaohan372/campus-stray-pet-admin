/**
 * 角色与权限管理接口
 */
import service from '../components/request'
import type { ApiResponse } from './types'

export interface RoleItem {
  id: number
  roleCode: string
  roleName: string
  name?: string
  description?: string
  createTime?: string
  permissions: string[]
  [key: string]: any
}

/**
 * 获取所有角色及权限列表
 */
export function getRolesApi() {
  return service.get<ApiResponse<RoleItem[]>>('/api/roles')
}

/**
 * 更新指定角色的权限配置
 */
export function updateRolePermissionsApi(roleId: number | string, permissions: string[]) {
  return service.put<ApiResponse<null>>(`/api/roles/${roleId}/permissions`, { permissions })
}

