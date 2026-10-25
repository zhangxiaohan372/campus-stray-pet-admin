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
      if (info.token) {
        try {
          localStorage.setItem('token', info.token)
        } catch {
          // ignore
        }
      }
    }

    const logout = () => {
      userInfo.value = null
      isLogin.value = false
      try {
        localStorage.removeItem('token')
      } catch {
        // ignore
      }
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
        const { getMyPermissionsApi } = await import('../api/auth')
        const res = await getMyPermissionsApi()
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

/**
 * 获取当前登录凭证 Token
 * 优先从 Pinia userStore 获取，其次从 localStorage，再次从持久化 sessionStorage 中恢复兜底
 */
export function getAuthToken(): string {
  try {
    const userStore = useUserStore()
    if (userStore.userInfo?.token) {
      return userStore.userInfo.token
    }
  } catch {
    // Pinia 尚未安装或未处于组件上下文
  }

  try {
    const localToken = localStorage.getItem('token')
    if (localToken) return localToken
  } catch {
    // 兼容浏览器安全策略
  }

  try {
    const raw = sessionStorage.getItem('user-store')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.userInfo?.token) {
        return parsed.userInfo.token
      }
    }
  } catch {
    // ignore
  }

  return ''
}
