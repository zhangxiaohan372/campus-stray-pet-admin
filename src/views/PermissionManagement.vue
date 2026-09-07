<template>
  <div class="permission-page">
    <!-- 顶部操作栏 -->
    <div class="header-card">
      <div class="header-left">
        <h2 class="page-title">权限树设置</h2>
        <span class="sub-title">系统角色原子权限树配置（仅管理 admin 与 president）</span>
      </div>
      <div class="header-actions">
        <el-select v-model="roleViewMode" style="width: 170px;" placeholder="角色列显示">
          <el-option label="同时显示两角色" value="all" />
          <el-option label="仅看 社长 (president)" value="president" />
          <el-option label="仅看 管理员 (admin)" value="admin" />
        </el-select>
        <el-button @click="toggleExpandAll">
          {{ isAllExpanded ? '折叠全部' : '展开全部' }}
        </el-button>
        <el-button @click="fetchData" :loading="loading">
          <el-icon style="margin-right: 4px;"><Refresh /></el-icon>
          重置
        </el-button>
        <el-button type="primary" @click="savePermissions" :loading="saveLoading">
          <el-icon style="margin-right: 4px;"><Check /></el-icon>
          保存权限配置
        </el-button>
        <el-button type="primary" plain @click="router.push('/')">
          <el-icon style="margin-right: 4px;"><House /></el-icon>
          返回主界面
        </el-button>
      </div>
    </div>

    <!-- 二级下拉树形表格 -->
    <div class="table-card" v-loading="loading">
      <el-table
        ref="tableRef"
        :data="tableData"
        row-key="id"
        default-expand-all
        border
        stripe
        class="tree-table"
      >
        <!-- 权限模块 / 功能项（第一列带树形折叠展开箭头） -->
        <el-table-column prop="name" label="权限模块 / 功能项" min-width="220">
          <template #default="{ row }">
            <span v-if="row.isModule" class="module-row-name">
              <el-icon style="vertical-align: -2px; margin-right: 4px; color: #409eff;"><Folder /></el-icon>
              <strong>{{ row.name }}</strong>
            </span>
            <span v-else class="perm-row-name">
              {{ row.name }}
            </span>
          </template>
        </el-table-column>

        <!-- 权限字符 -->
        <el-table-column prop="code" label="权限字符代码" width="200">
          <template #default="{ row }">
            <el-tag v-if="!row.isModule" size="small" type="info">{{ row.code }}</el-tag>
            <span v-else style="color: #909399; font-size: 12px;">[{{ row.code }}]</span>
          </template>
        </el-table-column>

        <!-- 功能描述 -->
        <el-table-column prop="description" label="功能说明" min-width="280" show-overflow-tooltip />

        <!-- 社长 (president) 权限勾选列 -->
        <el-table-column
          v-if="roleViewMode === 'all' || roleViewMode === 'president'"
          label="社长 (president)"
          width="190"
          align="center"
        >
          <template #header>
            <div class="role-header-cell">
              <span>社长 (president)</span>
              <el-tag size="small" type="warning">{{ presidentCheckedCount }}/{{ totalPermCount }}</el-tag>
            </div>
          </template>
          <template #default="{ row }">
            <!-- 一级模块行：支持本模块全选 / 半选 -->
            <el-checkbox
              v-if="row.isModule"
              :model-value="isModuleChecked('president', row)"
              :indeterminate="isModuleIndeterminate('president', row)"
              @change="(val: any) => handleModuleToggle('president', row, Boolean(val))"
            >
              <span class="module-check-label">本模块全选</span>
            </el-checkbox>
            <!-- 二级权限行：单项勾选 -->
            <el-checkbox
              v-else
              :model-value="selectedPermissions.president.includes(row.code)"
              @change="(val: any) => handlePermToggle('president', row.code, Boolean(val))"
            />
          </template>
        </el-table-column>

        <!-- 管理员 (admin) 权限勾选列 -->
        <el-table-column
          v-if="roleViewMode === 'all' || roleViewMode === 'admin'"
          label="管理员 (admin)"
          width="190"
          align="center"
        >
          <template #header>
            <div class="role-header-cell">
              <span>管理员 (admin)</span>
              <el-tag size="small" type="primary">{{ adminCheckedCount }}/{{ totalPermCount }}</el-tag>
            </div>
          </template>
          <template #default="{ row }">
            <!-- 一级模块行：支持本模块全选 / 半选 -->
            <el-checkbox
              v-if="row.isModule"
              :model-value="isModuleChecked('admin', row)"
              :indeterminate="isModuleIndeterminate('admin', row)"
              @change="(val: any) => handleModuleToggle('admin', row, Boolean(val))"
            >
              <span class="module-check-label">本模块全选</span>
            </el-checkbox>
            <!-- 二级权限行：单项勾选 -->
            <el-checkbox
              v-else
              :model-value="selectedPermissions.admin.includes(row.code)"
              @change="(val: any) => handlePermToggle('admin', row.code, Boolean(val))"
            />
          </template>
        </el-table-column>
      </el-table>

      <!-- 底部操作与提示 -->
      <div class="bottom-bar">
        <div class="bottom-tip">
          💡 提示：点击每行左侧箭头可下拉/收起该模块的二级权限项；勾选后请点击【保存权限配置】持久化至数据库。
        </div>
        <div class="bottom-actions">
          <el-button type="primary" plain @click="router.push('/')">
            <el-icon style="margin-right: 4px;"><House /></el-icon>
            返回主界面
          </el-button>
          <el-button type="primary" size="large" @click="savePermissions" :loading="saveLoading">
            <el-icon style="margin-right: 4px;"><Check /></el-icon>
            保存权限配置
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type ElTable } from 'element-plus'
import { Refresh, Check, House, Folder } from '@element-plus/icons-vue'
import service from '../components/request'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

