<template>
  <div class="task-plan-card" :class="{ 'is-all-done': isAllCompleted, 'is-running': isRunning }">
    <!-- 1. 卡片头部 (可点击折叠/展开) -->
    <div class="plan-header" @click="toggleCollapse">
      <div class="header-left">
        <!-- 看板图标 -->
        <span class="plan-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            <path d="M9 14l2 2 4-4" />
          </svg>
        </span>

        <!-- 规划标题描述 -->
        <span class="plan-summary" :title="plan.summary">{{ plan.summary || '分层任务执行规划' }}</span>

        <!-- 进度与状态徽章 -->
        <div class="status-badge" :class="badgeClass">
          <template v-if="isAllCompleted">
            <svg class="badge-icon" viewBox="0 0 20 20" width="12" height="12" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            <span>全流程执行完毕</span>
          </template>
          <template v-else-if="hasFailed">
            <span class="dot-fail"></span>
            <span>部分任务异常</span>
          </template>
          <template v-else-if="isRunning">
            <span class="spinner-mini"></span>
            <span>{{ completedCount }}/{{ totalCount }} 执行中</span>
          </template>
          <template v-else>
            <span>{{ completedCount }}/{{ totalCount }} 待执行</span>
          </template>
        </div>
      </div>

      <!-- 右侧折叠/展开切换按钮 -->
      <button class="collapse-toggle-btn" :title="isCollapsed ? '展开任务清单' : '折叠任务清单'">
        <span>{{ isCollapsed ? '展开' : '收起' }}</span>
        <svg
          class="arrow-icon"
          :class="{ 'is-flipped': isCollapsed }"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <!-- 2. 任务列表主体 (带平滑折叠动效) -->
    <transition name="plan-expand">
      <div v-show="!isCollapsed" class="plan-body">
        <ul class="task-list">
          <li
            v-for="task in plan.tasks"
            :key="task.id"
            class="task-item"
            :class="[`status-${task.status}`]"
          >
            <!-- 状态图标 -->
            <div class="task-status-icon">
              <!-- running: 蓝色旋转加载环（仅在 isStreaming 为 true 时旋转，生成结束后若仍为 running 则静止或视为完成） -->
              <span v-if="task.status === 'running' && isStreaming" class="spinner-ring" title="执行中..."></span>

              <!-- completed / 生成结束后的完成态: 绿色圆圈对勾 -->
              <span v-else-if="task.status === 'completed' || (task.status === 'running' && !isStreaming)" class="icon-completed" title="已完成">
                <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </span>

              <!-- failed: 红色圆圈叉号 -->
              <span v-else-if="task.status === 'failed'" class="icon-failed" title="执行失败">
                <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </span>

              <!-- pending: 灰色空心细圆圈 -->
              <span v-else class="icon-pending" title="排队等待中"></span>
            </div>

            <!-- 任务核心内容区 -->
            <div class="task-content">
              <div class="task-title-line">
                <span class="task-title">{{ task.title }}</span>
                <!-- 任务类型标签 (如 TOOL / KNOWLEDGE_SEARCH) -->
                <span v-if="task.type" class="task-type-tag">{{ formatTaskType(task.type) }}</span>
              </div>

              <!-- 执行产物/快照结果 (若有返回结果则展示展开查看按钮及内容) -->
              <div v-if="task.result" class="task-result-box">
                <div class="result-toggle" @click.stop="toggleResult(task.id)">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                  </svg>
                  <span>{{ expandedResults[task.id] ? '收起执行产物' : '查看执行快照' }}</span>
                </div>
                <div v-if="expandedResults[task.id]" class="result-detail">
                  <pre>{{ task.result }}</pre>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TaskPlan } from '../../api/ai'

const props = defineProps<{
  plan: TaskPlan
  isStreaming?: boolean
}>()

// 控制面板整体展开/收起
const isCollapsed = ref(false)

// 当流式回答结束时，自动折叠收起任务看板，避免大块遮挡下方的 AI 正文回复
watch(
  () => props.isStreaming,
  (streaming, prevStreaming) => {
    if (prevStreaming && !streaming) {
      isCollapsed.value = true
    }
  }
)

// 控制具体每个任务的执行产物快照展开
const expandedResults = ref<Record<number, boolean>>({})

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const toggleResult = (taskId: number) => {
  expandedResults.value[taskId] = !expandedResults.value[taskId]
}

// 统计逻辑
const totalCount = computed(() => props.plan?.tasks?.length || 0)

const completedCount = computed(() => {
  // 如果当前对话流已经结束，未报错的任务均按已完成统计
  if (!props.isStreaming) {
    return props.plan?.tasks?.filter(t => t.status !== 'failed').length || 0
  }
  return props.plan?.tasks?.filter(t => t.status === 'completed').length || 0
})

