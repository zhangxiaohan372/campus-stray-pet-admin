import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import request from '../components/request'
import { getFallbackPermissions } from '../config/permissions'

// 路由组件 - 使用懒加载
const Layout = () => import('../layouts/Layout.vue')
const HomeView = () => import('../views/HomeView.vue')
const CatPage = () => import('../views/CatPage.vue')
const DogPage = () => import('../views/DogPage.vue')
const SchoolMap = () => import('../views/SchoolMap.vue')
const StudentPage = () => import('../views/StudentPage.vue')
const MaterialManagement = () => import('../views/MaterialManagement.vue')
const Login = () => import('../views/Login.vue')
const Announcement = () => import('../views/Announcement.vue')
const VolunteerActivity = () => import('../views/VolunteerActivity.vue')
const PermissionManagement = () => import('../views/PermissionManagement.vue')

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: string[]
    permissions?: string[]
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      component: Layout,
      meta: { requiresAuth: true, roles: ['president', 'admin'] },
      children: [
        {
          path: '',
          name: 'home',
          component: HomeView,
          meta: { permissions: ['pet:read', 'material:read', 'activity:read'] }
        },
        {
          path: 'cats',
          name: 'cats',
          component: CatPage,
          meta: { permissions: ['pet:read'] }
        },
        {
          path: 'dogs',
          name: 'dogs',
          component: DogPage,
          meta: { permissions: ['pet:read'] }
        },
        {
          path: 'school-map',
          name: 'school-map',
          component: SchoolMap,
          meta: { permissions: ['point:read'] }
        },
        {
          path: 'students1',
          name: 'students1',
          component: StudentPage,
          meta: { roles: ['admin'], permissions: ['user:read'] },
        },

        {
          path: 'management',
          name: 'management',
          component: MaterialManagement,
          meta: { permissions: ['material:read'] }
        },
        {
          path: 'announcement',
          name: 'announcement',
          component: Announcement,
          meta: { permissions: ['announcement:read'] }
        },
        {
          path: 'volunteer',
          name: 'volunteer',
          component: VolunteerActivity,
          meta: { roles: ['admin'], permissions: ['activity:read'] }
        },
        {
          path: 'permissions',
          name: 'permissions',
          component: PermissionManagement,
          meta: { roles: ['admin'], permissions: ['user:write'] }
        }
      ]
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  // 需要登录的页面
  if (to.meta.requiresAuth) {
    if (userStore.isLogin) {
      if (!userStore.userInfo?.permissions?.length) {
        try {
          const res = await request.get('/api/me/permissions')
          if (res.data.success) {
            userStore.setPermissions(res.data.data.permissions || [])
          }
        } catch (error: any) {
          const role = userStore.userInfo?.role
          const fallbackPermissions = getFallbackPermissions(role)
          if (fallbackPermissions.length) {
            userStore.setPermissions(fallbackPermissions)
          } else {
            userStore.logout()
            next({
              path: '/login',
              query: { redirect: to.fullPath }
            })
            return
          }
        }
      }

      const userRole = userStore.userInfo?.role || ''
      if (to.meta.roles?.includes(userRole)) {
        const permissions = to.meta.permissions || []
        if (permissions.length && !userStore.hasAnyPermission(permissions)) {
          ElMessage.warning('您没有访问该页面的权限')
          next('/')
        } else {
          next()
        }
      } else {
        ElMessage.warning('您没有访问该页面的权限！')
        next('/')
      }
    } else {
      ElMessage.warning('请先登录后再访问！')
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
    }
  } else {
    next()
  }
})

export default router
