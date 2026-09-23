<template>
  <div class="volunteer-activity-page">
    <el-card class="page-card" shadow="hover">
      <BaseLoading :loading="loading" />
      <template #header>
        <div class="header">
          <div class="header-main">
            <h2 class="title">志愿活动管理</h2>
            <p class="sub-title">统一查看活动进度、报名情况和志愿时长统计</p>
          </div>
          <div class="header-actions">
            <el-button type="primary" size="default" @click="formDialogRef?.open('add')">
              <el-icon><Plus /></el-icon>
              发布志愿活动
            </el-button>
          </div>
        </div>
      </template>

      <div class="overview-grid">
        <div class="overview-item">
          <span class="overview-label">活动总数</span>
          <span class="overview-value">{{ totalActivities }}</span>
        </div>
        <div class="overview-item">
          <span class="overview-label">未开始</span>
          <span class="overview-value pending">{{ statusCount.pending }}</span>
        </div>
        <div class="overview-item">
          <span class="overview-label">进行中</span>
          <span class="overview-value active">{{ statusCount.active }}</span>
        </div>
        <div class="overview-item">
          <span class="overview-label">已结束</span>
          <span class="overview-value completed">{{ statusCount.completed }}</span>
        </div>
      </div>

      <div class="activity-list">
        <el-card v-for="activity in paginatedActivities" :key="activity.id" class="activity-card" shadow="hover">
          <div class="activity-header">
            <h3 class="activity-title">{{ activity.title }}</h3>
            <span class="activity-time">{{ activity.time || activity.activityTime || '未设置' }}</span>
          </div>
          <div class="activity-content">
            <p class="activity-description">{{ activity.description || activity.content || '无描述' }}</p>
            <div class="activity-info">
              <span class="activity-duration">时长：{{ activity.volunteerHours || activity.duration || 0 }}小时</span>
              <el-tag class="activity-status" :type="statusTagType(activity.status || 'pending')" effect="light" round>
                {{ statusText(activity.status || 'pending') }}
              </el-tag>
            </div>
          </div>
          <div class="activity-footer">
            <span class="activity-author">发布人：{{ activity.author || '管理员' }}</span>
            <div class="activity-actions">
              <el-button type="primary" size="small" @click="participantsDialogRef?.open(activity)">查看报名</el-button>
              <el-button type="success" size="small" @click="formDialogRef?.open('edit', activity)" v-if="activity.status !== 'completed'">编辑</el-button>
              <el-button type="danger" size="small" @click="deleteActivity(activity.id)">删除</el-button>
            </div>
          </div>
        </el-card>
        <div v-if="activities.length === 0" class="empty-state">
          <el-empty description="暂无活动" />
        </div>
      </div>

      <div class="pagination-container">
        <Pagination
          :total="totalActivities"
          v-model:page-size="pageSize"
          v-model:current-page="currentPage"
        />
      </div>
    </el-card>

    <!-- 活动新增/编辑弹窗 -->
    <ActivityFormDialog ref="formDialogRef" @success="fetchActivities" />

    <!-- 报名学生弹窗 -->
    <ParticipantsDialog ref="participantsDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getActivityApi, deleteActivityApi } from '../../api/activity'
import Pagination from '../../components/Pagination.vue'
import BaseLoading from '../../components/BaseLoading.vue'
import ActivityFormDialog, { type ActivityItem } from './components/ActivityFormDialog.vue'
import ParticipantsDialog from './components/ParticipantsDialog.vue'

const loading = ref(false)
const activities = ref<ActivityItem[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const totalActivities = ref(0)

const formDialogRef = ref<InstanceType<typeof ActivityFormDialog>>()
const participantsDialogRef = ref<InstanceType<typeof ParticipantsDialog>>()

const paginatedActivities = computed(() => {
  return activities.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value)
})

const statusCount = computed(() => {
  const count = { pending: 0, active: 0, completed: 0 }
  activities.value.forEach((item) => {
    const status = item.status || 'pending'
    if (status === 'pending' || status === 'active' || status === 'completed') {
      count[status] += 1
    }
  })
  return count
})

const statusText = (status: ActivityItem['status'] | string) => {
  if (status === 'active') return '进行中'
  if (status === 'completed') return '已结束'
  return '未开始'
}

const statusTagType = (status: ActivityItem['status'] | string): '' | 'success' | 'info' | 'warning' | 'danger' => {
  if (status === 'active') return 'success'
  if (status === 'completed') return 'info'
  return 'warning'
}

const fetchActivities = async () => {
  loading.value = true
  try {
    const res = await getActivityApi({ page: currentPage.value, pageSize: pageSize.value })
    activities.value = (res.data.data?.list || []) as any
    totalActivities.value = res.data.data?.total || 0
  } catch (e) {
    ElMessage.error('获取活动列表失败')
  } finally {
    loading.value = false
  }
}

const deleteActivity = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除该志愿活动？', '提示', { type: 'warning' })
    await deleteActivityApi(id)
    ElMessage.success('删除成功')
    fetchActivities()
  } catch (error) {
    if (error !== 'cancel') ElMessage.info('已取消')
  }
}

onMounted(() => fetchActivities())
watch([currentPage, pageSize], () => fetchActivities())
</script>

<style scoped>
.volunteer-activity-page {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 16px;
  min-height: calc(100vh - 80px);
}
.page-card {
  border-radius: 12px;
  border: 1px solid #ebeef5;
  background-color: #fff;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}
.header-main .title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}
.header-main .sub-title {
  font-size: 14px;
  color: #909399;
  margin: 0;
}
.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.overview-item {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.overview-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}
.overview-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}
.overview-value.pending { color: #e6a23c; }
.overview-value.active { color: #67c23a; }
.overview-value.completed { color: #909399; }

.activity-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.activity-card {
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
}
.activity-card:hover {
  transform: translateY(-2px);
}
.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}
.activity-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  flex: 1;
}
.activity-time {
  font-size: 12px;
  color: #909399;
}
.activity-description {
  font-size: 14px;
  color: #606266;
  margin: 0 0 16px 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.activity-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.activity-duration {
  font-size: 13px;
  color: #606266;
}
.activity-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}
.activity-author {
  font-size: 13px;
  color: #909399;
}
.activity-actions {
  display: flex;
  gap: 8px;
}
.empty-state {
  grid-column: 1 / -1;
  padding: 40px 0;
}
.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
@media (max-width: 768px) {
  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .activity-list {
    grid-template-columns: 1fr;
  }
}
</style>