<template>
  <div class="rank-card">
    <!-- 志愿时长排行榜 -->
    <div class="rank-item volunteer-rank">
      <h3 class="rank-title">志愿时长排行榜</h3>
      <el-scrollbar height="400px" class="rank-scrollbar">
        <div
          v-for="(item, index) in volunteerRankData"
          :key="item.studentId"
          class="rank-item-card"
          :class="{
            top1: index === 0,
            top2: index === 1,
            top3: index === 2,
            'normal-rank': index >= 3
          }"
        >
          <div class="rank-num">{{ index + 1 }}</div>
          <div class="rank-user-info">
            <div class="user-name">{{ item.name }}</div>
            <div class="user-desc">{{ item.volunteerTime }} 小时</div>
          </div>
          <div class="rank-extra" v-if="index > 0">
            距上一名 {{ getRankGap(volunteerRankData, index, 'volunteerTime') }} 小时
          </div>
        </div>
      </el-scrollbar>
    </div>

    <!-- 活跃度排行榜 -->
    <div class="rank-item activity-rank">
      <h3 class="rank-title">活跃度排行榜</h3>
      <el-scrollbar height="400px" class="rank-scrollbar">
        <div
          v-for="(item, index) in activityRankData"
          :key="item.studentId"
          class="rank-item-card"
          :class="{
            top1: index === 0,
            top2: index === 1,
            top3: index === 2,
            'normal-rank': index >= 3
          }"
        >
          <div class="rank-num">{{ index + 1 }}</div>
          <div class="rank-user-info">
            <div class="user-name">{{ item.name }}</div>
            <div class="user-desc">活跃度评分 {{ item.activeScore }}</div>
          </div>
          <div class="rank-extra" v-if="index > 0">
            距上一名 {{ getRankGap(activityRankData, index, 'activeScore') }} 分
          </div>
        </div>
      </el-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface VolunteerRankItem {
  studentId: string
  name: string
  volunteerTime: number
}

export interface ActivityRankItem {
  studentId: string
  name: string
  activeScore: number
}

defineProps<{
  volunteerRankData: VolunteerRankItem[]
  activityRankData: ActivityRankItem[]
}>()

// 计算与上一名的差距
const getRankGap = (rankList: any[], index: number, field: string) => {
  if (index === 0) return '0'
  const currentValue = rankList[index]?.[field] ?? 0
  const prevValue = rankList[index - 1]?.[field] ?? 0
  return (prevValue - currentValue).toFixed(1)
}
</script>

<style scoped>
.rank-card {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  background-color: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}
.rank-item {
  flex: 1;
  min-width: 300px;
}
.rank-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
  font-weight: 600;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}
.rank-scrollbar :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}
.rank-item-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
  background-color: #fafafa;
}
.rank-item-card:hover {
  background-color: #f0f2f5;
}
.rank-num {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  margin-right: 16px;
  color: #fff;
}
.top1 .rank-num {
  background-color: #ffd700;
  color: #333;
}
.top2 .rank-num {
  background-color: #c0c0c0;
  color: #333;
}
.top3 .rank-num {
  background-color: #cd7f32;
}
.normal-rank .rank-num {
  background-color: #e5e9f2;
  color: #666;
}
.rank-user-info {
  flex: 1;
}
.user-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}
.user-desc {
  font-size: 12px;
  color: #999;
}
.rank-extra {
  font-size: 12px;
  color: #999;
  margin-left: 16px;
}
.volunteer-rank {
  border-right: 1px solid #eee;
  padding-right: 24px;
}
@media (max-width: 768px) {
  .volunteer-rank {
    border-right: none;
    padding-right: 0;
    margin-bottom: 16px;
  }
  .rank-card {
    flex-direction: column;
  }
}
</style>

