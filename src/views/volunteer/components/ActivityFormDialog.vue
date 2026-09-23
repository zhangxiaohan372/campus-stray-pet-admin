<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="600px"
    :before-close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="activityForm"
      label-width="100px"
      :rules="formRules"
    >
      <el-form-item label="活动标题" prop="title">
        <el-input v-model="activityForm.title" placeholder="请输入活动标题" />
      </el-form-item>
      <el-form-item label="活动内容" prop="description">
        <el-input
          v-model="activityForm.description"
          type="textarea"
          :rows="5"
          placeholder="请输入活动详情与内容"
        />
      </el-form-item>
      <el-form-item label="活动时间" prop="time">
        <el-date-picker
          v-model="activityForm.time"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="请选择活动时间"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="志愿时长" prop="volunteerHours">
        <el-input-number
          v-model="activityForm.volunteerHours"
          :min="1"
          :max="24"
        />
      </el-form-item>
      <el-form-item label="活动状态" prop="status" v-if="dialogMode === 'edit'">
        <el-select v-model="activityForm.status" style="width: 100%;">
          <el-option label="未开始" value="pending" />
          <el-option label="进行中" value="active" />
          <el-option label="已结束" value="completed" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="submitActivity"
        >
          {{ dialogMode === 'add' ? '发布活动' : '更新活动' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessageBox, ElMessage, ElNotification } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { createActivityApi, updateActivityApi } from '../../../api/activity'

export interface ActivityItem {
  id: number
  title: string
  description: string
  content?: string
  time: string
  activityTime?: string
  volunteerHours?: number
  duration?: number
  status: 'pending' | 'active' | 'completed'
  author?: string
}

const emit = defineEmits<{
  (e: 'success'): void
}>()

const dialogMode = ref<'add' | 'edit'>('add')
const editId = ref<number | null>(null)
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const submitLoading = ref(false)

const dialogTitle = computed(() => dialogMode.value === 'add' ? '发布志愿活动' : '编辑志愿活动')

const activityForm = ref<ActivityItem>({
  id: 0,
  title: '',
  description: '',
  time: new Date().toISOString().slice(0, 19).replace('T', ' '),
  volunteerHours: 1,
  status: 'pending',
  author: '管理员'
})

const formRules: FormRules = {
  title: [{ required: true, message: '活动标题不能为空', trigger: 'blur' }],
  description: [{ required: true, message: '活动内容不能为空', trigger: 'blur' }],
  time: [{ required: true, message: '活动时间不能为空', trigger: 'change' }],
  volunteerHours: [{ required: true, type: 'number', min: 1, message: '志愿时长必须大于0', trigger: 'blur' }],
  status: [{ required: true, message: '活动状态不能为空', trigger: 'blur' }]
}

const resetForm = () => {
  activityForm.value = {
    id: 0,
    title: '',
    description: '',
    time: new Date().toISOString().slice(0, 19).replace('T', ' '),
    volunteerHours: 1,
    status: 'pending',
    author: '管理员'
  }
  formRef.value?.clearValidate()
}

const open = (mode: 'add' | 'edit', row?: ActivityItem) => {
  dialogMode.value = mode
  formRef.value?.clearValidate()
  if (mode === 'edit' && row) {
    editId.value = row.id
    activityForm.value = {
      id: row.id,
      title: row.title,
      description: row.description || row.content || '',
      time: row.time || row.activityTime || '',
      volunteerHours: row.volunteerHours || row.duration || 1,
      status: row.status,
      author: row.author
    }
  } else {
    editId.value = null
    resetForm()
  }
  dialogVisible.value = true
}

const handleClose = async (done: () => void) => {
  try {
    await ElMessageBox.confirm('确定关闭？未保存内容将丢失', '提示', {
      center: true,
      type: 'warning'
    })
    resetForm()
    done()
  } catch {
    ElMessage.info('已取消')
  }
}

const submitActivity = () => {
  formRef.value?.validate(async (valid) => {
    if (!valid) {
      ElMessage.error('请完善表单信息后再提交')
      return
    }
    submitLoading.value = true
    try {
      if (dialogMode.value === 'add') {
        await createActivityApi({
          title: activityForm.value.title,
          content: activityForm.value.description,
          activityTime: activityForm.value.time,
          volunteerHours: activityForm.value.volunteerHours || 1
        })
      } else {
        await updateActivityApi(editId.value!, {
          title: activityForm.value.title,
          content: activityForm.value.description,
          activityTime: activityForm.value.time,
          volunteerHours: activityForm.value.volunteerHours || 1,
          status: activityForm.value.status
        })
      }
      ElNotification.success(`${dialogMode.value === 'add' ? '发布' : '更新'}成功！`)
      dialogVisible.value = false
      resetForm()
      emit('success')
    } catch (err) {
      ElMessage.error('操作失败，请重试')
    } finally {
      submitLoading.value = false
    }
  })
}

defineExpose({
  open
})
</script>

<style scoped>
.dialog-footer {
  text-align: right;
}
</style>

