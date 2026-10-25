import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  server: {
    port: 5174,
    proxy: {
      // 1. AI 对话与确认接口 -> 转发给本地 Agent 后端 (8000)
      '/api/chat': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      // 2. 业务接口（如登录 /api/auth、宠物图鉴 /api/app 等） -> 转发给线上业务后端 (47.93.227.166:3001)
      '/api': {
        target: 'http://47.93.227.166:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5174,
    proxy: {
      '/api/chat': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://47.93.227.166:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia'],
          'element-plus': ['element-plus', '@element-plus/icons-vue'],
          'echarts': ['echarts'],
          'axios': ['axios'],
        }
      }
    }
  }
})