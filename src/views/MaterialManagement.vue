<template>
  <div class="main-container">
    <!-- 全局加载组件 -->
    <BaseLoading :loading="loading" text="正在加载物资数据..." />
    <!-- 紧缺提醒条 -->
    <div class="warning-bar" v-if="shortageCount > 0">
      <el-alert
        :title="`⚠️ 现有 ${shortageCount} 项物资低于最低库存，请及时补充！`"
        type="warning"
        :closable="false"
      />
    </div>

    <!-- 头部：搜索 + 两个下拉筛选（完全模仿学生页面布局） -->
    <div class="header">
      <h2 class="title">物资列表</h2>
      <div class="header-actions">
        <SearchFilterBar
          v-model="searchKeyword"
          placeholder="请输入救助点/物资名称"
          @search="handleSearch"
          :debounce-time="1000"
          style="width: 280px;"
        />
        
        <el-button
          size="default"
          style="margin-left: 8px;"
          @click="handleReset"
        >
          <el-icon><Refresh /></el-icon>
          重置筛选
        </el-button>
        
        <el-select
          v-model="pointFilter"
          placeholder="救助点"
          clearable
          @change="handleFilter"
          style="margin-left: 16px; width: 150px;"
        >
          <el-option label="全部" value="" />
          <el-option label="投点1" value="投点1" />
          <el-option label="投点2" value="投点2" />
          <el-option label="投点3" value="投点3" />
          <el-option label="投点4" value="投点4" />
        </el-select>
        <el-select
          v-model="speciesFilter"
          placeholder="物种类型"
          clearable
          @change="handleFilter"
          style="margin-left: 16px; width: 150px;"
        >
          <el-option label="全部" value="" />
          <el-option label="猫" value="cat" />
          <el-option label="狗" value="dog" />
          <el-option label="通用" value="general" />
        </el-select>
      </div>
    </div>

    <!-- 图表区域（独立接口） -->
    <div class="charts-container">
      <div class="chart-item">
        <h3>各救助点紧缺物资数量</h3>
        <div ref="pieChartRef" class="chart" style="width: 100%; height: 300px;"></div>
      </div>
      <div class="chart-item">
        <h3>物资库存 vs 最低阈值</h3>
        <div ref="barChartRef" class="chart" style="width: 100%; height: 300px;"></div>
      </div>
    </div>

    <!-- 物资表格 -->
    <div class="table-container">
      <TableCard
        :table-data="tableData"
        :columns="columns"
        :loading="loading"
        :row-class-name="getRowClassName"
      >
        <template #species="scope">
          <StatusTag :status="scope.row.species || 'all'"></StatusTag>
        </template>
        <template #status="scope">
          <StatusTag :status="scope.row.status || 'normal'"></StatusTag>
        </template>
        <template #operate="scope">
          <el-button type="primary" size="small" @click="editMaterial(scope.row)">编辑</el-button>
          <el-button type="success" size="small" @click="addMaterial(scope.row)">补充</el-button>
        </template>
      </TableCard>

      <!-- 分页 -->
      <Pagination
        :total="total"
        v-model:page-size="pageSize"
        v-model:current-page="currentPage"
      />
    </div>

    <!-- 编辑/补充物资弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="400px"
      @close="handleDialogClose"
    >
      <el-form ref="formRef" :model="formData" label-width="100px" :rules="formRules">
        <el-form-item label="救助点" prop="pointCode">
          <el-input v-model="formData.pointCode" disabled />
        </el-form-item>
        <el-form-item label="物资名称" prop="materialName">
          <el-input v-model="formData.materialName" disabled />
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model="formData.unit" disabled />
        </el-form-item>
        <el-form-item label="当前库存" prop="quantity" v-if="dialogType === 'edit'">
          <el-input-number v-model="formData.quantity" :min="0" />
        </el-form-item>
        <el-form-item label="最低库存" prop="minStock" v-if="dialogType === 'edit'">
          <el-input-number v-model="formData.minStock" :min="1" />
        </el-form-item>
        <el-form-item label="补充数量" prop="addCount" v-if="dialogType === 'add'">
          <el-input-number v-model="formData.addCount" :min="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMaterial" :loading="submitLoading">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
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
  CanvasRenderer
])
import service from '../components/request'
import SearchFilterBar from '../components/SearchFilterBar.vue'
import Pagination from '../components/Pagination.vue'
import TableCard from '../components/TableCard.vue'
import BaseLoading from '../components/BaseLoading.vue'
import StatusTag from '../components/StatusTag.vue'

