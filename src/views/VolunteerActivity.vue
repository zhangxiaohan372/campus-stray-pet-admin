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
            <el-button type="primary" size="default" @click="openDialog('add')">
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
              <el-button type="primary" size="small" @click="viewParticipants(activity)">查看报名</el-button>
              <el-button type="success" size="small" @click="openDialog('edit', activity)" v-if="activity.status !== 'completed'">编辑</el-button>
              <el-button type="danger" size="small" @click="deleteActivity(activity.id)">删除</el-button>
            </div>
          </div>
        </el-card>
        <div v-if="activities.length === 0" class="empty-state"><el-empty description="暂无活动" /></div>
      </div>

      <div class="pagination-container">
        <Pagination :total="totalActivities" v-model:page-size="pageSize" v-model:current-page="currentPage" />
      </div>
    </el-card>

    <!-- 发布/编辑活动弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600" :before-close="handleClose">
      <el-form ref="formRef" :model="activityForm" label-width="100px" :rules="formRules">
        <el-form-item label="活动标题" prop="title"><el-input v-model="activityForm.title" /></el-form-item>
        <el-form-item label="活动内容" prop="description"><el-input v-model="activityForm.description" type="textarea" :rows="5" /></el-form-item>
        <el-form-item label="活动时间" prop="time"><el-date-picker v-model="activityForm.time" type="datetime" style="width:100%" /></el-form-item>
        <el-form-item label="志愿时长" prop="volunteerHours"><el-input-number v-model="activityForm.volunteerHours" :min="1" :max="24" /></el-form-item>
        <el-form-item label="活动状态" prop="status" v-if="dialogMode === 'edit'">
          <el-select v-model="activityForm.status">
            <el-option label="未开始" value="pending" />
            <el-option label="进行中" value="active" />
            <el-option label="已结束" value="completed" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitActivity">{{ dialogMode === 'add' ? '发布活动' : '更新活动' }}</el-button>
      </template>
    </el-dialog>

    <!-- 查看报名学生弹窗（无审核） -->
    <el-dialog v-model="participantsVisible" :title="`${currentActivity.title || ''} - 报名学生`" width="800" :before-close="handleParticipantsClose">
      <el-table :data="participants" style="width:100%">
        <el-table-column prop="studentId" label="学生ID" width="120" />
        <el-table-column prop="name" label="学生姓名" width="120" />
        <el-table-column label="专业" width="150"><template #default="scope">{{ scope.row.major || '暂无专业信息' }}</template></el-table-column>
        <el-table-column prop="phone" label="联系方式" width="150" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessageBox, ElMessage, ElNotification } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import service from '../components/request.ts'
import Pagination from '../components/Pagination.vue'
import BaseLoading from '../components/BaseLoading.vue'

interface Activity {
  id: number
  title: string
  description: string
  content?: string
  time: string
  activityTime?: string
  volunteerHours?: number
  duration?: number
  status: 'pending' | 'active' | 'completed'
  author: string
}
interface Participant {
  id: number
  studentId: string
  name: string
  major: string
  phone: string
}

