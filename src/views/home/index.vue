<template>
  <div class="home-page">
    <!-- 数据概览卡片区域 -->
    <div class="data-card-container">
      <div class="vertical-wrapper">
        <div class="data-title">数据概览：</div>
        <div class="cards-wrapper">
          <div class="data-card cat-card" @click="toPage('/cats')">
            <div class="card-content">
              <p class="card-label">小猫数量（存活）</p>
              <p class="card-value">{{ catCount }}</p>
            </div>
            <el-icon class="card-arrow"><ArrowRight /></el-icon>
          </div>
          <div class="data-card dog-card" @click="toPage('/dogs')">
            <div class="card-content">
              <p class="card-label">小狗数量（存活）</p>
              <p class="card-value">{{ dogCount }}</p>
            </div>
            <el-icon class="card-arrow"><ArrowRight /></el-icon>
          </div>
          <div class="data-card volunteer-card" @click="handleVolunteerCardClick">
            <div class="card-content">
              <p class="card-label">志愿者数量</p>
              <p class="card-value">{{ volunteerCount }}</p>
            </div>
            <el-icon class="card-arrow"><ArrowRight /></el-icon>
          </div>
          <div class="data-card unreviewed-card" @click="toPage('/points')">
            <div class="card-content">
              <p class="card-label">救助点数量</p>
              <p class="card-value">{{ pointCount }}</p>
            </div>
            <el-icon class="card-arrow"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域（独立业务组件） -->
    <HomeCharts
      :cats="rawCats"
      :dogs="rawDogs"
      :health-data="healthStatusCounts"
      :loading="loading"
    />

    <!-- 底部卡片区域 -->
    <div class="bottom-cards">
      <!-- 紧急处理事项 -->
      <div class="page-footer">
        <div class="footer-title">紧急处理事项</div>
        <ul class="urgent-list">
          <li class="urgent-item" v-for="item in urgentMaterials" :key="item.id">
            {{ item.materialName }} 缺少，请尽快补充。
          </li>
        </ul>
      </div>

      <!-- 公告栏（独立组件） -->
      <HomeAnnouncementCard />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowRight } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { getHomeChartDataApi, type HomeAnimalItem, type HomeHealthStatusCounts } from '../../api/home'
import { getPointsApi } from '../../api/point'
import { getMaterialsApi } from '../../api/material'
import { getUsersApi } from '../../api/user'
import HomeAnnouncementCard from './components/HomeAnnouncementCard.vue'
import HomeCharts from './components/HomeCharts.vue'

// ===================== 类型定义 =====================
type AnimalItem = HomeAnimalItem

interface MaterialItem {
  id: number
  pointCode: string
  species: 'cat' | 'dog'
  materialName: string
  unit: string
  quantity: number
  minStock: number
  status: '紧缺' | '充足' | '其他'
  operator: string
  remark: string
  createTime: string
  updateTime: string
}


// ===================== 响应式数据 =====================
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)

// 原始数据（传递给图表组件与统计卡片）
const rawCats = ref<AnimalItem[]>([])
const rawDogs = ref<AnimalItem[]>([])

const materialData = ref<MaterialItem[]>([])
const volunteerCount = ref(0)
const pointCount = ref(0)
const catCount = ref(0)
const dogCount = ref(0)

const healthStatusCounts = ref<HomeHealthStatusCounts>({
  normal: 0,
  attention: 0,
  emergency: 0,
  dead: 0
})

// ===================== 辅助函数 =====================
const isAlive = (healthStatus: string): boolean => {
  return !['dead', '已死亡'].includes(healthStatus)
}