// ========== 表格列配置 ==========
const columns = ref([
  { prop: 'pointCode', label: '救助点', width: '120' },
  { prop: 'species', label: '物种', width: '100' },
  { prop: 'materialName', label: '物资名称', width: '150' },
  { prop: 'unit', label: '单位', width: '80' },
  { prop: 'quantity', label: '当前库存', width: '120' },
  { prop: 'minStock', label: '最低库存', width: '120' },
  { prop: 'status', label: '状态', width: '100' },
])

// ========== 数据状态 ==========
const tableData = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const searchKeyword = ref('')
const pointFilter = ref('')
const speciesFilter = ref('')

// 图表
const pieChartRef = ref<HTMLDivElement>()
const barChartRef = ref<HTMLDivElement>()
let pieChart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null

// 弹窗
const dialogVisible = ref(false)
const dialogType = ref<'edit' | 'add'>('edit')
const formRef = ref()
const submitLoading = ref(false)
const formData = ref<any>({
  id: '',
  pointCode: '',
  materialName: '',
  unit: '',
  quantity: 0,
  minStock: 0,
  addCount: 1
})

const dialogTitle = computed(() => (dialogType.value === 'edit' ? '编辑库存' : '补充物资'))

const formRules = {
  quantity: [{ required: true, message: '当前库存不能为空', trigger: 'blur' }],
  minStock: [{ required: true, message: '最低库存不能为空', trigger: 'blur' }],
  addCount: [{ required: true, message: '补充数量不能为空', trigger: 'blur' }]
}

// 紧缺物资数量（用于顶部提醒）
const shortageCount = computed(() => tableData.value.filter(item => item.status === '紧缺').length)

// 行样式（紧缺标红）
const getRowClassName = ({ row }: any) => {
  return row.status === '紧缺' ? 'shortage-row' : ''
}

// ========== 获取表格数据（后端分页 + 筛选） ==========
const fetchTableData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      pageSize: pageSize.value
    }
    if (pointFilter.value) params.pointCode = pointFilter.value
    if (speciesFilter.value) params.species = speciesFilter.value
    if (searchKeyword.value) params.keyword = searchKeyword.value

    const res = await service.get('/api/materials', { params })
    if (res.data.success) {
      tableData.value = res.data.data.list || []
      total.value = res.data.data.total || 0
    } else {
      ElMessage.error(res.data.msg || '获取物资列表失败')
    }
  } catch (err: any) {
    ElMessage.error(err.message || '请求失败')
  } finally {
    loading.value = false
  }
}

// ========== 获取图表数据（独立接口） ==========
const fetchChartData = async () => {
  try {
    const res = await service.get('/api/materials/chart-data')
    if (res.data.success) {
      const { pieData, barData } = res.data.data
      renderCharts(pieData, barData)
    } else {
      console.error('图表数据加载失败', res.data.msg)
    }
  } catch (err) {
    console.error('图表请求失败', err)
  }
}

