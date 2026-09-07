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
          @click="openDialog('add')"
          class="add-user-btn"
          style="margin-left: 16px;"
        >
          新增用户
        </el-button>

        <el-button
          type="warning"
          plain
          @click="openRolePermissionDialog"
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
            @click="openDialog('edit', scope.row as UserInfo)"
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

    <!-- 排行榜卡片 -->
    <div class="rank-card">
      <!-- 志愿时长排行榜 -->
      <div class="rank-item volunteer-rank">
        <h3 class="rank-title">志愿时长排行榜</h3>
        <el-scrollbar height="400px" class="rank-scrollbar">
          <div
            v-for="(item, index) in volunteerRankData"
            :key="item.studentId"
            class="rank-item-card"
            :class="{
              top1: index === 0,
              top2: index === 1,
              top3: index === 2,
              'normal-rank': index >= 3
            }"
          >
            <div class="rank-num">{{ index + 1 }}</div>
            <div class="rank-user-info">
              <div class="user-name">{{ item.name }}</div>
              <div class="user-desc">{{ item.volunteerTime }} 小时</div>
            </div>
            <div class="rank-extra" v-if="index > 0">
              距上一名 {{ getRankGap(volunteerRankData, index, 'volunteerTime') }} 小时
            </div>
          </div>
        </el-scrollbar>
      </div>
      <!-- 活跃度排行榜 -->
      <div class="rank-item activity-rank">
        <h3 class="rank-title">活跃度排行榜</h3>
        <el-scrollbar height="400px" class="rank-scrollbar">
          <div
            v-for="(item, index) in activityRankData"
            :key="item.studentId"
            class="rank-item-card"
            :class="{
              top1: index === 0,
              top2: index === 1,
              top3: index === 2,
              'normal-rank': index >= 3
            }"
          >
            <div class="rank-num">{{ index + 1 }}</div>
            <div class="rank-user-info">
              <div class="user-name">{{ item.name }}</div>
              <div class="user-desc">活跃度评分 {{ item.activeScore }}</div>
            </div>
            <div class="rank-extra" v-if="index > 0">
              距上一名 {{ getRankGap(activityRankData, index, 'activeScore') }} 分
            </div>
          </div>
        </el-scrollbar>
      </div>
    </div>

    <!-- 新增/编辑用户弹窗（保持不变） -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="550px"
      :before-close="handleClose"
    >
      <!-- 表单内容不变 -->
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
          <el-select v-model="userForm.role" placeholder="请选择角色" clearable>
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

    <!-- 角色权限字符配置弹窗 (RBAC) -->
    <el-dialog
      v-model="roleDialogVisible"
      title="系统角色与权限字符配置 (RBAC)"
      width="820px"
      :before-close="() => roleDialogVisible = false"
    >
      <div v-loading="roleLoading">
        <el-alert
          title="系统权限采用模块权限字符标识（如 pet:read、material:write 等）管理。勾选或取消权限字符后点击下方保存，将直接持久化保存至数据库并实时生效。"
          type="info"
          show-icon
          :closable="false"
          style="margin-bottom: 16px;"
        />

        <el-tabs v-model="activeRoleTab" type="border-card">
          <el-tab-pane
            v-for="role in roleList"
            :key="role.id"
            :label="`${role.roleName} (${role.roleCode})`"
            :name="String(role.id)"
          >
            <div style="margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; color: #555; font-size: 13px;">
              <span><strong>角色定位：</strong>{{ role.description || '无' }}</span>
              <span>
                当前拥有权限数：
                <el-tag size="small" type="primary">{{ (selectedPermissions[role.id] || []).length }} / {{ totalPermCount }}</el-tag>
              </span>
            </div>

            <el-scrollbar max-height="420px">
              <div v-for="mod in permissionTree" :key="mod.value" class="permission-module-group">
                <div class="module-header">
                  <el-checkbox
                    :indeterminate="isModuleIndeterminate(role.id, mod)"
                    :model-value="isModuleChecked(role.id, mod)"
                    @change="(val: boolean) => handleModuleCheckAll(role.id, mod, val)"
                  >
                    <strong>{{ mod.label }}</strong>
                    <span class="module-code">({{ mod.value }})</span>
                  </el-checkbox>
                </div>
                <div class="module-perms">
                  <el-checkbox-group v-model="selectedPermissions[role.id]">
                    <div
                      v-for="perm in mod.children"
                      :key="perm.value"
                      class="perm-item"
                    >
                      <el-checkbox :label="perm.value">
                        <span class="perm-name">{{ perm.label }}</span>
                        <el-tag size="small" type="info" class="perm-code">{{ perm.value }}</el-tag>
                      </el-checkbox>
                      <span class="perm-desc" v-if="perm.description">{{ perm.description }}</span>
                    </div>
                  </el-checkbox-group>
                </div>
              </div>
            </el-scrollbar>
          </el-tab-pane>
        </el-tabs>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="roleDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="saveRolePermissions"
            :loading="saveRoleLoading"
          >
            保存当前角色权限
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch ,computed} from 'vue'
import { ElMessageBox, ElMessage, ElNotification } from 'element-plus'
import { Refresh, Key } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import SearchFilterBar from '../components/SearchFilterBar.vue'
import service from '../components/request.ts'
import Pagination from '../components/Pagination.vue'
import TableCard from '../components/TableCard.vue'
import { useUserStore } from '../stores/user'