const loading = ref(false)
const activities = ref<Activity[]>([])
const participants = ref<Participant[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const totalActivities = ref(0)
const dialogMode = ref<'add' | 'edit'>('add')
const editId = ref<number | null>(null)
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const participantsVisible = ref(false)
const currentActivity = ref<Activity>({ id:0, title:'', description:'', time:'', volunteerHours:1, status:'pending', author:'' })

const dialogTitle = computed(() => dialogMode.value === 'add' ? '发布志愿活动' : '编辑志愿活动')
const activityForm = ref<Activity>({
  id:0, title:'', description:'', time: new Date().toISOString().slice(0,19).replace('T',' '),
  volunteerHours:1, status:'pending', author:'管理员'
})
const formRules: FormRules = {
  title: [{ required: true, message: '活动标题不能为空', trigger: 'blur' }],
  description: [{ required: true, message: '活动内容不能为空', trigger: 'blur' }],
  time: [{ required: true, message: '活动时间不能为空', trigger: 'change' }],
  volunteerHours: [{ required: true, type: 'number', min: 1, message: '志愿时长必须大于0', trigger: 'blur' }],
  status: [{ required: true, message: '活动状态不能为空', trigger: 'blur' }]
}
const paginatedActivities = computed(() => activities.value.slice((currentPage.value-1)*pageSize.value, currentPage.value*pageSize.value))
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

const statusText = (status: Activity['status'] | string) => {
  if (status === 'active') return '进行中'
  if (status === 'completed') return '已结束'
  return '未开始'
}

const statusTagType = (status: Activity['status'] | string): '' | 'success' | 'info' | 'warning' | 'danger' => {
  if (status === 'active') return 'success'
  if (status === 'completed') return 'info'
  return 'warning'
}

const openDialog = (mode: 'add'|'edit', row?: Activity) => {
  dialogMode.value = mode
  formRef.value?.clearValidate()
  if (mode === 'edit' && row) {
    editId.value = row.id
    activityForm.value = {
      id: row.id, title: row.title, description: row.description || row.content || '',
      time: row.time || row.activityTime || '',
      volunteerHours: row.volunteerHours || row.duration || 1,
      status: row.status, author: row.author
    }
  } else {
    editId.value = null
    resetForm()
  }
  dialogVisible.value = true
}
const resetForm = () => {
  activityForm.value = {
    id:0, title:'', description:'', time: new Date().toISOString().slice(0,19).replace('T',' '),
    volunteerHours:1, status:'pending', author:'管理员'
  }
  formRef.value?.clearValidate()
}
const handleClose = async (done: () => void) => {
  try { await ElMessageBox.confirm('确定关闭？未保存内容将丢失','提示',{center:true,type:'warning'}); resetForm(); done() }
  catch { ElMessage.info('已取消'); done() }
}
const handleParticipantsClose = () => { participantsVisible.value = false; participants.value = [] }

const fetchActivities = async () => {
  loading.value = true
  try {
    const res = await service.get('/api/activity', { params: { page: currentPage.value, pageSize: pageSize.value } })
    activities.value = res.data.data?.list || []
    totalActivities.value = res.data.data?.total || 0
  } catch (e) { ElMessage.error('获取活动失败') }
  finally { loading.value = false }
}
const fetchParticipants = async (id: number) => {
  try {
    const res = await service.get(`/api/activity/${id}/participants`)
    participants.value = res.data.data || []
  } catch (e) { ElMessage.error('获取参与者失败') }
}
const submitActivity = () => {
  formRef.value?.validate(async (valid) => {
    if (!valid) { ElMessage.error('请完善表单'); return }
    loading.value = true
    try {
      if (dialogMode.value === 'add') {
        await service.post('/api/activity', {
          title: activityForm.value.title,
          content: activityForm.value.description,
          activityTime: activityForm.value.time,
          volunteerHours: activityForm.value.volunteerHours
        })
      } else {
        await service.put(`/api/activity/${editId.value}`, {
          title: activityForm.value.title,
          content: activityForm.value.description,
          activityTime: activityForm.value.time,
          volunteerHours: activityForm.value.volunteerHours,
          status: activityForm.value.status
        })
      }
      ElNotification.success(`${dialogMode.value === 'add' ? '发布' : '更新'}成功`)
      dialogVisible.value = false
      resetForm()
      fetchActivities()
    } catch (err) { ElMessage.error('操作失败') }
    finally { loading.value = false }
  })
}
const deleteActivity = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除？','提示',{type:'warning'})
    await service.delete(`/api/activity/${id}`)
    ElMessage.success('删除成功')
    fetchActivities()
  } catch (error) { if (error !== 'cancel') ElMessage.info('已取消') }
}
const viewParticipants = (activity: Activity) => {
  currentActivity.value = { ...activity }
  fetchParticipants(activity.id)
  participantsVisible.value = true
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
  background-color: #f5f7fa;
}

.page-card {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #e9edf3;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.header-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title {
  margin: 0;
  color: #1f2d3d;
  font-size: 20px;
  font-weight: 700;
  padding-left: 10px;
  border-left: 4px solid #409eff;
}

.sub-title {
  margin: 0;
  font-size: 13px;
  color: #8a94a6;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.overview-item {
  padding: 14px 16px;
  border-radius: 10px;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f6fc 100%);
  border: 1px solid #e8edf5;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.overview-label {
  font-size: 13px;
  color: #7b8794;
}

.overview-value {
  font-size: 22px;
  font-weight: 700;
  color: #1f2d3d;
}

.overview-value.pending { color: #e6a23c; }
.overview-value.active { color: #67c23a; }
.overview-value.completed { color: #409eff; }

.header-actions {
  display: flex;
  align-items: center;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.activity-card {
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px solid #e9edf3;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.activity-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(31, 45, 61, 0.08);
}

.activity-card :deep(.el-card__body) {
  padding: 18px;
}

.activity-card {
  
  .activity-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }
  
  .activity-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0;
    flex: 1;
    margin-right: 16px;
  }
  
  .activity-time {
    font-size: 12px;
    color: #8a94a6;
    white-space: nowrap;
    background: #f5f7fb;
    border: 1px solid #e8edf5;
    padding: 4px 8px;
    border-radius: 999px;
  }
  
  .activity-content {
    margin-bottom: 12px;
  }
  
  .activity-description {
    font-size: 14px;
    color: #4f5d6b;
    line-height: 1.5;
    margin: 0 0 12px 0;
  }
  
  .activity-info {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 14px;
    color: #666;
  }
  
  .activity-location,
  .activity-duration {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .activity-status {
    font-weight: 600;
  }
  
  .activity-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid #e9ecef;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
  
  .activity-author {
    font-size: 12px;
    color: #7b8794;
  }
  
  .activity-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.participants-list {
  max-height: 500px;
  overflow-y: auto;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .volunteer-activity-page {
    padding: 12px;
  }

  .overview-grid {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }
  
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .title {
    font-size: 16px;
    padding-left: 6px;
    border-left-width: 3px;
  }
  
  .activity-card {
    .activity-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
    
    .activity-time {
      align-self: flex-end;
    }
    
    .activity-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
    
    .activity-footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
    
    .activity-actions {
      align-self: flex-end;
    }
  }
}
</style>