<template>
  <el-dialog
    v-model="dialogVisible"
    title="拟提交宠物登记信息核对"
    width="480px"
    append-to-body
    :z-index="10050"
    :close-on-click-modal="false"
    class="ai-confirm-dialog"
  >
    <div class="confirm-content">
      <div class="confirm-tip">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" class="tip-icon">
          <circle cx="12" cy="12" r="10" stroke="#409eff" stroke-width="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke="#409eff" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="16" r="1" fill="#409eff"/>
        </svg>
        <span>AI 已整理拟登记信息，请核对无误后确认提交入库：</span>
      </div>

      <div class="fields-table-wrapper">
        <el-descriptions :column="1" border size="small" class="fields-descriptions">
          <el-descriptions-item label="种类">
            <el-tag :type="fields.pet_type === 'cat' ? 'warning' : 'primary'" effect="plain">
              {{ formatPetType(fields.pet_type) }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="宠物名字">
            <span class="field-value highlight">{{ fields.name || '未提供' }}</span>
          </el-descriptions-item>

          <el-descriptions-item label="所在区域">
            <span class="field-value">{{ fields.area || '未提供' }}</span>
          </el-descriptions-item>

          <el-descriptions-item label="品种">
            <span class="field-value">{{ fields.breed || '未知/中华田园' }}</span>
          </el-descriptions-item>

          <el-descriptions-item label="年龄">
            <span class="field-value">{{ fields.age || '未知' }}</span>
          </el-descriptions-item>

          <el-descriptions-item label="健康状态">
            <el-tag :type="formatHealthStatusType(fields.health_status)">
              {{ fields.health_status || '未知' }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="健康描述">
            <span class="field-value">{{ fields.health || '无特殊描述' }}</span>
          </el-descriptions-item>

          <!-- 动态展示其他可能的后端字段 -->
          <template v-for="(val, key) in extraFields" :key="key">
            <el-descriptions-item :label="formatFieldKey(String(key))">
              <span class="field-value">{{ val }}</span>
            </el-descriptions-item>
          </template>
        </el-descriptions>
      </div>

      <p class="confirm-footer-note">
        * 点击“确认提交”将正式写入系统；点击“取消登记”将放弃写入。
      </p>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="onCancel" :disabled="loading">取消登记</el-button>
        <el-button type="primary" :loading="loading" @click="onConfirm">
          确认提交
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    fields: Record<string, string>
    prompt?: string
    loading?: boolean
  }>(),
  {
    visible: false,
    fields: () => ({}),
    prompt: '',
    loading: false,
  }
)

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val: boolean) => emit('update:visible', val),
})

const knownKeys = new Set(['pet_type', 'name', 'area', 'breed', 'age', 'health_status', 'health'])

const extraFields = computed(() => {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(props.fields || {})) {
    if (!knownKeys.has(k)) {
      result[k] = v
    }
  }
  return result
})

const formatPetType = (type?: string) => {
  if (!type) return '宠物'
  const lower = type.toLowerCase()
  if (lower === 'dog') return '狗狗 🐶'
  if (lower === 'cat') return '猫咪 🐱'
  return type
}

const formatHealthStatusType = (status?: string): 'success' | 'warning' | 'danger' | 'info' => {
  if (!status) return 'info'
  if (status.includes('好') || status.includes('正常') || status.includes('健康') || status === 'normal') {
    return 'success'
  }
  if (status.includes('注') || status.includes('病') || status === 'attention') {
    return 'warning'
  }
  if (status.includes('紧') || status.includes('重') || status.includes('亡') || status === 'dead' || status === 'emergency') {
    return 'danger'
  }
  return 'info'
}

const keyLabelMap: Record<string, string> = {
  found_time: '发现时间',
  foundTime: '发现时间',
  contact: '联系方式',
  remark: '备注信息',
  location: '具体地点',
}

const formatFieldKey = (key: string) => {
  return keyLabelMap[key] || key
}

const onConfirm = () => {
  emit('confirm')
}

const onCancel = () => {
  emit('cancel')
}
</script>

<style scoped>
.confirm-content {
  padding: 4px 8px;
}

.confirm-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #303133;
  margin-bottom: 14px;
  line-height: 1.5;
}

.tip-icon {
  flex-shrink: 0;
}

.fields-table-wrapper {
  margin-bottom: 12px;
}

.field-value {
  color: #303133;
  font-size: 13px;
}

.field-value.highlight {
  font-weight: 600;
  color: #409eff;
}

.confirm-footer-note {
  margin: 10px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
