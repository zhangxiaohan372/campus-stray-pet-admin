<template>
  <div class="parent-page">
    <h2>父组件 ParentPage</h2>

    <p>父组件收到的计数：{{ parentCount }}</p>
    <p>事件记录：{{ eventLog }}</p>

    <!-- 使用子组件 -->
    <Counter
      @count-change="handleCountChange"
      @reset="handleReset"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Counter from '../components/Counter.vue'

// 父组件的数据
const parentCount = ref(0)
const eventLog = ref<string[]>([])

// 处理子组件传来的计数变化
const handleCountChange = (newCount: number) => {
  parentCount.value = newCount
  eventLog.value.push(`计数变为: ${newCount}`)
}

// 处理子组件传来的重置事件
const handleReset = () => {
  parentCount.value = 0
  eventLog.value.push('重置了')
}
</script>

<style scoped>
.parent-page {
  padding: 20px;
  border: 2px solid #67c23a;
  border-radius: 8px;
  margin: 20px;
}
</style>
