import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PersistenceOptions } from 'pinia-plugin-persistedstate'

interface UserInfo {
  id: number
  name: string
  role: string
  token: string
}

export const useUserStore = defineStore(
  'user',
  () => {
    const userInfo = ref<UserInfo | null>(null)
    const isLogin = ref(false)

    const login = (info: UserInfo) => {
      userInfo.value = info
      isLogin.value = true
    }

    const logout = () => {
      userInfo.value = null
      isLogin.value = false
    }

    return { userInfo, isLogin, login, logout }
  },
  {
    persist: {
      key: 'user-store',
      storage: sessionStorage,
      paths: ['userInfo', 'isLogin']
    } as PersistenceOptions   
  }
)