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
          <div class="data-card volunteer-card" @click="toPage('/students1')">
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

    <!-- 图表区域 -->
    <div class="tables-row">
      <div class="table-card">
        <div class="table-title">
          <span>每月新增救助数量 vs 死亡数量</span>
          <el-select v-model="selectedYear" size="small" style="width: 100px; margin-left: auto;" @change="onYearChange">
            <el-option v-for="year in yearOptions" :key="year" :label="year" :value="year" />
          </el-select>
        </div>
        <div ref="trendChartRef" class="table-placeholder"></div>
      </div>
      <div class="table-card">
        <div class="table-title">健康状态分布</div>
        <div ref="healthChartRef" class="table-placeholder"></div>
      </div>
    </div>

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

      <!-- 公告栏（懒加载） -->
      <div class="announcement-card" @click="toPage('/announcement')">
        <div class="announcement-title">
          <el-icon class="announcement-icon"><Bell /></el-icon>
          <span>公告栏</span>
        </div>
        <div
          ref="announcementScrollRef"
          class="announcement-list"
          @scroll="handleAnnouncementScroll"
        >
          <div v-for="announcement in announcementsList" :key="announcement.id" class="announcement-item">
            <div class="announcement-content">
              <div class="announcement-title-text">{{ announcement.title }}</div>
              <div class="announcement-description">{{ announcement.description }}</div>
            </div>
            <div class="announcement-time">{{ announcement.time }}</div>
          </div>
          <div v-if="announcementsLoading" class="loading-tip">加载中...</div>
          <div v-else-if="!announcementsHasMore" class="no-more-tip">没有更多了</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowRight, Bell } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import service from '../components/request.ts'
// 按需引入 ECharts 核心模块和需要的组件
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  ToolboxComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 注册需要的组件
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  ToolboxComponent,
  CanvasRenderer
])

// ===================== 类型定义 =====================
interface AnimalItem {
  id: number
  name: string
  age: string
  breed: string
  healthStatus: string
  health: string
  foundTime: string
  area: string
  deadTime?: string | null
  isDead?: boolean | number | null
}

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

interface AnnouncementItem {
  id: number
  title: string
  description: string
  time: string
  author: string
}

// ===================== 响应式数据 =====================
const router = useRouter()
const loading = ref(false)

// 原始数据（用于按年份过滤）
let rawCats: AnimalItem[] = []
let rawDogs: AnimalItem[] = []

const materialData = ref<MaterialItem[]>([])
const volunteerCount = ref(0)
const pointCount = ref(0)
const catCount = ref(0)
const dogCount = ref(0)

// 图表数据
const monthlyFound = ref<number[]>(new Array(12).fill(0))
const monthlyDead = ref<number[]>(new Array(12).fill(0))
const healthStatusCounts = ref({
  normal: 0,
  attention: 0,
  emergency: 0,
  dead: 0
})

// 年份相关
const selectedYear = ref<number>(new Date().getFullYear())
const yearOptions = ref<number[]>([])

// 图表实例
let trendChart: echarts.ECharts | null = null
let healthChart: echarts.ECharts | null = null
const trendChartRef = ref<HTMLDivElement | null>(null)
const healthChartRef = ref<HTMLDivElement | null>(null)

const trendLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

// 公告栏相关
const announcementsList = ref<AnnouncementItem[]>([])
const announcementsPage = ref(1)
const announcementsPageSize = ref(5)  // 每次加载5条
const announcementsTotal = ref(0)
const announcementsLoading = ref(false)
const announcementsHasMore = ref(true)
const announcementScrollRef = ref<HTMLDivElement | null>(null)

// ===================== 辅助函数 =====================
const isAlive = (healthStatus: string): boolean => {
  return !['dead', '已死亡'].includes(healthStatus)
}

/**
 * 根据年份统计每月新增和死亡
 */
