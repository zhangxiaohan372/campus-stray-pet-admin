<template>
  <div class="container">
    <BaseLoading :loading="props.loading" text="正在加载数据"></BaseLoading>
    <!-- PC端 -->
    <div v-if="!isMobile && !props.loading">
      <el-table
        :data="props.tableData"
      >
        <el-table-column
          v-for="column in props.columns"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          :width="column.width"
        >
          <template #default="scope">
            <!-- 具名插槽，如果父组件提供则使用，否则显示默认内容 -->
            <slot :name="column.prop" v-bind="scope">
              <!-- 默认显示字段值，如果为空则显示 '--' -->
              <span>{{ scope.row[column.prop] || '--' }}</span>
            </slot>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
        >
          <template #default="scope">
            <slot name="operate" v-bind="scope">
              <!-- 默认操作按钮（禁用状态，提示暂无操作） -->
              <el-button type="primary" size="small" disabled>暂无操作</el-button>
            </slot>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 移动端卡片列表 -->
    <div v-else-if="isMobile && !props.loading" class="card-list">
      <div class="card-item" v-for="item in props.tableData" :key="item.id">
        <div class="card-row" v-for="column in props.columns" :key="column.prop">
          <span class="card-label">{{ column.label }}:</span>
          <span class="card-value">
            <!-- 移动端插槽，默认显示字段值 -->
            <slot :name="column.prop" :row="item">
              {{ item[column.prop] || '--' }}
            </slot>
          </span>
        </div>

        <!-- 卡片操作按钮 -->
        <div class="card-operate" v-if="props.showOperate">
          <slot name="operate" :row="item">
            <!-- 默认操作按钮 -->
            <el-button type="primary" size="small" disabled>暂无操作</el-button>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useWindowSize } from '@vueuse/core'
import BaseLoading from './BaseLoading.vue'

// 列配置接口
interface TableColumn {
  prop: string;
  label: string;
  width?: string | number;
  minWidth?: string | number;
}

// 行数据接口
type TableRow = {
  id: string | number;
  [key: string]: any;
}

const props = defineProps({
  tableData: {
    type: Array as () => TableRow[],
    default: () => []
  },
  columns: {
    type: Array as () => TableColumn[],
    default: () => []
  },
  showOperate: {
    type: Boolean,
    default: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const { width } = useWindowSize()
const isMobile = computed(() => {
  return (width.value || window.innerWidth) < 768
})
</script>

<style lang="scss" scoped>
.container {
  width: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 16px;
}

// 移动端卡片样式
.card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-item {
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
}

.card-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 14px;
  flex-wrap: wrap;

  .card-label {
    min-width: 80px;
    color: #606266;
    font-weight: 500;
  }

  .card-value {
    color: #303133;
    flex: 1;
    word-break: break-all;
  }
}

.card-operate {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #ebeef5;
  text-align: right;
}

@media (max-width: 768px) {
  .container {
    padding: 12px 8px;
  }
  .card-item {
    padding: 12px;
  }
}
</style>