const isAllCompleted = computed(() => {
  if (!props.isStreaming && !hasFailed.value) {
    return totalCount.value > 0
  }
  return totalCount.value > 0 && completedCount.value === totalCount.value
})

const hasFailed = computed(() => {
  return props.plan?.tasks?.some(t => t.status === 'failed') || false
})

const isRunning = computed(() => {
  // 仅在正在流式生成且有正在执行的任务时才显示“执行中”
  if (props.isStreaming === false) return false
  return props.plan?.tasks?.some(t => t.status === 'running') || false
})

// 徽章样式类名
const badgeClass = computed(() => {
  if (isAllCompleted.value) return 'badge-completed'
  if (hasFailed.value) return 'badge-failed'
  if (isRunning.value) return 'badge-running'
  return 'badge-pending'
})

// 类型名称格式化，转为更通俗易懂的简短标签
const formatTaskType = (type: string) => {
  const map: Record<string, string> = {
    KNOWLEDGE_SEARCH: '知识检索',
    TOOL: '系统工具',
    PET_REGISTRATION: '动物建档',
    DATABASE: '数据查询',
    API: '接口调用'
  }
  return map[type] || type
}
</script>

<style scoped>
.task-plan-card {
  margin-bottom: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.25s ease;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  user-select: none;
}

.task-plan-card.is-running {
  border-color: #cbd5e1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.task-plan-card.is-all-done {
  border-color: #d1fae5;
  background: #fcfdfd;
}

/* 头部样式 */
.plan-header {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  background: #f8fafc;
  transition: background-color 0.15s ease;
}

.plan-header:hover {
  background: #f1f5f9;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.plan-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  flex-shrink: 0;
}

.plan-summary {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 220px;
}

/* 状态徽章 */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 12px;
  font-weight: 500;
  flex-shrink: 0;
  line-height: 1.4;
  border: 1px solid transparent;
}

.badge-pending {
  background: #f1f5f9;
  color: #64748b;
  border-color: #e2e8f0;
}

.badge-running {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}

.badge-completed {
  background: #ecfdf5;
  color: #059669;
  border-color: #a7f3d0;
}

.badge-failed {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

.badge-icon {
  flex-shrink: 0;
}

.spinner-mini {
  width: 9px;
  height: 9px;
  border: 1.5px solid #93c5fd;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.dot-fail {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #dc2626;
}

/* 折叠按钮 */
.collapse-toggle-btn {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.15s;
}

.collapse-toggle-btn:hover {
  color: #1e293b;
  background: #e2e8f0;
}

.arrow-icon {
  transition: transform 0.2s ease;
}

.arrow-icon.is-flipped {
  transform: rotate(-180deg);
}

/* 列表区 */
.plan-body {
  border-top: 1px solid #edf2f7;
  padding: 6px 10px 8px;
  background: #ffffff;
}

.task-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 6px 8px;
  border-radius: 6px;
  transition: background-color 0.15s ease;
}

.task-item.status-running {
  background: #f0f7ff;
}

.task-item.status-completed {
  background: #fafafa;
}

/* 状态图标 */
.task-status-icon {
  margin-top: 2px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-pending {
  width: 10px;
  height: 10px;
  border: 1.5px solid #cbd5e1;
  border-radius: 50%;
}

.spinner-ring {
  width: 12px;
  height: 12px;
  border: 2px solid #bfdbfe;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.icon-completed {
  color: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-failed {
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 任务内容 */
.task-content {
  flex: 1;
  min-width: 0;
}

.task-title-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.task-title {
  font-size: 12.5px;
  line-height: 1.5;
  color: #334155;
  word-break: break-all;
}

.status-running .task-title {
  color: #1d4ed8;
  font-weight: 500;
}

.status-completed .task-title {
  color: #1e293b;
}

.status-failed .task-title {
  color: #b91c1c;
}

.status-pending .task-title {
  color: #64748b;
}

/* 任务类型标签 */
.task-type-tag {
  font-size: 10px;
  color: #64748b;
  background: #f1f5f9;
  padding: 1px 5px;
  border-radius: 4px;
  flex-shrink: 0;
}

.status-running .task-type-tag {
  background: #dbeafe;
  color: #1d4ed8;
}

/* 任务结果产物快照 */
.task-result-box {
  margin-top: 4px;
}

.result-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #64748b;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  transition: all 0.15s;
}

.result-toggle:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.result-detail {
  margin-top: 5px;
  padding: 6px 9px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  max-height: 120px;
  overflow-y: auto;
}

.result-detail pre {
  margin: 0;
  font-size: 11px;
  color: #475569;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: Consolas, Monaco, monospace;
}

/* 折叠动画 */
.plan-expand-enter-active,
.plan-expand-leave-active {
  transition: all 0.25s ease-in-out;
  max-height: 500px;
  overflow: hidden;
}

.plan-expand-enter-from,
.plan-expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