const renderCharts = (pieData: any[], barData: any) => {
  // 饼图
  if (pieChart) pieChart.dispose()
  pieChart = echarts.init(pieChartRef.value!)
  pieChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { top: '5%', left: 'center' },
    series: [{
      name: '紧缺物资数',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold' } },
      labelLine: { show: false },
      data: pieData || []
    }]
  })

  // 柱状图
  if (barChart) barChart.dispose()
  barChart = echarts.init(barChartRef.value!)
  barChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: barData?.categories || [], axisLabel: { rotate: 15 } },
    yAxis: { type: 'value' },
    series: [
      { name: '当前库存', type: 'bar', data: barData?.quantityData || [], color: '#5470c6' },
      { name: '最低阈值', type: 'bar', data: barData?.minStockData || [], color: '#91cc75' }
    ]
  })
}

// ========== 筛选 / 分页监听 ==========
const handleSearch = (keyword?: string) => {
  if (keyword !== undefined) searchKeyword.value = keyword.trim()
  currentPage.value = 1
  fetchTableData()
}

const handleReset = () => {
  searchKeyword.value = ''
  pointFilter.value = ''
  speciesFilter.value = ''
  currentPage.value = 1
  fetchTableData()
  ElMessage.info('已重置筛选条件')
}

const handleFilter = () => {
  currentPage.value = 1
  fetchTableData()
  ElMessage.info('筛选条件已应用')
}

watch([currentPage, pageSize, pointFilter, speciesFilter], () => {
  fetchTableData()
})

// ========== 编辑 / 补充物资 ==========
const editMaterial = (row: any) => {
  dialogType.value = 'edit'
  formData.value = { ...row, addCount: 1 }
  dialogVisible.value = true
}

const addMaterial = (row: any) => {
  dialogType.value = 'add'
  formData.value = { ...row, addCount: 1 }
  dialogVisible.value = true
}

const saveMaterial = async () => {
  await formRef.value?.validate()
  submitLoading.value = true
  try {
    if (dialogType.value === 'edit') {
      const res = await service.put(`/api/materials/${formData.value.id}`, formData.value)
      if (res.data.success) {
        ElMessage.success('编辑成功')
        dialogVisible.value = false
        fetchTableData()
        fetchChartData()
      } else {
        ElMessage.error(res.data.msg || '编辑失败')
      }
    } else {
      const res = await service.put(`/api/materials/supplement/${formData.value.id}`, {
        addCount: formData.value.addCount,
        unit: formData.value.unit
      })
      if (res.data.success) {
        ElMessage.success('补充成功')
        dialogVisible.value = false
        fetchTableData()
        fetchChartData()
      } else {
        ElMessage.error(res.data.msg || '补充失败')
      }
    }
  } catch (err: any) {
    ElMessage.error(err.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

const handleDialogClose = () => {
  formRef.value?.resetFields()
}

// ========== 生命周期 ==========
onMounted(() => {
  fetchTableData()
  fetchChartData()
  window.addEventListener('resize', () => {
    pieChart?.resize()
    barChart?.resize()
  })
})

onBeforeUnmount(() => {
  pieChart?.dispose()
  barChart?.dispose()
})
</script>

<style scoped>
.main-container {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 20px 0;
}

.warning-bar {
  margin-bottom: 16px;
}

.header {
  background-color: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header .title {
  margin: 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
  padding-left: 8px;
  border-left: 4px solid #409eff;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: nowrap;
}

/* 小屏适配：允许水平滚动 */
@media (max-width: 700px) {
  .header-actions {
    overflow-x: auto;
    padding-bottom: 4px;
  }
}

.charts-container {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.chart-item {
  flex: 1;
  min-width: 400px;
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.chart-item h3 {
  margin: 0 0 12px;
  font-size: 16px;
}

.table-container {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

:deep(.shortage-row) {
  background-color: #fef0f0 !important;
}

@media (max-width: 768px) {
  .main-container {
    padding: 12px;
  }
  .header {
    padding: 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .header .title {
    font-size: 16px;
    padding-left: 6px;
  }
  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
  .chart-item {
    min-width: 100%;
  }
  .table-container {
    padding: 16px;
  }
}
</style>