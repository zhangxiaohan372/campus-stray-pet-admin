<template>
  <el-dialog
    v-model="participantsVisible"
    :title="`${currentActivity.title || ''} - 报名学生`"
    width="800px"
    :before-close="handleClose"
  >
    <el-table :data="participants" style="width: 100%" v-loading="loading">
      <el-table-column prop="studentId" label="学生ID" width="140" />
      <el-table-column prop="name" label="学生姓名" width="140" />
      <el-table-column label="专业" width="200">
        <template #default="scope">
          {{ scope.row.major || '暂无专业信息' }}
        </template>
      </el-table-column>
      <el-table-column prop="phone" label="联系方式" min-width="150" />
    </el-table>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getActivityParticipantsApi } from '../../../api/activity'
import type { ActivityItem } from './ActivityFormDialog.vue'

interface Participant {
  id?: number
  studentId: string
  name: string
  major: string
  phone: string
}

const participantsVisible = ref(false)
const loading = ref(false)
const currentActivity = ref<Partial<ActivityItem>>({})
const participants = ref<Participant[]>([])

const open = async (activity: ActivityItem) => {
  currentActivity.value = activity
  participantsVisible.value = true
  loading.value = true
  try {
    const res = await getActivityParticipantsApi(activity.id)
    participants.value = (res.data.data || []) as any
  } catch (e) {
    ElMessage.error('获取参与者失败')
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  participantsVisible.value = false
  participants.value = []
}

defineExpose({
  open
})
</script>