const computeMonthlyStatsByYear = (cats: AnimalItem[], dogs: AnimalItem[], year: number) => {
  const found = new Array(12).fill(0)
  const dead = new Array(12).fill(0)
  const all = [...cats, ...dogs]
  for (const animal of all) {
    // 新增：foundTime 年份匹配
    if (animal.foundTime) {
      const d = new Date(animal.foundTime)
      if (!isNaN(d.getTime()) && d.getFullYear() === year) {
        const month = d.getMonth()
        found[month]++
      }
    }
    // 死亡：isDead 且 deadTime 年份匹配
    const isDeadAnimal = animal.isDead === 1
    if (isDeadAnimal && animal.deadTime) {
      const d = new Date(animal.deadTime)
      if (!isNaN(d.getTime()) && d.getFullYear() === year) {
        const month = d.getMonth()
        dead[month]++
      }
    }
  }
  return { found, dead }
}

// 提取所有数据中出现的年份
const extractYears = (cats: AnimalItem[], dogs: AnimalItem[]): number[] => {
  const years = new Set<number>()
  const addYear = (dateStr?: string | null) => {
    if (!dateStr) return
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) years.add(d.getFullYear())
  }
  cats.forEach(c => { addYear(c.foundTime); addYear(c.deadTime) })
  dogs.forEach(d => { addYear(d.foundTime); addYear(d.deadTime) })
  if (years.size === 0) years.add(new Date().getFullYear())
  return Array.from(years).sort((a, b) => a - b)
}

// ===================== 图表初始化与更新 =====================
const initTrendChart = () => {
  if (!trendChartRef.value) return
  if (trendChart) trendChart.dispose()
  trendChart = echarts.init(trendChartRef.value)

  trendChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['新增救助数', '死亡数'], top: 0, left: 'center' },
    grid: { left: '3%', right: '4%', bottom: '10%' },
    toolbox: { feature: { saveAsImage: {} } },
    xAxis: { type: 'category', data: trendLabels },
    yAxis: { type: 'value', name: '数量（只）' },
    series: [
      {
        name: '新增救助数',
        type: 'bar',
        barWidth: '30%',
        data: monthlyFound.value,
        itemStyle: { color: '#67C23A', borderRadius: [6, 6, 0, 0] }
      },
      {
        name: '死亡数',
        type: 'bar',
        barWidth: '30%',
        data: monthlyDead.value,
        itemStyle: { color: '#F56C6C', borderRadius: [6, 6, 0, 0] }
      }
    ]
  })
}

const updateTrendChart = () => {
  if (trendChart) {
    trendChart.setOption({
      series: [
        { data: monthlyFound.value },
        { data: monthlyDead.value }
      ]
    })
  } else {
    initTrendChart()
  }
}

const initHealthChart = () => {
  if (!healthChartRef.value) return
  if (healthChart) healthChart.dispose()
  healthChart = echarts.init(healthChartRef.value)

  healthChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    toolbox: { feature: { saveAsImage: {} } },
    series: [{
      name: '健康状态',
      type: 'pie',
      radius: ['40%', '70%'],
      roseType: 'area',
      itemStyle: { borderRadius: 8 },
      data: [
        { value: healthStatusCounts.value.normal, name: '健康' },
        { value: healthStatusCounts.value.attention, name: '需要关注' },
        { value: healthStatusCounts.value.emergency, name: '紧急' },
        { value: healthStatusCounts.value.dead, name: '已死亡' }
      ],
      label: { show: true, formatter: '{b}：{c}（{d}%）' }
    }]
  })
}

const updateHealthChart = () => {
  if (healthChart) {
    healthChart.setOption({
      series: [{
        data: [
          { value: healthStatusCounts.value.normal, name: '健康' },
          { value: healthStatusCounts.value.attention, name: '需要关注' },
          { value: healthStatusCounts.value.emergency, name: '紧急' },
          { value: healthStatusCounts.value.dead, name: '已死亡' }
        ]
      }]
    })
  } else {
    initHealthChart()
  }
}

