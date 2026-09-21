<template>
  <div class="announcement-card" @click="toPage('/announcement')">
    <div class="announcement-title">
      <el-icon class="announcement-icon"><Bell /></el-icon>
      <span>公告栏</span>
    </div>
    <div
      ref="announcementScrollRef"
      class="announcement-list"
      @scroll="handleAnnouncementScroll"
    >
      <div v-for="announcement in announcementsList" :key="announcement.id" class="announcement-item">
        <div class="announcement-content">
          <div class="announcement-title-text">{{ announcement.title }}</div>
          <div class="announcement-description">{{ announcement.description }}</div>
        </div>
        <div class="announcement-time">{{ announcement.time }}</div>
      </div>
      <div v-if="announcementsLoading" class="loading-tip">加载中...</div>
      <div v-else-if="!announcementsHasMore" class="no-more-tip">没有更多了</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Bell } from '@element-plus/icons-vue'
import { getAnnouncementsApi, type AnnouncementItem } from '../../../api/announcement'

const router = useRouter()

const toPage = (path: string) => {
  router.push(path)
}

// 公告栏相关状态
const announcementsList = ref<AnnouncementItem[]>([])
const announcementsPage = ref(1)
const announcementsPageSize = ref(5) // 每次加载5条
const announcementsTotal = ref(0)
const announcementsLoading = ref(false)
const announcementsHasMore = ref(true)
const announcementScrollRef = ref<HTMLDivElement | null>(null)

// 加载公告列表（分页）
const loadAnnouncements = async (isLoadMore = false) => {
  if (announcementsLoading.value) return
  if (!isLoadMore) {
    announcementsPage.value = 1
    announcementsList.value = []
    announcementsHasMore.value = true
  }
  if (!announcementsHasMore.value && isLoadMore) return

  announcementsLoading.value = true
  try {
    const res = await getAnnouncementsApi({
      page: announcementsPage.value,
      pageSize: announcementsPageSize.value
    })
    if (res.data.success) {
      const list = res.data.data?.list || []
      const total = res.data.data?.total || 0
      if (isLoadMore) {
        announcementsList.value.push(...(list as any))
      } else {
        announcementsList.value = list as any
      }
      announcementsTotal.value = total
      announcementsHasMore.value = announcementsList.value.length < total
      if (announcementsHasMore.value) {
        announcementsPage.value++
      }
    } else {
      ElMessage.error(res.data.msg || '加载公告失败')
    }
  } catch (err) {
    console.error('加载公告失败', err)
    ElMessage.error('加载公告失败')
  } finally {
    announcementsLoading.value = false
  }
}

// 滚动加载更多
let ticking = false
const handleAnnouncementScroll = (e: Event) => {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    const target = e.target as HTMLDivElement
    const { scrollTop, scrollHeight, clientHeight } = target
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      loadAnnouncements(true)
    }
    ticking = false
  })
}

onMounted(() => {
  loadAnnouncements()
})
</script>

<style scoped>
.announcement-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.3s ease;
}
.announcement-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}
.announcement-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #e9ecef;
}
.announcement-icon {
  font-size: 18px;
  color: #409eff;
  margin-right: 5px;
}
.announcement-list {
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.announcement-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
  transition: all 0.3s ease;
}
.announcement-item:hover {
  background-color: #e3f2fd;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.announcement-title-text {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.announcement-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}
.announcement-time {
  font-size: 11px;
  color: #999;
  text-align: right;
  margin-top: 4px;
}
.loading-tip, .no-more-tip {
  text-align: center;
  font-size: 12px;
  color: #999;
  padding: 8px;
}

@media screen and (max-width: 768px) {
  .announcement-card { padding: 16px; }
  .announcement-title { font-size: 14px; margin-bottom: 12px; padding-bottom: 8px; }
  .announcement-icon { font-size: 16px; }
  .announcement-list { gap: 10px; max-height: 240px; }
  .announcement-item { padding: 10px; }
  .announcement-title-text { font-size: 13px; }
  .announcement-description { font-size: 11px; }
  .announcement-time { font-size: 10px; }
}

@media screen and (max-width: 480px) {
  .announcement-card { padding: 12px; }
  .announcement-title { font-size: 13px; }
  .announcement-icon { font-size: 14px; }
  .announcement-list { gap: 8px; max-height: 200px; }
  .announcement-item { padding: 8px; }
  .announcement-title-text { font-size: 12px; }
  .announcement-description { font-size: 10px; }
  .announcement-time { font-size: 9px; }
}

@media screen and (max-width: 374px) {
  .announcement-card { padding: 10px; }
  .announcement-title { font-size: 12px; margin-bottom: 8px; padding-bottom: 6px; }
  .announcement-icon { font-size: 12px; margin-right: 3px; }
  .announcement-list { gap: 6px; max-height: 180px; }
  .announcement-item { padding: 6px; border-left-width: 3px; }
  .announcement-title-text { font-size: 11px; }
  .announcement-description { font-size: 10px; line-height: 1.3; }
  .announcement-time { font-size: 9px; }
}

@media screen and (max-width: 896px) and (orientation: landscape) {
  .announcement-list { max-height: 150px; }
}
</style>

