<template>
  <div class="app-container">
    <div class="head">
      <div class="id">
        <!-- 1. 绑定退出登录事件 -->
        <span @click="handleLogout" class="logout-btn">
          <el-icon><SwitchButton /></el-icon>
          <span>退出</span>
        </span>
        <!-- 2. 兜底显示，避免空白 -->
        <span>欢迎您！{{ userStore.userInfo?.name || '管理员' }}</span>
      </div>
    </div>
    <div class="main-content">
      <div class="column-navigate">
        <el-button 
          class="collapse-button"
          plain
          round
          @click="isCollapse = !isCollapse"
          style="margin-bottom: 20px"
        >
          {{ isCollapse ? '展开' : '收缩' }}
        </el-button>

        <el-menu
          :default-active="activeMenu"
          class="el-menu-vertical-demo custom-menu"
          :collapse="isCollapse"
          @open="handleOpen"
          @close="handleClose"
          @select="handleMenuSelect"
        >
          <el-sub-menu index="1">
            <template #title>
              <el-icon><Star /></el-icon>
              <span>毛孩子数据</span>
            </template>
            <el-menu-item-group>
              <el-menu-item index="/dogs">小狗</el-menu-item> 
              <el-menu-item index="/cats">小猫</el-menu-item> 
            </el-menu-item-group>
          </el-sub-menu>
          <el-menu-item index="/school-map">
            <el-icon><MapLocation /></el-icon>
            <template #title>投喂点管理</template>
          </el-menu-item>
          <el-menu-item index="/students1">
            <el-icon><User /></el-icon>
            <template #title>学生信息</template>
          </el-menu-item>
          <el-menu-item index="/management">
            <el-icon><MessageBox /></el-icon>
            <template #title>物资管理</template>
          </el-menu-item>
          <el-menu-item index="/announcement">
            <el-icon><Bell /></el-icon>
            <template #title>通知</template>
          </el-menu-item>
          <el-menu-item index="/volunteer">
            <el-icon><Medal /></el-icon>
            <template #title>志愿活动</template>
          </el-menu-item>
        </el-menu>
      </div>
       <div class="content-area">
      <router-view />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus' 
import { Star, MapLocation, User, MessageBox, SwitchButton ,Bell, UserFilled, Medal } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'

import request from '../components/request'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

const isCollapse = ref(true)  
const activeMenu = ref(route.path) 


watch(() => route.path, (newPath) => {
  activeMenu.value = newPath
}, { immediate: true })

const handleMenuSelect = (index: string): void => {
  router.push(index)
}

const handleLogout = async (): Promise<void> => {
  try {
    // 确认退出
    await ElMessageBox.confirm(
      '确定要退出登录吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 1. 调用后端退出接口，清除HttpOnly Cookie
    await request.post('/api/logout')
    // 2. 清空Pinia状态
    userStore.logout()
    // 3. 提示+跳转
    ElMessage.success('退出登录成功！')
    router.push('/login')
  } catch (err) {
    // 取消退出则不处理
    if (err !== 'cancel') {
      ElMessage.error('退出失败，请稍后重试！')
      console.error('退出登录报错：', err)
    }
  }
}

const handleOpen = (key: string, keyPath: string[]): void => {
  console.log(key, keyPath)
}
const handleClose = (key: string, keyPath: string[]): void => {
  console.log(key, keyPath)
}

onMounted(() => { 
  console.log('布局页挂载时 userInfo：', userStore.userInfo)
  if (!userStore.isLogin || !userStore.userInfo) {
    ElMessage.warning('请先登录后再访问！')
    router.push('/login')
  }
})
</script>

<style scoped>
.app-container, .head, .id, .main-content, .column-navigate, .content-area {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
.app-container {
  width: 100%;
  height: 100vh;
}
.head {
  height: 80px;
  display: flex;
  background-color: #f5f5f5;
  align-items: center;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
}
.id {
  margin-left: auto;
  display: flex;
  align-items: center;
  font-size: 14px;
  padding: 10px;
  gap: 15px;
}
.id span {
  cursor: pointer;
  transition: color 0.3s;
}
.content-area {
  flex: 1;                /* 占据剩余宽度 */
  overflow: auto;         /* 内容超出时显示滚动条 */
  padding: 20px;          /* 可选，为子页面内容提供内边距 */
}
/* 退出按钮样式优化 */
.logout-btn {
  color: #f56c6c;
}
.logout-btn:hover {
  color: #e64949;
}
.id span:not(.logout-btn):hover {
  color: #409eff;
}
.main-content {
  display: flex;
  width: 100%;
  height: calc(100vh - 80px); /* 减去头部高度，避免滚动 */
  background-color: #f8f8f8;
}
.column-navigate {
  background-color: #e9e9e9;
  padding: 10px;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.collapse-button {
  --el-button-text-color: #333;
  --el-button-bg-color: #f0f0f0;
  --el-button-border-color: #dcdcdc;
  --el-button-hover-text-color: #333;
  --el-button-hover-bg-color: #e0e0e0;
  --el-button-hover-border-color: #cacaca;
  --el-button-active-text-color: #333;
  --el-button-active-bg-color: #dcdcdc;
  --el-button-active-border-color: #cacaca;
}
.custom-menu {
  --el-menu-text-color: #333;
  --el-menu-active-text-color: #333;
  --el-menu-bg-color: transparent;
  --el-menu-hover-bg-color: #dcdcdc;
  --el-menu-item-active-bg-color: #d0d0d0;
  --el-sub-menu-title-color: #333;
  --el-sub-menu-title-hover-bg-color: #dcdcdc;
  border: none;
  flex: 1;
  overflow-y: auto; /* 菜单过多时滚动 */
}
.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 200px;
  min-height: 400px;
}
</style>