// 按当前选中年份刷新柱状图
const refreshTrendByYear = () => {
  const { found, dead } = computeMonthlyStatsByYear(rawCats, rawDogs, selectedYear.value)
  monthlyFound.value = found
  monthlyDead.value = dead
  updateTrendChart()
}

const onYearChange = () => {
  refreshTrendByYear()
}

// 加载公告列表（分页）
const loadAnnouncements = async (isLoadMore = false) => {
  if (announcementsLoading.value) return
  if (!isLoadMore) {
    // 重置分页
    announcementsPage.value = 1
    announcementsList.value = []
    announcementsHasMore.value = true
  }
  if (!announcementsHasMore.value && isLoadMore) return

  announcementsLoading.value = true
  try {
    const res = await service.get('/api/announcements', {
      params: {
        page: announcementsPage.value,
        pageSize: announcementsPageSize.value
      }
    })
    if (res.data.success) {
      const list = res.data.data?.list || []
      const total = res.data.data?.total || 0
      if (isLoadMore) {
        announcementsList.value.push(...list)
      } else {
        announcementsList.value = list
      }
      announcementsTotal.value = total
      // 判断是否还有更多
      announcementsHasMore.value = announcementsList.value.length < total
      if (announcementsHasMore.value) {
        announcementsPage.value++
      }
    } else {
      ElMessage.error(res.data.msg || '加载公告失败')
    }
  } catch (err) {
    console.error('加载公告失败', err)
    ElMessage.error('加载公告失败')
  } finally {
    announcementsLoading.value = false
  }
}

  // 滚动加载更多
let ticking = false
const handleAnnouncementScroll = (e: Event) => {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => { 
    const target = e.target as HTMLDivElement
    const { scrollTop, scrollHeight, clientHeight } = target
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      loadAnnouncements(true)  // 加载下一页
    }
    ticking = false
  })
}