// 定义用户信息接口
interface UserInfo {
  id: number
  studentId: string
  name: string
  phone: string
  email: string
  role: 'admin' | 'volunteer'
  registerTime: string
  major: string
  volunteerTime: number
  loginCount: number
  lastLoginTime: string
  volunteerActivityCount: number
  createTime: string
  updateTime: string
  activeScore: number
}

// 排行榜数据接口（后端返回的字段）
interface VolunteerRankItem {
  studentId: string
  name: string
  volunteerTime: number
}

interface ActivityRankItem {
  studentId: string
  name: string
  activeScore: number
}

// 核心变量
const dialogMode = ref<'add' | 'edit'>('add')
const editStudentId = ref('')
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const searchKeyword = ref('')
const roleFilter = ref('')
const loading = ref(false)
const submitLoading = ref(false)
const tableData = ref<UserInfo[]>([])
const total = ref(0)

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

// 表单绑定数据
const userForm = ref<UserInfo>({
  studentId: '',
  name: '',
  phone: '',
  email: '',
  role: 'volunteer',
  registerTime: '',
  major: '',
  volunteerTime: 0,
  activeScore: 0,
  id: 0,
  loginCount: 0,
  lastLoginTime: '',
  volunteerActivityCount: 0,
  createTime: '',
  updateTime: ''
})