// ===================== 数据请求 =====================
const fetchAllData = async () => {
  loading.value = true
  try {
    // 1. 获取动物数据（使用主页专用接口，含 cats/dogs 原始数据）
    const chartRes = await getHomeChartDataApi()
    if (!chartRes.data.success) {
      throw new Error(chartRes.data.msg || '获取动物数据失败')
    }
    const { cats, dogs, healthStatusData, volunteerCount: chartVolunteerCount } = chartRes.data.data
    rawCats.value = cats || []
    rawDogs.value = dogs || []
    if (typeof chartVolunteerCount === 'number') {
      volunteerCount.value = chartVolunteerCount
    }

    // 2. 计算存活数量
    catCount.value = rawCats.value.filter(a => isAlive(a.healthStatus)).length
    dogCount.value = rawDogs.value.filter(a => isAlive(a.healthStatus)).length

    // 3. 健康状态分布
    if (healthStatusData) {
      healthStatusCounts.value = {
        normal: healthStatusData.normal || 0,
        attention: healthStatusData.attention || 0,
        emergency: healthStatusData.emergency || 0,
        dead: healthStatusData.dead || 0
      }
    } else {
      const all = [...rawCats.value, ...rawDogs.value]
      const counts = { normal: 0, attention: 0, emergency: 0, dead: 0 }
      all.forEach(animal => {
        const s = animal.healthStatus
        if (s === 'normal' || s === '健康') counts.normal++
        else if (s === 'attention' || s === '需要关注') counts.attention++
        else if (s === 'emergency' || s === '紧急') counts.emergency++
        else if (s === 'dead' || s === '已死亡') counts.dead++
      })
      healthStatusCounts.value = counts
    }

    // 4. 请求其他独立数据
    const [pointRes, materialRes] = await Promise.all([
      getPointsApi(),
      getMaterialsApi({ page: 1, pageSize: 1000 })
    ])

    if (pointRes.data.success) {
      pointCount.value = pointRes.data.data?.length || 0
    }
    if (materialRes.data.success) {
      materialData.value = (materialRes.data.data?.list || []) as any
    }

    // 若主页接口未提供志愿者数量且具备 user:read 权限，则补充查询
    if (volunteerCount.value === 0 && userStore.hasPermission('user:read')) {
      try {
        const volunteerRes = await getUsersApi({ page: 1, pageSize: 1000, role: 'volunteer' })
        if (volunteerRes.data?.success) {
          volunteerCount.value = volunteerRes.data.data?.list?.length || 0
        }
      } catch (err) {
        console.warn('获取志愿者列表失败（非阻断）：', err)
      }
    }

    ElMessage.success('数据加载成功')
  } catch (error) {
    console.error('数据请求错误：', error)
    ElMessage.error('数据加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// ===================== 页面跳转 =====================
const toPage = (path: string) => {
  router.push(path)
}

const handleVolunteerCardClick = () => {
  if (userStore.hasPermission('user:read')) {
    toPage('/students1')
  } else {
    ElMessage.info('当前账号仅支持查看志愿者统计概览，无学生档案维护权限')
  }
}

// ===================== 计算属性 =====================
const urgentMaterials = computed(() => {
  return materialData.value.filter(item => item.status === '紧缺')
})

// ===================== 生命周期 =====================
onMounted(() => {
  fetchAllData()
})
</script>

<style scoped>
/* 样式保持不变（沿用之前的全部样式） */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
.home-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  overflow-y: auto;
  padding: 16px;
  margin: 0;
}
.data-card-container {
  width: 100%;
  background-color: #fff;
  padding: 24px;
  box-sizing: border-box;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.vertical-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.data-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
  margin: 0;
  padding-left: 8px;
  border-left: 4px solid #409eff;
}
.cards-wrapper {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  width: 100%;
}
.data-card {
  padding: 20px 12px;
  background-color: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #e9ecef;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.data-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border-color: #409eff;
}
.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
}
.card-arrow {
  font-size: 20px;
  color: #409eff;
  flex-shrink: 0;
  transition: all 0.3s ease;
}
.data-card:hover .card-arrow {
  transform: translateX(5px);
  color: #1890ff;
}
.card-label {
  font-size: 14px;
  color: #6c757d;
  margin: 0 0 8px 0;
  font-weight: 400;
  text-align: center;
  white-space: nowrap;
}
.card-value {
  font-size: 32px;
  color: #343a40;
  margin: 0;
  font-weight: 700;
}

.bottom-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  width: 100%;
}
.page-footer {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
}
.footer-title {
  font-size: 16px;
  font-weight: 600;
  color: #dc3545;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.footer-title::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #dc3545;
}
.urgent-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.urgent-item {
  font-size: 14px;
  color: #495057;
  line-height: 2;
  padding-left: 20px;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.urgent-item::before {
  content: '!';
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #fff3cd;
  color: #ffc107;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 0;
  top: 6px;
}

@media screen and (max-width: 768px) {
  .home-page { padding: 12px; gap: 12px; }
  .data-card-container { padding: 16px; }
  .data-title { font-size: 16px; padding-left: 6px; border-left-width: 3px; }
  .cards-wrapper { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .data-card { padding: 16px 8px; }
  .card-label { font-size: 12px; margin-bottom: 4px; white-space: normal; line-height: 1.4; }
  .card-value { font-size: 24px; }
  .card-arrow { font-size: 16px; }
  .bottom-cards { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .page-footer { padding: 16px; }
  .footer-title { font-size: 14px; margin-bottom: 8px; }
  .footer-title::before { width: 6px; height: 6px; }
  .urgent-item { font-size: 12px; line-height: 1.8; padding-left: 18px; }
  .urgent-item::before { width: 14px; height: 14px; font-size: 10px; top: 5px; }
}

/* 小屏幕适配 (480px - 768px) */
@media screen and (max-width: 480px) {
  .home-page { padding: 8px; gap: 8px; }
  .data-card-container { padding: 12px; }
  .cards-wrapper { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .data-card { padding: 12px 6px; }
  .card-label { font-size: 11px; }
  .card-value { font-size: 20px; }
  .card-arrow { font-size: 14px; }
  /* 底部卡片改为单列 */
  .bottom-cards { grid-template-columns: 1fr; gap: 8px; }
  .page-footer { padding: 12px; }
  .urgent-item { font-size: 11px; }
}

/* 超小屏幕适配 (< 375px) */
@media screen and (max-width: 374px) {
  .home-page { padding: 6px; gap: 6px; }
  .data-card-container { padding: 10px; }
  .data-title { font-size: 14px; padding-left: 4px; border-left-width: 2px; }
  /* 数据卡片改为单列 */
  .cards-wrapper { grid-template-columns: 1fr; gap: 6px; }
  .data-card { padding: 10px 8px; }
  .card-label { font-size: 12px; margin-bottom: 2px; }
  .card-value { font-size: 22px; }
  .card-arrow { font-size: 16px; }
  .bottom-cards { gap: 6px; }
  .page-footer { padding: 10px; }
  .footer-title { font-size: 13px; margin-bottom: 6px; }
  .urgent-item { font-size: 11px; line-height: 1.6; padding-left: 16px; }
}

/* 横屏模式优化 */
@media screen and (max-width: 896px) and (orientation: landscape) {
  .home-page { padding: 10px; }
  .cards-wrapper { grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .data-card { padding: 10px 6px; }
  .card-label { font-size: 11px; }
  .card-value { font-size: 18px; }
  .bottom-cards { grid-template-columns: repeat(2, 1fr); gap: 10px; }
}
</style>

