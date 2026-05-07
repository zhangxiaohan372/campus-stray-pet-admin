import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'

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

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: string[]
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
        },
        {
          path: 'cats',
          name: 'cats',
          component: CatPage,
        },
        {
          path: 'dogs',
          name: 'dogs',
          component: DogPage,
        },
        {
          path: 'school-map',
          name: 'school-map',
          component: SchoolMap,
        },
        {
          path: 'students1',
          name: 'students1',
          component: StudentPage,
          meta: { roles: ['admin'] },
        },

        {
          path: 'management',
          name: 'management',
          component: MaterialManagement,
        },
        {
          path: 'announcement',
          name: 'announcement',
          component: Announcement
        },
        {
          path: 'volunteer',
          name: 'volunteer',
          component: VolunteerActivity,
          meta: { roles: ['admin'] }
        }
      ]
    }
  ]
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  // 需要登录的页面
  if (to.meta.requiresAuth) {
    if (userStore.isLogin) {
      const userRole = userStore.userInfo?.role || ''
      if (to.meta.roles?.includes(userRole)) {
        next()
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