import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PersistenceOptions } from 'pinia-plugin-persistedstate'
import { getFallbackPermissions } from '../config/permissions'

interface UserInfo {
  id: number
  name: string
  role: string
  token: string
  permissions?: string[]
}

export const useUserStore = defineStore(
  'user',
  () => {
    const userInfo = ref<UserInfo | null>(null)
    const isLogin = ref(false)

    const login = (info: UserInfo) => {
      userInfo.value = {
        ...info,
        permissions: info.permissions?.length ? info.permissions : getFallbackPermissions(info.role)
      }
      isLogin.value = true
    }

    const logout = () => {
      userInfo.value = null
      isLogin.value = false
    }

    const setPermissions = (permissions: string[]) => {
      if (userInfo.value) {
        userInfo.value.permissions = permissions
      }
    }

    const hasPermission = (permission: string) => {
      return userInfo.value?.permissions?.includes(permission) ?? false
    }

    const hasAnyPermission = (permissions: string[]) => {
      return permissions.some(permission => hasPermission(permission))
    }

    const refreshPermissions = async () => {
      try {
        const { default: request } = await import('../components/request')
        const res = await request.get('/api/me/permissions')
        if (res.data?.success && res.data.data?.permissions) {
          setPermissions(res.data.data.permissions)
        }
      } catch (err) {
        console.error('刷新权限失败:', err)
      }
    }

    return { userInfo, isLogin, login, logout, setPermissions, hasPermission, hasAnyPermission, refreshPermissions }
  },
  {
    persist: {
      key: 'user-store',
      storage: sessionStorage,
      paths: ['userInfo', 'isLogin']
    } as PersistenceOptions   
  }
)
