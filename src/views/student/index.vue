<template>
  <div class="main student-page">
    <!-- 页面头部 -->
    <div class="header">
      <h2 class="title">已注册用户信息管理</h2>
      <div class="header-actions">
        <SearchFilterBar
          v-model="searchKeyword"
          placeholder="请输入姓名/学号/手机号进行搜索"
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
          v-model="roleFilter"
          placeholder="角色筛选"
          clearable
          @change="handleFilter"
          style="margin-left: 16px; width: 180px;"
        >
          <el-option label="管理员" value="admin" />
          <el-option label="志愿者" value="volunteer" />
        </el-select>
        
        <el-button
          type="primary"
          @click="userDialogRef?.open('add')"
          class="add-user-btn"
          style="margin-left: 16px;"
        >
          新增用户
        </el-button>

        <el-button
          type="warning"
          plain
          @click="roleDialogRef?.open()"
          style="margin-left: 12px;"
        >
          <el-icon style="margin-right: 4px;"><Key /></el-icon>
          角色权限配置
        </el-button>
      </div>
    </div>

    <!-- 表格区域 -->
    <div class="table-container">
      <TableCard
        :table-data="tableData"
        :columns="userColumns"
        :loading="loading"
      >
        <template #role="scope">
          <el-tag
            :type="scope.row.role === 'admin' ? 'primary' : 'success'"
            size="small"
          >
            {{ scope.row.role === 'admin' ? '管理员' : '志愿者' }}
          </el-tag>
        </template>
        <template #operate="scope">
          <el-button
            type="primary"
            size="small"
            @click="userDialogRef?.open('edit', scope.row as UserInfo)"
            class="edit-btn"
          >
            编辑
          </el-button>
        </template>
      </TableCard>
    </div>

    <!-- 分页组件 -->
    <Pagination
      :total="total"
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
    />

    <!-- 排行榜组件 -->
    <StudentRankCard
      :volunteer-rank-data="volunteerRankData"
      :activity-rank-data="activityRankData"
    />

    <!-- 新增/编辑用户弹窗 -->
    <UserFormDialog ref="userDialogRef" @success="handleUserSaved" />

    <!-- 角色权限配置弹窗 (RBAC) -->
    <RolePermissionDialog ref="roleDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Key } from '@element-plus/icons-vue'
import { getUsersApi, getVolunteerRankingApi } from '../../api/user'
import { getActivityRankingApi } from '../../api/activity'
import Pagination from '../../components/Pagination.vue'
import TableCard from '../../components/TableCard.vue'
import SearchFilterBar from '../../components/SearchFilterBar.vue'
import StudentRankCard, { type VolunteerRankItem, type ActivityRankItem } from './components/StudentRankCard.vue'
import UserFormDialog, { type UserInfo } from './components/UserFormDialog.vue'
import RolePermissionDialog from './components/RolePermissionDialog.vue'

// 核心变量
const searchKeyword = ref('')
const roleFilter = ref('')
const loading = ref(false)
const tableData = ref<UserInfo[]>([])
const total = ref(0)

// 子组件引用
const userDialogRef = ref<InstanceType<typeof UserFormDialog>>()
const roleDialogRef = ref<InstanceType<typeof RolePermissionDialog>>()

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

// 排行榜数据（直接从后端获取）
const volunteerRankData = ref<VolunteerRankItem[]>([])
const activityRankData = ref<ActivityRankItem[]>([])

// 表格列配置
const userColumns = ref([
  { prop: 'studentId', label: '学号', width: '120' },
  { prop: 'name', label: '姓名', width: '100' },
  { prop: 'phone', label: '手机号', width: '150' },
  { prop: 'email', label: '邮箱', minWidth: '200' },
  { prop: 'role', label: '角色', width: '100' },
  { prop: 'major', label: '专业', width: '150' },
  { prop: 'registerTime', label: '注册时间', width: '180' }
])

// 获取表格数据（后端分页）
const getTableData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      pageSize: pageSize.value
    }
    if (searchKeyword.value.trim()) {
      params.keyword = searchKeyword.value.trim()
    }
    if (roleFilter.value) {
      params.role = roleFilter.value
    }

    const res = await getUsersApi(params)

    if (res.data.success) {
      const data = res.data.data
      tableData.value = (data.list || []).map((item: any) => ({
        ...item,
        id: item.id ?? item.studentId ?? 0,
        registerTime: item.registerTime || '暂无注册时间'
      }))
      total.value = data.total || 0
    } else {
      ElMessage.error('获取用户列表失败：' + (res.data.msg || '未知错误'))
    }
  } catch (err) {
    ElMessage.error('获取用户信息失败，请检查接口连接')
    console.error('请求错误：', err)
  } finally {
    loading.value = false
  }
}

// 获取志愿时长排行榜（后端已排序）
const fetchVolunteerRanking = async () => {
  try {
    const res = await getVolunteerRankingApi()
    if (res.data.success) {
      volunteerRankData.value = res.data.data
    } else {
      console.warn('获取志愿时长排行榜失败', res.data.msg)
    }
  } catch (err) {
    console.error('志愿时长排行榜请求失败', err)
  }
}

// 获取活跃度排行榜（后端已排序）
const fetchActivityRanking = async () => {
  try {
    const res = await getActivityRankingApi()
    if (res.data.success) {
      activityRankData.value = res.data.data
    } else {
      console.warn('获取活跃度排行榜失败', res.data.msg)
    }
  } catch (err) {
    console.error('活跃度排行榜请求失败', err)
  }
}

// 搜索/重置/筛选
const handleSearch = (keyword?: string) => {
  if (keyword !== undefined) searchKeyword.value = keyword.trim()
  currentPage.value = 1
  getTableData()
}

const handleReset = () => {
  searchKeyword.value = ''
  roleFilter.value = ''
  currentPage.value = 1
  getTableData()
  ElMessage.info('已重置搜索/筛选条件')
}

const handleFilter = () => {
  currentPage.value = 1
  getTableData()
  ElMessage.info('筛选条件已应用')
}

// 用户保存成功后的回调
const handleUserSaved = async () => {
  await getTableData()
  await fetchVolunteerRanking()
  await fetchActivityRanking()
}

// 监听分页和筛选条件变化
watch([currentPage, pageSize, roleFilter], () => {
  getTableData()
})

onMounted(() => {
  getTableData()
  fetchVolunteerRanking()
  fetchActivityRanking()
})
</script>

<style scoped>
.student-page {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 20px 0;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
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
  gap: 16px;
  flex-wrap: wrap;
}
.add-user-btn {
  margin-left: 10px;
}
.table-container {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
  position: relative;
  min-height: 400px;
}
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>