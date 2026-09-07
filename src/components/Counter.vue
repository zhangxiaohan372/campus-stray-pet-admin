<template>
  <div class="counter">
    <h3>子组件 Counter</h3>
    <p>当前计数：{{ count }}</p>

    <button @click="handleAdd">+1</button>
    <button @click="handleMinus">-1</button>
    <button @click="handleReset">重置</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// emit 定义：告诉父组件发生了什么
const emit = defineEmits<{
  (e: 'countChange', newCount: number): void   // 计数变化
  (e: 'reset'): void                            // 重置
}>()

// 子组件内部状态
const count = ref(0)

// 点击 +1
const handleAdd = () => {
  count.value++
  emit('countChange', count.value)  // 通知父组件
}

// 点击 -1
const handleMinus = () => {
  count.value--
  emit('countChange', count.value)  // 通知父组件
}

// 点击重置
const handleReset = () => {
  count.value = 0
  emit('reset')  // 通知父组件
}
</script>

<style scoped>
.counter {
  border: 2px solid #409eff;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

button {
  margin: 0 5px;
  padding: 5px 15px;
  cursor: pointer;
}
</style>
