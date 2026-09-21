<template>
  <div ref="chartRef" class="base-chart-container" :style="{ width, height }"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  ToolboxComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 注册需要的常用图表与组件
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  ToolboxComponent,
  CanvasRenderer
])

export interface BaseChartProps {
  options: echarts.EChartsCoreOption
  loading?: boolean
  height?: string
  width?: string
  theme?: string | object
}

const props = withDefaults(defineProps<BaseChartProps>(), {
  loading: false,
  height: '100%',
  width: '100%',
  theme: undefined
})

const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null

const initChart = () => {
  if (!chartRef.value) return
  if (chartInstance) {
    chartInstance.dispose()
  }

  chartInstance = echarts.init(chartRef.value, props.theme)
  if (props.options) {
    chartInstance.setOption(props.options)
  }

  if (props.loading) {
    chartInstance.showLoading()
  }

  // 监听容器大小变化自动 resize（比单纯监听 window.resize 更灵敏，兼容侧边栏伸缩与容器尺寸突变）
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      chartInstance?.resize()
    })
    resizeObserver.observe(chartRef.value)
  }
}

const handleWindowResize = () => {
  chartInstance?.resize()
}

watch(
  () => props.options,
  (newOpt) => {
    if (chartInstance && newOpt) {
      chartInstance.setOption(newOpt, true)
    }
  },
  { deep: true }
)

watch(
  () => props.loading,
  (isLoading) => {
    if (!chartInstance) return
    if (isLoading) {
      chartInstance.showLoading()
    } else {
      chartInstance.hideLoading()
    }
  }
)

onMounted(() => {
  nextTick(() => {
    initChart()
    window.addEventListener('resize', handleWindowResize)
  })
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  window.removeEventListener('resize', handleWindowResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})

// 暴露常用方法给父组件
defineExpose({
  getInstance: () => chartInstance,
  resize: () => chartInstance?.resize(),
  setOption: (opt: echarts.EChartsCoreOption, notMerge?: boolean) => chartInstance?.setOption(opt, notMerge)
})
</script>

<style scoped>
.base-chart-container {
  width: 100%;
  height: 100%;
  min-height: 100px;
  position: relative;
  overflow: hidden;
}
</style>

