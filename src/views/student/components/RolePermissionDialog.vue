<template>
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getRolesApi, updateRolePermissionsApi } from '../../../api/role'
import { getPermissionTreeApi } from '../../../api/auth'
import { useUserStore } from '../../../stores/user'

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

const open = async () => {
  roleDialogVisible.value = true
  roleLoading.value = true
  try {
    const [rolesRes, treeRes] = await Promise.all([
      getRolesApi(),
      getPermissionTreeApi()
    ])

    if (rolesRes.data.success) {
      roleList.value = (rolesRes.data.data || []).map(role => ({
        ...role,
        description: role.description || '',
        createTime: role.createTime || '',
        permissions: role.permissions || []
      }))
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
      permissionTree.value = (treeRes.data.data || []).map(module => ({
        label: module.label,
        value: module.value,
        children: (module.children || []).map(item => ({
          id: Number(item.id ?? 0),
          label: item.label,
          value: item.value,
          description: item.description
        }))
      }))
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
    const res = await updateRolePermissionsApi(roleId, perms)
    if (res.data.success) {
      ElMessage.success(`角色 [${role?.roleName}] 权限字符配置更新成功！`)
      if (role) {
        role.permissions = [...perms]
      }
      if (userStore.refreshPermissions) {
        await userStore.refreshPermissions()
      }
    } else {
      ElMessage.error(res.data.msg || (res.data as any).message || '更新权限失败')
    }
  } catch (err: any) {
    ElMessage.error('保存角色权限失败：' + (err.message || '网络异常'))
  } finally {
    saveRoleLoading.value = false
  }
}

defineExpose({
  open
})
</script>

<style scoped lang="scss">
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
.dialog-footer {
  text-align: right;
}
</style>