interface PermItem {
  id?: number
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
  permissions: string[]
}

interface TableRow {
  id: string
  name: string
  code: string
  description: string
  isModule: boolean
  children?: TableRow[]
}

const loading = ref(false)
const saveLoading = ref(false)
const roleViewMode = ref<'all' | 'president' | 'admin'>('all')
const isAllExpanded = ref(true)
const tableRef = ref<InstanceType<typeof ElTable>>()

// 角色与权限数据（仅管理 admin 和 president）
const roleList = ref<RoleItem[]>([])
const tableData = ref<TableRow[]>([])
const selectedPermissions = ref<{
  president: string[]
  admin: string[]
}>({
  president: [],
  admin: []
})

// 系统总权限数
const totalPermCount = computed(() => {
  return tableData.value.reduce((acc, row) => acc + (row.children ? row.children.length : 0), 0)
})

// 社长已勾选数量
const presidentCheckedCount = computed(() => {
  return selectedPermissions.value.president.length
})

// 管理员已勾选数量
const adminCheckedCount = computed(() => {
  return selectedPermissions.value.admin.length
})

// 判断模块是否全选
const isModuleChecked = (roleKey: 'president' | 'admin', row: TableRow): boolean => {
  const current = selectedPermissions.value[roleKey] || []
  const childCodes = (row.children || []).map(c => c.code)
  return childCodes.length > 0 && childCodes.every(code => current.includes(code))
}

// 判断模块是否半选
const isModuleIndeterminate = (roleKey: 'president' | 'admin', row: TableRow): boolean => {
  const current = selectedPermissions.value[roleKey] || []
  const childCodes = (row.children || []).map(c => c.code)
  const checkedCount = childCodes.filter(code => current.includes(code)).length
  return checkedCount > 0 && checkedCount < childCodes.length
}

// 模块全选/反选切换
const handleModuleToggle = (roleKey: 'president' | 'admin', row: TableRow, val: boolean) => {
  const current = [...selectedPermissions.value[roleKey]]
  const childCodes = (row.children || []).map(c => c.code)

  if (val) {
    selectedPermissions.value[roleKey] = Array.from(new Set([...current, ...childCodes]))
  } else {
    selectedPermissions.value[roleKey] = current.filter(code => !childCodes.includes(code))
  }
}

// 单项权限切换
const handlePermToggle = (roleKey: 'president' | 'admin', permCode: string, val: boolean) => {
  const current = [...selectedPermissions.value[roleKey]]
  if (val) {
    if (!current.includes(permCode)) current.push(permCode)
  } else {
    const idx = current.indexOf(permCode)
    if (idx !== -1) current.splice(idx, 1)
  }
  selectedPermissions.value[roleKey] = current
}

