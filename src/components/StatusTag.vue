<template>
  <el-tag 
    :type="tagType"
    :size="size"
    :effect="effect"
    class="status-tag"
  >
    {{ tagText }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// 1. 先定义配置和类型
type StatusType = 'pending' | 'approved' | 'rejected' | 'joined' | 'normal' | 'attention' | 'emergency' | 'volunteer' | 'admin' | 'dead' | 'cat' | 'dog' | 'all' | '紧缺' | '充足'

interface StatusConfig {
  [key: string]: {
    type: string
    text: string
  }
}

const STATUS_CONFIG: StatusConfig = {
  pending:   { type: 'warning', text: '待审核' },
  approved:  { type: 'success', text: '已通过' },
  rejected:  { type: 'danger',  text: '已驳回' },
  joined:    { type: 'success', text: '已参加' },
  normal:    { type: 'success', text: '健康' },
  attention: { type: 'warning', text: '需要关注' },
  emergency: { type: 'danger', text: '紧急' },
  volunteer: { type: 'success', text: '志愿者' },
  admin: { type: 'primary', text: '管理员' },
  dead: { type: 'danger', text: '已离世' },
  cat: { type: 'success', text: '猫' },
  dog: { type: 'primary', text: '狗' },
  all: { type: 'info', text: '通用' },
  紧缺: { type: 'danger', text: '紧缺' },
  充足:{type: 'success', text: '充足' },
}


interface Props {
  status: StatusType
  size?: 'mini' | 'small' | 'default' | 'large'
  effect?: 'light' | 'dark' | 'plain'
  customText?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'small',
  effect: 'light',
  customText: ''
})

// 4. 计算属性
const tagType = computed(() => {
  return STATUS_CONFIG[props.status]?.type || 'info'
})

const tagText = computed(() => {
  return props.customText || STATUS_CONFIG[props.status]?.text || '未知状态'
})
</script>

<style scoped>
.status-tag {
  border-radius: 4px;
  font-weight: 500;
  padding: 2px 8px;
  font-size: 12px;
}
</style>