// 最小加载时间（可选，用于优化体验）
const minLoadingTime = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 弹窗标题
const dialogTitle = computed(() => {
  return dialogMode.value === 'add' ? '新增用户信息' : '编辑用户信息'
})

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

    const [res] = await Promise.all([
      service.get('/api/users', { params }),
      minLoadingTime(300)
    ])

    if (res.data.success) {
      const data = res.data.data
      tableData.value = (data.list || []).map((item: UserInfo) => ({
        ...item,
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
    const res = await service.get('/api/volunteer/ranking')
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
    const res = await service.get('/api/activity/ranking')
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
  ElMessage.info(`筛选条件已应用`)
}

// 监听分页和筛选条件变化，自动请求表格数据（搜索由防抖组件触发）
watch([currentPage, pageSize, roleFilter], () => {
  getTableData()
})

// 弹窗操作
const openDialog = (mode: 'add' | 'edit', row?: UserInfo) => {
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

// 重置表单
const resetUserForm = () => {
  userForm.value = {
    studentId: '',
    name: '',
    phone: '',
    email: '',
    role: 'volunteer',
    registerTime: '',
    major: '',
    volunteerTime: 0,
    activeScore: 0,
    id: 0,
    loginCount: 0,
    lastLoginTime: '',
    volunteerActivityCount: 0,
    createTime: '',
    updateTime: ''
  }
  formRef.value?.clearValidate()
}

// 弹窗关闭确认
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
    done()
  }
}

// 提交用户信息
const submitUserInfo = async () => {
  if (!formRef.value) return
  submitLoading.value = true
  try {
    await formRef.value.validate()

    if (dialogMode.value === 'add') {
      const res = await service.post('/api/users', userForm.value)
      if (res.data.success) {
        ElNotification.success('新增用户成功！')
        dialogVisible.value = false
        resetUserForm()
        await getTableData()
        // 刷新排行榜（因为新增用户可能影响排行榜）
        await fetchVolunteerRanking()
        await fetchActivityRanking()
      } else {
        ElMessage.error(res.data.msg || '新增用户失败')
      }
    } else if (dialogMode.value === 'edit') {
      const res = await service.put(`/api/users/${editStudentId.value}`, userForm.value)
      if (res.data.success) {
        ElNotification.success('编辑用户成功！')
        dialogVisible.value = false
        resetUserForm()
        await getTableData()
        await fetchVolunteerRanking()
        await fetchActivityRanking()
      } else {
        ElMessage.error(res.data.msg || '编辑用户失败')
      }
    }
  } catch (error) {
    console.error('提交失败：', error)
    ElMessage.error('操作失败，请重试')
  } finally {
    submitLoading.value = false
  }
}

// 计算与上一名的差距（根据排行榜数据和字段名）
const getRankGap = (rankList: any[], index: number, field: string) => {
  if (index === 0) return '0'
  const currentValue = rankList[index]?.[field] ?? 0
  const prevValue = rankList[index - 1]?.[field] ?? 0
  return (prevValue - currentValue).toFixed(1)
}

// 表单校验规则
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

// ====================== 角色权限配置 (RBAC) ======================
interface PermItem {
  id: number
  label: string
  value: string
  description?: string
}

interface PermModule {
  label: string
  value: string
  children: PermItem[]
}

interface RoleItem {
  id: number
  roleCode: string
  roleName: string
  description: string
  createTime: string
  permissions: string[]
}

const userStore = useUserStore()
const roleDialogVisible = ref(false)
const roleLoading = ref(false)
const saveRoleLoading = ref(false)
const roleList = ref<RoleItem[]>([])
const activeRoleTab = ref('')
const permissionTree = ref<PermModule[]>([])
const selectedPermissions = ref<Record<number, string[]>>({})

const totalPermCount = computed(() => {
  return permissionTree.value.reduce((acc, cur) => acc + (cur.children?.length || 0), 0)
})

const openRolePermissionDialog = async () => {
  roleDialogVisible.value = true
  roleLoading.value = true
  try {
    const [rolesRes, treeRes] = await Promise.all([
      service.get('/api/roles'),
      service.get('/api/permissions/tree')
    ])

    if (rolesRes.data.success) {
      roleList.value = rolesRes.data.data || []
      const mapping: Record<number, string[]> = {}
      roleList.value.forEach(r => {
        mapping[r.id] = [...(r.permissions || [])]
      })
      selectedPermissions.value = mapping

      if (roleList.value.length > 0 && !activeRoleTab.value && roleList.value[0]) {
        activeRoleTab.value = String(roleList.value[0].id)
      }
    }

    if (treeRes.data.success) {
      permissionTree.value = treeRes.data.data || []
    }
  } catch (err: any) {
    ElMessage.error('加载角色与权限数据失败：' + (err.message || '网络异常'))
  } finally {
    roleLoading.value = false
  }
}

const isModuleChecked = (roleId: number, mod: PermModule): boolean => {
  const current = selectedPermissions.value[roleId] || []
  const modPerms = mod.children.map(c => c.value)
  return modPerms.length > 0 && modPerms.every(p => current.includes(p))
}

const isModuleIndeterminate = (roleId: number, mod: PermModule): boolean => {
  const current = selectedPermissions.value[roleId] || []
  const modPerms = mod.children.map(c => c.value)
  const checkedCount = modPerms.filter(p => current.includes(p)).length
  return checkedCount > 0 && checkedCount < modPerms.length
}

const handleModuleCheckAll = (roleId: number, mod: PermModule, val: boolean) => {
  const current = selectedPermissions.value[roleId] ? [...selectedPermissions.value[roleId]] : []
  const modPerms = mod.children.map(c => c.value)

  let next: string[]
  if (val) {
    next = Array.from(new Set([...current, ...modPerms]))
  } else {
    next = current.filter(p => !modPerms.includes(p))
  }
  selectedPermissions.value[roleId] = next
}

const saveRolePermissions = async () => {
  const roleId = Number(activeRoleTab.value)
  if (!roleId) return

  const role = roleList.value.find(r => r.id === roleId)
  const perms = selectedPermissions.value[roleId] || []

  saveRoleLoading.value = true
  try {
    const res = await service.put(`/api/roles/${roleId}/permissions`, {
      permissions: perms
    })
    if (res.data.success) {
      ElMessage.success(`角色 [${role?.roleName}] 权限字符配置更新成功！`)
      if (role) {
        role.permissions = [...perms]
      }
      if (userStore.refreshPermissions) {
        await userStore.refreshPermissions()
      }
    } else {
      ElMessage.error(res.data.message || '更新权限失败')
    }
  } catch (err: any) {
    ElMessage.error('保存角色权限失败：' + (err.message || '网络异常'))
  } finally {
    saveRoleLoading.value = false
  }
}

// 页面挂载：加载表格数据和两个排行榜
onMounted(() => {
  getTableData()
  fetchVolunteerRanking()
  fetchActivityRanking()
})
</script>

<style lang="scss" scoped>
.main {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 16px;
  min-height: calc(100vh - 80px);
  background-color: #f5f7fa;
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
.rank-card {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  background-color: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}
.rank-item {
  flex: 1;
  min-width: 300px;
}
.rank-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
  font-weight: 600;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}
.rank-scrollbar :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}
.rank-item-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
  background-color: #fafafa;
}
.rank-item-card:hover {
  background-color: #f0f2f5;
}
.rank-num {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  margin-right: 16px;
  color: #fff;
}
.top1 .rank-num {
  background-color: #ffd700;
  color: #333;
}
.top2 .rank-num {
  background-color: #c0c0c0;
  color: #333;
}
.top3 .rank-num {
  background-color: #cd7f32;
}
.normal-rank .rank-num {
  background-color: #e5e9f2;
  color: #666;
}
.rank-user-info {
  flex: 1;
}
.user-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}
.user-desc {
  font-size: 12px;
  color: #999;
}
.rank-extra {
  font-size: 12px;
  color: #999;
  margin-left: 16px;
}
.volunteer-rank {
  border-right: 1px solid #eee;
  padding-right: 24px;
}
@media (max-width: 768px) {
  .volunteer-rank {
    border-right: none;
    padding-right: 0;
    margin-bottom: 16px;
  }
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .rank-card {
    flex-direction: column;
  }
}

.permission-module-group {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  background-color: #fafbfc;
}
.module-header {
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
  margin-bottom: 10px;
}
.module-code {
  color: #909399;
  font-size: 12px;
  margin-left: 6px;
}
.module-perms {
  padding-left: 8px;
}
.perm-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dashed #f0f0f0;
  &:last-child {
    border-bottom: none;
  }
}
.perm-name {
  font-size: 13px;
  color: #333;
}
.perm-code {
  margin-left: 8px;
  font-family: monospace;
  font-size: 11px;
}
.perm-desc {
  font-size: 12px;
  color: #909399;
  margin-left: 16px;
}
</style>