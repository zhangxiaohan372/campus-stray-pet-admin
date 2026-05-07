<template>
  <!-- 核心：加载容器需包裹图标+文字，保证布局统一 -->
  <div 
    class="base-loading"
    v-show="loading" 
  >
    <el-icon class="loading-icon"><Loading /></el-icon>
    <div class="loading-text">{{ text }}</div>
  </div>
</template>

<script setup lang="ts">
import { Loading } from '@element-plus/icons-vue';

const props = defineProps({    
  loading: {
    type: Boolean,
    default: false
  },
  text: {
    type: String,
    default: '加载中...'
  }
})
</script>

<style scoped>

.base-loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;      
  flex-direction: column; 
  align-items: center;
  justify-content: center;
  gap: 8px;           
  background: rgba(255, 255, 255, 0.8); 
  border-radius: 4px;
  z-index: 10;    
}

.loading-icon {
  font-size: 24px; 
  color: #409eff;  
  animation: loading-rotate 2s linear infinite;
}

.loading-text {
  font-size: 12px;
  color: #666;
}

@keyframes loading-rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>