// 全部展开 / 折叠切换
const toggleExpandAll = () => {
  isAllExpanded.value = !isAllExpanded.value
  tableData.value.forEach(row => {
    tableRef.value?.toggleRowExpansion(row, isAllExpanded.value)
  })
}

// 获取数据（只保留 admin 和 president）
const fetchData = async () => {
  loading.value = true
  try {
    const [rolesRes, treeRes] = await Promise.all([
      service.get('/api/roles'),
      service.get('/api/permissions/tree')
    ])

    if (rolesRes.data?.success) {
      const allRoles: RoleItem[] = rolesRes.data.data || []
      // 仅保留 admin 和 president 两个角色
      roleList.value = allRoles.filter(r => ['admin', 'president'].includes(r.roleCode))

      const president = allRoles.find(r => r.roleCode === 'president')
      const admin = allRoles.find(r => r.roleCode === 'admin')

      selectedPermissions.value.president = president?.permissions ? [...president.permissions] : []
      selectedPermissions.value.admin = admin?.permissions ? [...admin.permissions] : []
    } else {
      ElMessage.error(rolesRes.data?.message || '获取角色列表失败')
    }

    if (treeRes.data?.success) {
      const rawTree: PermModule[] = treeRes.data.data || []
      // 构建二级表格数据（一级为模块，二级为权限项）
      tableData.value = rawTree.map(mod => ({
        id: `mod_${mod.value}`,
        name: mod.label,
        code: mod.value,
        description: `${mod.label}模块包含 ${mod.children?.length || 0} 项权限字符`,
        isModule: true,
        children: (mod.children || []).map(p => ({
          id: `perm_${p.value}`,
          name: p.label,
          code: p.value,
          description: p.description || '',
          isModule: false
        }))
      }))
    } else {
      ElMessage.error(treeRes.data?.message || '获取权限树失败')
    }
  } catch (err: any) {
    console.error('加载权限数据出错:', err)
    ElMessage.error('加载权限数据失败：' + (err.message || '网络异常'))
  } finally {
    loading.value = false
  }
}

// 保存权限配置（将 admin 和 president 同步持久化至数据库）
const savePermissions = async () => {
  const presidentRole = roleList.value.find(r => r.roleCode === 'president')
  const adminRole = roleList.value.find(r => r.roleCode === 'admin')

  if (!presidentRole && !adminRole) {
    ElMessage.warning('未找到待保存的角色数据')
    return
  }

  saveLoading.value = true
  try {
    const promises = []
    if (presidentRole) {
      promises.push(service.put(`/api/roles/${presidentRole.id}/permissions`, {
        permissions: selectedPermissions.value.president
      }))
    }
    if (adminRole) {
      promises.push(service.put(`/api/roles/${adminRole.id}/permissions`, {
        permissions: selectedPermissions.value.admin
      }))
    }

    await Promise.all(promises)
    ElMessage.success('管理员与社长角色权限树配置保存成功！')

    // 刷新当前登录用户的权限状态
    if (userStore.refreshPermissions) {
      await userStore.refreshPermissions()
    }
  } catch (err: any) {
    console.error('保存权限失败:', err)
    ElMessage.error('保存权限失败：' + (err.message || '网络异常'))
  } finally {
    saveLoading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.permission-page {
  padding: 16px 20px;
  max-width: 1300px;
  margin: 0 auto;
}

.header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.header-left .page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px 0;
}

.header-left .sub-title {
  font-size: 13px;
  color: #909399;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.table-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.tree-table {
  width: 100%;
}

.module-row-name {
  font-size: 14px;
  color: #303133;
}

.perm-row-name {
  font-size: 13px;
  color: #606266;
}

.role-header-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.module-check-label {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}

.bottom-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #ebeef5;
  flex-wrap: wrap;
  gap: 12px;
}

.bottom-tip {
  font-size: 13px;
  color: #909399;
}

.bottom-actions {
  display: flex;
  gap: 12px;
}

@media screen and (max-width: 768px) {
  .permission-page {
    padding: 12px;
  }
  .header-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .bottom-bar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
