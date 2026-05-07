<template>
  <div class="pagination-container">
    <span>
      共{{ total }}条数据 / 第{{ innerCurrentPage }}页 / 每页{{ innerPageSize }}条
    </span>
    <el-pagination
      v-model:current-page="innerCurrentPage"
      v-model:page-size="innerPageSize"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      layout="prev, pager, next, jumper"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'

const props = defineProps({
  total: {
    type: Number,
    required: true,
    default: 0
  },
  pageSize: {
    type: Number,
    required: true,
    default: 10
  },
  currentPage: {
    type: Number,
    required: true,
    default: 1
  }
})

const emit = defineEmits<{
  (e: 'update:currentPage', value: number): void
  (e: 'update:pageSize', value: number): void
}>()

const innerCurrentPage = computed({
  get: () => props.currentPage,
  set: (val) => emit('update:currentPage', val)
})

const innerPageSize = computed({
  get: () => props.pageSize,
  set: (val) => emit('update:pageSize', val)
})

watch(
  () => [props.total, props.pageSize],
  () => {
    const totalPages = props.total > 0 ? Math.ceil(props.total / props.pageSize) : 1
    if (props.currentPage > totalPages) {
      emit('update:currentPage', totalPages)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.pagination-container {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 20px;
  padding: 10px 0;
}

.pagination-container span {
  color: #666;
  font-size: 14px;
}
</style>