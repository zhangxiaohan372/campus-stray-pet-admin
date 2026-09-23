<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="550px"
    :before-close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="userForm"
      label-width="120px"
      class="user-form"
      :rules="formRules"
    >
      <el-form-item label="学号" prop="studentId">
        <el-input
          v-model="userForm.studentId"
          placeholder="请输入学号"
          clearable
          :disabled="dialogMode === 'edit'"
        />
      </el-form-item>
      <el-form-item label="姓名" prop="name">
        <el-input v-model="userForm.name" placeholder="请输入姓名" clearable />
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="userForm.phone" placeholder="请输入手机号" clearable />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="userForm.email" placeholder="请输入邮箱" clearable />
      </el-form-item>
      <el-form-item label="角色" prop="role">
        <el-select v-model="userForm.role" placeholder="请选择角色" clearable style="width: 100%;">
          <el-option label="管理员" value="admin" />
          <el-option label="志愿者" value="volunteer" />
        </el-select>
      </el-form-item>
      <el-form-item label="注册时间" prop="registerTime">
        <el-date-picker
          v-model="userForm.registerTime"
          type="datetime"
          placeholder="选择注册时间"
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DD HH:mm:ss"
          clearable
          style="width: 100%;"
        />
      </el-form-item>
      <el-form-item label="专业" prop="major">
        <el-input
          v-model="userForm.major"
          placeholder="请输入专业"
          clearable
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="submitUserInfo"
          :loading="submitLoading"
        >
          {{ dialogMode === 'add' ? '确认新增' : '确认修改' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessageBox, ElMessage, ElNotification } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { createUserApi, updateUserApi } from '../../../api/user'

export interface UserInfo {
  id: number
  studentId: string
  name: string
  phone: string
  email: string
  role: 'admin' | 'volunteer'
  registerTime: string
  major: string
  volunteerTime?: number
  loginCount?: number
  lastLoginTime?: string
  volunteerActivityCount?: number
  createTime?: string
  updateTime?: string
  activeScore?: number
}

const emit = defineEmits<{
  (e: 'success'): void
}>()

const dialogMode = ref<'add' | 'edit'>('add')
const editStudentId = ref('')
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const submitLoading = ref(false)

const userForm = ref<UserInfo>({
  id: 0,
  studentId: '',
  name: '',
  phone: '',
  email: '',
  role: 'volunteer',
  registerTime: '',
  major: ''
})

const dialogTitle = computed(() => {
  return dialogMode.value === 'add' ? '新增用户信息' : '编辑用户信息'
})

const formRules = ref<FormRules>({
  studentId: [{ required: true, message: '学号不能为空！', trigger: 'blur' }],
  name: [{ required: true, message: '姓名不能为空！', trigger: 'blur' }],
  phone: [
    { required: true, message: '手机号不能为空！', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式错误！', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '邮箱不能为空！', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
      message: '邮箱格式错误！',
      trigger: 'blur'
    }
  ],
  role: [{ required: true, message: '请选择角色！', trigger: 'change' }],
  registerTime: [{ required: true, message: '请选择注册时间！', trigger: 'change' }],
  major: [{ required: true, message: '请输入专业！', trigger: 'blur' }]
})

const resetUserForm = () => {
  userForm.value = {
    id: 0,
    studentId: '',
    name: '',
    phone: '',
    email: '',
    role: 'volunteer',
    registerTime: '',
    major: ''
  }
  formRef.value?.clearValidate()
}

const open = (mode: 'add' | 'edit', row?: UserInfo) => {
  dialogMode.value = mode
  formRef.value?.clearValidate()

  if (mode === 'edit' && row) {
    editStudentId.value = row.studentId
    userForm.value = { ...row }
  } else {
    editStudentId.value = ''
    resetUserForm()
  }
  dialogVisible.value = true
}

const handleClose = async (done: () => void) => {
  try {
    await ElMessageBox.confirm('确定关闭？未保存内容将丢失', '提示', {
      center: true,
      type: 'warning'
    })
    resetUserForm()
    done()
  } catch {
    ElMessage.info('已取消')
  }
}

const submitUserInfo = async () => {
  if (!formRef.value) return
  submitLoading.value = true
  try {
    await formRef.value.validate()

    if (dialogMode.value === 'add') {
      const res = await createUserApi(userForm.value)
      if (res.data.success) {
        ElNotification.success('新增用户成功！')
        dialogVisible.value = false
        resetUserForm()
        emit('success')
      } else {
        ElMessage.error(res.data.msg || '新增用户失败')
      }
    } else if (dialogMode.value === 'edit') {
      const res = await updateUserApi(editStudentId.value, userForm.value)
      if (res.data.success) {
        ElNotification.success('编辑用户成功！')
        dialogVisible.value = false
        resetUserForm()
        emit('success')
      } else {
        ElMessage.error(res.data.msg || '编辑用户失败')
      }
    }
  } catch (error) {
    console.error('提交失败：', error)
    ElMessage.error('操作失败，请完善表单或检查网络')
  } finally {
    submitLoading.value = false
  }
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
