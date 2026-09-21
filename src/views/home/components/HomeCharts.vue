<template>
  <div class="tables-row">
    <!-- 救助情况月度趋势卡片 -->
    <div class="table-card">
      <div class="table-title">
        <span>救助情况月度趋势</span>
        <el-select
          v-model="selectedYear"
          placeholder="选择年份"
          size="small"
          style="width: 100px; margin-left: 12px"
        >
          <el-option
            v-for="year in yearOptions"
            :key="year"
            :label="`${year}年`"
            :value="year"
          />
        </el-select>
      </div>
      <div class="table-placeholder">
        <BaseChart :options="trendOptions" :loading="loading" />
      </div>
    </div>

    <!-- 健康状态分布卡片 -->
    <div class="table-card">
      <div class="table-title">
        <span>流浪动物健康状态分布</span>
      </div>
      <div class="table-placeholder">
        <BaseChart :options="healthOptions" :loading="loading" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BaseChart from '../../../components/BaseChart.vue'
import type { HomeAnimalItem, HomeHealthStatusCounts } from '../../../api/home'

interface Props {
  cats: HomeAnimalItem[]
  dogs: HomeAnimalItem[]
  healthData?: HomeHealthStatusCounts
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  cats: () => [],
  dogs: () => [],
  healthData: () => ({ normal: 0, attention: 0, emergency: 0, dead: 0 }),
  loading: false
})

const trendLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

// 年份相关
const selectedYear = ref<number>(new Date().getFullYear())
const yearOptions = ref<number[]>([new Date().getFullYear()])

// 提取所有数据中出现的年份
const extractYears = (cats: HomeAnimalItem[], dogs: HomeAnimalItem[]): number[] => {
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

// 监听 cats/dogs 更新年份列表
watch(
  [() => props.cats, () => props.dogs],
  ([newCats, newDogs]) => {
    const years = extractYears(newCats, newDogs)
    yearOptions.value = years.length ? years : [new Date().getFullYear()]
    if (!yearOptions.value.includes(selectedYear.value)) {
      selectedYear.value = yearOptions.value[yearOptions.value.length - 1] ?? new Date().getFullYear()
    }
  },
  { immediate: true }
)

// 计算选中年份的月度救助与死亡数据
const monthlyStats = computed(() => {
  const found = new Array(12).fill(0)
  const dead = new Array(12).fill(0)
  const all = [...props.cats, ...props.dogs]
  const currentYear = selectedYear.value

  for (const animal of all) {
    if (animal.foundTime) {
      const d = new Date(animal.foundTime)
      if (!isNaN(d.getTime()) && d.getFullYear() === currentYear) {
        found[d.getMonth()]++
      }
    }
    const isDeadAnimal = animal.isDead === 1
    if (isDeadAnimal && animal.deadTime) {
      const d = new Date(animal.deadTime)
      if (!isNaN(d.getTime()) && d.getFullYear() === currentYear) {
        dead[d.getMonth()]++
      }
    }
  }
  return { found, dead }
})

// 月度趋势图 ECharts 配置项
const trendOptions = computed(() => ({
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
      data: monthlyStats.value.found,
      itemStyle: { color: '#67C23A', borderRadius: [6, 6, 0, 0] }
    },
    {
      name: '死亡数',
      type: 'bar',
      barWidth: '30%',
      data: monthlyStats.value.dead,
      itemStyle: { color: '#F56C6C', borderRadius: [6, 6, 0, 0] }
    }
  ]
}))

// 健康分布数据
const healthCounts = computed(() => {
  if (
    props.healthData &&
    (props.healthData.normal > 0 ||
      props.healthData.attention > 0 ||
      props.healthData.emergency > 0 ||
      props.healthData.dead > 0)
  ) {
    return props.healthData
  }
  const all = [...props.cats, ...props.dogs]
  const counts = { normal: 0, attention: 0, emergency: 0, dead: 0 }
  all.forEach(animal => {
    const s = animal.healthStatus
    if (s === 'normal' || s === '健康') counts.normal++
    else if (s === 'attention' || s === '需要关注') counts.attention++
    else if (s === 'emergency' || s === '紧急') counts.emergency++
    else if (s === 'dead' || s === '已死亡') counts.dead++
  })
  return counts
})

// 健康状态饼图 ECharts 配置项
const healthOptions = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { orient: 'vertical', left: 'left' },
  toolbox: { feature: { saveAsImage: {} } },
  series: [
    {
      name: '健康状态',
      type: 'pie',
      radius: ['40%', '70%'],
      roseType: 'area',
      itemStyle: { borderRadius: 8 },
      data: [
        { value: healthCounts.value.normal, name: '健康' },
        { value: healthCounts.value.attention, name: '需要关注' },
        { value: healthCounts.value.emergency, name: '紧急' },
        { value: healthCounts.value.dead, name: '已死亡' }
      ],
      label: { show: true, formatter: '{b}：{c}（{d}%）' }
    }
  ]
}))
</script>

<style scoped>
.tables-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  width: 100%;
  min-height: 380px;
}

.table-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 360px;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid #e9ecef;
}

.table-title span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.table-placeholder {
  flex: 1;
  width: 100%;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 移动端与不同尺寸屏幕适配 */
@media screen and (max-width: 768px) {
  .tables-row {
    grid-template-columns: 1fr;
    gap: 12px;
    min-height: auto;
  }
  .table-card {
    padding: 16px;
    min-height: 280px;
  }
  .table-title {
    font-size: 14px;
    margin-bottom: 12px;
    padding-bottom: 6px;
    flex-wrap: wrap;
  }
  .table-title span {
    font-size: 13px;
  }
  .table-placeholder {
    min-height: 220px;
  }
}

@media screen and (max-width: 480px) {
  .table-card {
    padding: 12px;
    min-height: 240px;
  }
  .table-title {
    font-size: 13px;
    flex-wrap: wrap;
  }
  .table-title span {
    font-size: 12px;
    max-width: 150px;
  }
  .table-title :deep(.el-select) {
    width: 80px !important;
    margin-left: 8px !important;
  }
  .table-placeholder {
    min-height: 180px;
  }
}

@media screen and (max-width: 374px) {
  .tables-row {
    gap: 6px;
  }
  .table-card {
    padding: 10px;
    min-height: 200px;
  }
  .table-title {
    font-size: 12px;
    margin-bottom: 8px;
  }
  .table-title span {
    font-size: 11px;
    max-width: 120px;
  }
  .table-title :deep(.el-select) {
    width: 70px !important;
  }
  .table-placeholder {
    min-height: 160px;
  }
}

@media screen and (max-width: 896px) and (orientation: landscape) {
  .tables-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    min-height: 200px;
  }
  .table-card {
    min-height: 200px;
  }
  .table-placeholder {
    min-height: 150px;
  }
}
</style>