// ===================== 数据请求 =====================
const fetchAllData = async () => {
  loading.value = true
  try {
    // 1. 获取动物数据（使用主页专用接口，含 cats/dogs 原始数据）
    const chartRes = await service.get('/api/home/chart-data')
    if (!chartRes.data.success) {
      throw new Error(chartRes.data.msg || '获取动物数据失败')
    }
    const { cats, dogs, healthStatusData } = chartRes.data.data
    rawCats = cats || []
    rawDogs = dogs || []

    // 2. 计算存活数量
    catCount.value = rawCats.filter(a => isAlive(a.healthStatus)).length
    dogCount.value = rawDogs.filter(a => isAlive(a.healthStatus)).length

    // 3. 提取年份选项
    const years = extractYears(rawCats, rawDogs)
    yearOptions.value = years.length ? years : [new Date().getFullYear()]
    if (!yearOptions.value.includes(selectedYear.value)) {
      selectedYear.value = yearOptions.value[yearOptions.value.length - 1] ?? new Date().getFullYear()
    }

    // 4. 根据当前年份统计月度数据
    const { found, dead } = computeMonthlyStatsByYear(rawCats, rawDogs, selectedYear.value)
    monthlyFound.value = found
    monthlyDead.value = dead

    // 5. 健康状态分布
    if (healthStatusData) {
      healthStatusCounts.value = {
        normal: healthStatusData.normal || 0,
        attention: healthStatusData.attention || 0,
        emergency: healthStatusData.emergency || 0,
        dead: healthStatusData.dead || 0
      }
    } else {
      const all = [...rawCats, ...rawDogs]
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

    // 6. 请求其他独立数据
    const [volunteerRes, pointRes, materialRes] = await Promise.all([
      service.get('/api/users', { params: { page: 1, pageSize: 1000, role: 'volunteer' } }),
      service.get('/api/points'),
      service.get('/api/materials', { params: { page: 1, pageSize: 1000 } })
    ])

    if (volunteerRes.data.success) {
      volunteerCount.value = volunteerRes.data.data?.list?.length || 0
    }
    if (pointRes.data.success) {
      pointCount.value = pointRes.data.data?.length || 0
    }
    if (materialRes.data.success) {
      materialData.value = materialRes.data.data?.list || []
    }

    // 等待 DOM 更新后渲染图表
    await nextTick()
    initTrendChart()
    initHealthChart()
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

// ===================== 计算属性 =====================
const urgentMaterials = computed(() => {
  return materialData.value.filter(item => item.status === '紧缺')
})

// ===================== 窗口自适应 =====================
const resizeCharts = () => {
  trendChart?.resize()
  healthChart?.resize()
}

// ===================== 生命周期 =====================
onMounted(() => {
  fetchAllData()
  loadAnnouncements()  // 加载公告第一页
  window.addEventListener('resize', resizeCharts)
})

onUnmounted(() => {
  trendChart?.dispose()
  healthChart?.dispose()
  window.removeEventListener('resize', resizeCharts)
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
.tables-row {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  width: 100%;
  min-height: 300px;
}
.table-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.table-placeholder {
  flex: 1;
  min-height: 200px;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
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
.announcement-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.3s ease;
}
.announcement-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}
.announcement-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #e9ecef;
}
.announcement-icon {
  font-size: 18px;
  color: #409eff;
  margin-right: 5px;
}
.announcement-list {
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.announcement-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
  transition: all 0.3s ease;
}
.announcement-item:hover {
  background-color: #e3f2fd;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.announcement-title-text {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.announcement-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}
.announcement-time {
  font-size: 11px;
  color: #999;
  text-align: right;
  margin-top: 4px;
}
.loading-tip, .no-more-tip {
  text-align: center;
  font-size: 12px;
  color: #999;
  padding: 8px;
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
  .tables-row { grid-template-columns: 1fr; gap: 12px; min-height: auto; }
  .table-card { padding: 16px; min-height: 280px; }
  .table-title { font-size: 14px; margin-bottom: 12px; padding-bottom: 6px; }
  .table-placeholder { min-height: 220px; }
  .bottom-cards { grid-template-columns: 1fr; gap: 12px; }
  .page-footer { padding: 16px; }
  .footer-title { font-size: 14px; margin-bottom: 8px; }
  .footer-title::before { width: 6px; height: 6px; }
  .urgent-item { font-size: 12px; line-height: 1.8; padding-left: 18px; }
  .urgent-item::before { width: 14px; height: 14px; font-size: 10px; top: 5px; }
  .announcement-card { padding: 16px; }
  .announcement-title { font-size: 14px; margin-bottom: 12px; padding-bottom: 8px; }
  .announcement-icon { font-size: 16px; }
  .announcement-list { gap: 10px; max-height: 240px; }
  .announcement-item { padding: 10px; }
  .announcement-title-text { font-size: 13px; }
  .announcement-description { font-size: 11px; }
  .announcement-time { font-size: 10px; }
}
@media screen and (max-width: 480px) {
  .home-page { padding: 8px; gap: 8px; }
  .data-card-container { padding: 12px; }
  .cards-wrapper { gap: 6px; }
  .data-card { padding: 12px 6px; }
  .card-label { font-size: 11px; }
  .card-value { font-size: 20px; }
  .card-arrow { font-size: 14px; }
  .table-card { padding: 12px; min-height: 240px; }
  .table-title { font-size: 13px; }
  .table-placeholder { min-height: 180px; }
  .page-footer { padding: 12px; }
  .urgent-item { font-size: 11px; }
  .announcement-card { padding: 12px; }
  .announcement-title { font-size: 13px; }
  .announcement-icon { font-size: 14px; }
  .announcement-list { gap: 8px; max-height: 220px; }
  .announcement-item { padding: 8px; }
  .announcement-title-text { font-size: 12px; }
  .announcement-description { font-size: 10px; }
  .announcement-time { font-size: 9px; }
}
</style>