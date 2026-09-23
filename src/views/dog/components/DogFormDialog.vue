<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="550px"
    :before-close="handleClose"
  >
    <el-form 
      ref="formRef" 
      :model="dogForm" 
      label-width="120px" 
      class="dog-form"
      :rules="formRules"
    >
      <el-form-item label="小狗名字" prop="name">
        <el-input v-model="dogForm.name" placeholder="请输入小狗昵称" clearable />
      </el-form-item>
      <el-form-item label="小狗年龄" prop="age">
        <el-input v-model="dogForm.age" placeholder="例：6个月 / 1岁" clearable />
      </el-form-item>
      <el-form-item label="小狗品种" prop="breed">
        <el-input v-model="dogForm.breed" placeholder="例：中华田园犬 / 金毛" clearable />
      </el-form-item>
      <el-form-item label="健康状态" prop="healthStatus">
        <el-select v-model="dogForm.healthStatus" placeholder="请选择健康状态" clearable style="width: 100%;">
          <el-option label="健康" value="normal" />
          <el-option label="需要关注" value="attention" />
          <el-option label="紧急" value="emergency" />
          <el-option label="已离世" value="dead" />
        </el-select>
      </el-form-item>
      <el-form-item label="健康状况" prop="health">
        <el-input v-model="dogForm.health" placeholder="例：已绝育/轻微外伤/健康" clearable />
      </el-form-item>
      <el-form-item label="活动区域" prop="area">
        <el-input v-model="dogForm.area" placeholder="例：一号教学楼旁 / 食堂后门" clearable />
      </el-form-item>
      <el-form-item label="发现时间" prop="foundTime">
        <el-date-picker
          v-model="dogForm.foundTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="请选择发现时间"
          clearable
          style="width: 100%;"
        />
      </el-form-item>
      <el-form-item label="离世时间" prop="deadTime">
        <el-date-picker
          v-model="dogForm.deadTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="请选择离世时间"
          clearable
          style="width: 100%;"
        />
      </el-form-item>
      <el-form-item label="小狗照片">
        <el-upload
          class="avatar-uploader"
          :action="uploadUrl"
          :headers="{ Authorization: 'Bearer ' + (userStore.userInfo?.token || '') }"
          :show-file-list="false"
          :on-success="handleImageUploadSuccess"
          :on-error="handleImageUploadError"
          :before-upload="beforeImageUpload"
          name="image"
        >
          <img v-if="dogForm.imageUrl" :src="dogForm.imageUrl" class="avatar" />
          <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
        </el-upload>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitDogInfo">
          {{ dialogMode === 'add' ? '确认新增' : '确认修改' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessageBox, ElMessage, ElNotification } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { createDogApi, updateDogApi, DOG_UPLOAD_URL } from '../../../api/dog'
import { useUserStore } from '../../../stores/user'

export interface DogInfo {
  id: number
  name: string
  age: string
  breed: string
  health: string
  healthStatus: 'normal' | 'emergency' | 'attention' | 'dead'
  area: string
  foundTime?: string
  deadTime?: string
  imageUrl?: string
}

const emit = defineEmits<{
  (e: 'success'): void
}>()

const userStore = useUserStore()
const uploadUrl = ref(DOG_UPLOAD_URL)
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const submitLoading = ref(false)

const dogForm = ref<DogInfo>({
  id: 0,
  name: '',
  age: '',
  breed: '',
  health: '',
  healthStatus: 'normal',
  area: '',
  foundTime: '',
  deadTime: '',
  imageUrl: ''
})

const dialogTitle = computed(() => {
  return dialogMode.value === 'add' ? '新增流浪狗救助信息' : '编辑流浪狗救助信息'
})

const formRules = ref<FormRules>({
  name: [{ required: true, message: '小狗名字不能为空哦~', trigger: 'blur' }],
  age: [{ required: true, message: '请填写小狗年龄（如：6个月/1岁）', trigger: 'blur' }],
  breed: [{ required: true, message: '请输入小狗品种', trigger: 'blur' }],
  healthStatus: [{ required: true, message: '请选择健康状态', trigger: 'blur' }],
  health: [{ required: true, message: '请输入健康状况详情', trigger: 'blur' }],
  area: [{ required: true, message: '请输入经常活动区域', trigger: 'blur' }],
  foundTime: [{ required: true, message: '请选择发现时间', trigger: 'change' }],
  deadTime: [
    {
      validator: (_rule, value, callback) => {
        if (dogForm.value.healthStatus === 'dead' && !value) {
          callback(new Error('离世时间不能为空'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
})

const resetDogForm = () => {
  dogForm.value = {
    id: 0,
    name: '',
    age: '',
    breed: '',
    health: '',
    healthStatus: 'normal',
    area: '',
    foundTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
    deadTime: '',
    imageUrl: ''
  }
  formRef.value?.clearValidate()
}

const open = (mode: 'add' | 'edit', row?: DogInfo) => {
  dialogMode.value = mode
  formRef.value?.clearValidate()

  if (mode === 'edit' && row) {
    editId.value = row.id
    dogForm.value = {
      ...row,
      foundTime: row.foundTime || new Date().toISOString().slice(0, 19).replace('T', ' '),
      imageUrl: row.imageUrl || ''
    }
  } else {
    editId.value = null
    resetDogForm()
  }
  dialogVisible.value = true
}

const handleClose = async (done: () => void) => {
  try {
    await ElMessageBox.confirm('确定关闭？未保存内容将丢失', '提示', {
      center: true,
      type: 'warning',
      customClass: 'custom-message-box'
    })
    resetDogForm()
    done()
  } catch {
    ElMessage.info('已取消')
  }
}

const submitDogInfo = () => {
  formRef.value?.validate(async (valid) => {
    if (!valid) {
      ElMessage.error('请完善表单信息后再提交')
      return
    }

    if (dialogMode.value === 'edit' && !editId.value) {
      ElMessage.error('编辑失败：未获取到小狗ID，请刷新页面重试')
      return
    }

    submitLoading.value = true
    try {
      const submitData = { ...dogForm.value }
      const res = dialogMode.value === 'add'
        ? await createDogApi(submitData)
        : await updateDogApi(editId.value!, submitData)

      if (res.data.success) {
        const tip = dialogMode.value === 'add' ? '添加' : '更新'
        ElNotification.success(`成功${tip}小狗信息！`)
        dialogVisible.value = false
        resetDogForm()
        emit('success')
      } else {
        ElMessage.error(`操作失败：${res.data.msg || '后端返回未知错误'}`)
      }
    } catch (err: any) {
      console.error('提交小狗信息失败详情：', err)
      if (err.response) {
        const errMsg = err.response.data?.msg || `请求失败（状态码：${err.response.status}）`
        ElMessage.error(`操作失败：${errMsg}`)
      } else if (err.request) {
        ElMessage.error('操作失败：无法连接到后端服务器，请检查后端服务')
      } else {
        ElMessage.error(`操作失败：${err.message}`)
      }
    } finally {
      submitLoading.value = false
    }
  })
}

const handleImageUploadSuccess = (response: any) => {
  if (response.success) {
    dogForm.value.imageUrl = response.data.imageUrl
    ElMessage.success('图片上传成功！')
  } else {
    ElMessage.error('图片上传失败：' + response.msg)
  }
}

const handleImageUploadError = (error: any) => {
  ElMessage.error('图片上传失败，请重试')
  console.error('上传失败：', error)
}

const beforeImageUpload = (file: File) => {
  const isImage = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/jpg'
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传 JPG/PNG 图片！')
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB！')
  }
  return isImage && isLt5M
}

defineExpose({
  open
})
</script>

<style scoped>
.avatar-uploader :deep(.el-upload) {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: 0.2s;
}

.avatar-uploader :deep(.el-upload:hover) {
  border-color: #409eff;
}

.avatar-uploader .avatar {
  width: 178px;
  height: 178px;
  display: block;
  object-fit: cover;
}

.avatar-uploader .avatar-uploader-icon {
  width: 178px;
  height: 178px;
  font-size: 28px;
  color: #8c939d;
  line-height: 178px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-footer {
  text-align: right;
}
</style>

