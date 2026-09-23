<template>
  <div class="main" style="position: relative; min-height: 600px;">
    <div class="header">
      <div class="text">
        <h2 class="title">小猫信息管理</h2>
      </div>
      <div class="header-actions">
        <SearchFilterBar
          v-model="searchKeyword"
          placeholder="搜索小猫信息"
          clearable
          :prefix-icon="Search"
          @search="handleSearch"
          @reset="handleReset"
          :debounce-time="1000"
        >
          <el-button @click="handleReset"><el-icon><Refresh /></el-icon>重置筛选</el-button>
          <el-button type="primary" size="default" @click="dialogRef?.open('add')">
            <el-icon><Plus /></el-icon>
            添加小猫信息
          </el-button>
          
          <el-select 
            v-model="healthFilter"
            placeholder="筛选健康状态" 
            size="default" 
            style="margin-left: 16px; width: 180px;"
            @change="handleFilter"
          >
            <el-option label="全部" value="all" />
            <el-option label="健康" value="normal" />
            <el-option label="需要关注" value="attention" />
            <el-option label="紧急" value="emergency" />
            <el-option label="已离世" value="dead" />
          </el-select>
        </SearchFilterBar>
      </div>
    </div>

    <div class="table-container" style="position: relative; min-height: 400px;">
      <TableCard
        :table-data="tableData"
        :columns="columnsData"
        :loading="loading"
        :show-operate="true"
      >
        <!-- 健康状况列 -->
        <template #health="scope">
          <div class="health-status">
            <StatusTag :status="scope.row.healthStatus || 'normal'" size="small" />
            {{ scope.row.health || '暂无健康信息' }}
          </div>
        </template>

        <!-- 图片列 -->
        <template #imageUrl="scope">
          <div class="image-cell">
            <el-image
              lazy
              v-if="scope.row.imageUrl"
              :src="scope.row.imageUrl"
              fit="cover"
              style="width: 80px; height: 80px; border-radius: 4px;"
            />
            <div v-else class="default-image">
              暂无
            </div>
          </div>
        </template>

        <!-- 存活状态列 -->
        <template #isDead="scope">
          <el-tag
            :type="(scope.row.healthStatus === 'dead' || scope.row.isDead === 1) ? 'info' : 'success'"
            size="small"
          >
            {{ (scope.row.healthStatus === 'dead' || scope.row.isDead === 1) ? '已离世' : '在校存活' }}
          </el-tag>
        </template>

        <!-- 操作列 -->
        <template #operate="scope">
          <el-button
            type="primary"
            size="small"
            @click="dialogRef?.open('edit', scope.row as CatInfo)"
            class="edit-btn"
            :disabled="(scope.row as CatInfo).healthStatus === 'dead'"
          >
            {{ (scope.row as CatInfo).healthStatus === 'dead' ? '已离世' : '编辑' }}
          </el-button>
        </template>
      </TableCard>
    </div>

    <Pagination
      :total="total"
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
    />

    <!-- 小猫新增/编辑弹窗组件 -->
    <CatFormDialog ref="dialogRef" @success="getCatList" />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus' 
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { getCatsApi } from '../../api/cat'
import Pagination from '../../components/Pagination.vue'
import StatusTag from '../../components/StatusTag.vue'
import TableCard from '../../components/TableCard.vue'
import SearchFilterBar from '../../components/SearchFilterBar.vue'
import CatFormDialog, { type CatInfo } from './components/CatFormDialog.vue'

// 最小加载时长函数
const minLoadingTime = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const loading = ref(false)
const searchKeyword = ref('')
const healthFilter = ref('all')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const dialogRef = ref<InstanceType<typeof CatFormDialog>>()

// 表格数据（后端分页返回的当前页数据）
const tableData = ref<CatInfo[]>([])

// 表格列配置
const columnsData = ref([
  { prop: 'imageUrl', label: '照片', width: '120' },
  { prop: 'name', label: '名字', width: '150' },
  { prop: 'age', label: '年龄', width: '100' },
  { prop: 'breed', label: '品种', width: '130' },
  { prop: 'health', label: '健康状况', minWidth: '220' }, 
  { prop: 'area', label: '经常活动区域', width: '160' },
  { prop: 'foundTime', label: '发现时间', width: '180' },
  { prop: 'isDead', label: '存活状态', width: '110' }
])

// ===================== 数据请求 =====================
const getCatList = async () => { 
  loading.value = true
  try { 
    const params: any = {
      page: currentPage.value,
      pageSize: pageSize.value,
    }
    if (searchKeyword.value.trim()) {
      params.keyword = searchKeyword.value.trim()
    }
    if (healthFilter.value !== 'all') {
      params.healthStatus = healthFilter.value
    }

    const [response] = await Promise.all([
      getCatsApi(params),
      minLoadingTime(300)
    ])

    if (response.data.success) { 
      tableData.value = (response.data.data.list || []) as any
      total.value = response.data.data.total || 0
    } else { 
      ElMessage.error('获取小猫信息失败：' + (response.data.msg || '未知错误'))
    }
  } catch (err: any) { 
    ElMessage.error('获取小猫信息失败，请检查后端是否启动')
    console.error('查询小猫列表出错：', err)
  } finally {
    loading.value = false
  }
}

// 监听分页和筛选变化，自动请求数据
watch([currentPage, pageSize, healthFilter], () => {
  getCatList()
})

// ===================== 搜索/筛选 =====================
const handleSearch = (keyWord: string) => {
  searchKeyword.value = keyWord.trim()
  currentPage.value = 1
  getCatList()
}

const handleReset = () => {
  searchKeyword.value = ''
  healthFilter.value = 'all'
  currentPage.value = 1
  getCatList()
}

const handleFilter = () => {
  currentPage.value = 1
}

// 页面挂载时自动加载数据
onMounted(() => {
  getCatList()
})
</script>

<style lang="scss" scoped>
.main {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 20px 0;
}

.header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .title {
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
    flex-wrap: wrap;
  }
}

.table-container {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  background-color: transparent;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
  margin-bottom: 16px;
  position: relative;
  min-height: 400px;
}

.pagination {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  text-align: right;
}

.health-status {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.edit-btn {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 13px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
  }
  
  &:disabled {
    background-color: #ccc;
    border-color: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
}

@media (max-width: 768px) {
  .main {
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
    border-left-width: 3px;
  }
  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
  .table-container {
    padding: 16px;
  }
  .pagination {
    padding: 12px 16px;
    text-align: left;
  }
  .el-input {
    width: 100% !important;
  }
}

@media (max-width: 480px) {
  .main {
    padding: 8px;
  }
  .header {
    padding: 12px;
  }
  .header .title {
    font-size: 14px;
  }
  .table-container {
    padding: 12px;
  }
  .pagination {
    padding: 8px 12px;
  }
}

.image-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.default-image {
  width: 80px;
  height: 80px;
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #999;
}
</style>