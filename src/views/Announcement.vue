<template>
  <div class="announcement-page">
    <div class="header">
      <h2 class="title">公告管理</h2>
      <div class="header-actions">
        <el-button type="primary" size="default" @click="openDialog('add')">
          <el-icon><Plus /></el-icon>
          发布公告
        </el-button>
      </div>
    </div>

    <div class="category-tabs" style="position: relative;">
      <BaseLoading :loading="loading" />
      <el-tabs v-model="activeTab" @tab-click="handleTabClick">
        <!-- 我发布的公告（管理员） -->
        <el-tab-pane label="我发布的" name="my">
          <div class="announcement-list">
            <div v-for="item in myAnnouncementsList" :key="item.id" class="announcement-card">
              <div class="announcement-header">
                <h3 class="announcement-title">{{ item.title }}</h3>
                <span class="announcement-time">{{ item.time }}</span>
              </div>
              <div class="announcement-content">{{ item.description }}</div>
              <div class="announcement-footer">
                <span class="announcement-author">{{ item.author }}</span>
                <div class="announcement-actions">
                  <el-button type="primary" size="small" @click="openDialog('edit', item)">编辑</el-button>
                  <el-button type="danger" size="small" @click="deleteAnnouncement(item.id)">删除</el-button>
                </div>
              </div>
            </div>
          </div>
          <div class="pagination-container">
            <Pagination
              :total="myTotal"
              v-model:page-size="myPageSize"
              v-model:current-page="myCurrentPage"
            />
          </div>
        </el-tab-pane>

        <!-- 学生论坛 -->
        <el-tab-pane label="学生论坛" name="forum">
          <div class="announcement-list">
            <div v-for="item in forumList" :key="item.id" class="announcement-card forum-card">
              <div class="announcement-header">
                <h3 class="announcement-title">{{ item.title }}</h3>
                <span class="announcement-time">{{ item.createTime }}</span>
              </div>
              <div class="announcement-content">{{ item.description }}</div>
              <div class="announcement-footer">
                <span class="announcement-type">学生发布</span>
                <span class="announcement-author">{{ item.author }}</span>
                <div class="post-stats">
                  <span class="view-count">浏览：{{ item.viewCount || 0 }}</span>
                  <span class="like-count">点赞：{{ item.likeCount || 0 }}</span>
                </div>
                <div class="forum-actions">
                  <el-button size="small" @click="viewForumPost(item)">查看详情</el-button>
                  <el-button size="small" type="danger" @click="deleteStuForum(item.id)">删除</el-button>
                </div>
              </div>
            </div>
          </div>
          <div class="pagination-container">
            <Pagination
              :total="forumTotal"
              v-model:page-size="forumPageSize"
              v-model:current-page="forumCurrentPage"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 发布/编辑公告弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600" :before-close="handleClose">
      <el-form ref="formRef" :model="announcementForm" label-width="100px" :rules="formRules">
        <el-form-item label="公告标题" prop="title">
          <el-input v-model="announcementForm.title" placeholder="请输入公告标题" clearable />
        </el-form-item>
        <el-form-item label="公告内容" prop="description">
          <el-input v-model="announcementForm.description" type="textarea" rows="5" placeholder="请输入公告内容" clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitAnnouncement">{{ dialogMode === 'add' ? '发布' : '更新' }}</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 帖子详情弹窗 -->
    <el-dialog v-model="postDetailVisible" title="帖子详情" width="800px" :before-close="handlePostDetailClose">
      <div class="post-detail">
        <h3 class="post-title">{{ currentPost.title }}</h3>
        <div class="post-meta">
          <span class="post-author">{{ currentPost.author }}</span>
          <span class="post-time">{{ currentPost.createTime }}</span>
          <span class="post-view-count">浏览：{{ currentPost.viewCount || 0 }}</span>
          <span class="post-like-count">点赞：{{ currentPost.likeCount || 0 }}</span>
        </div>
        <div class="post-content">{{ currentPost.description }}</div>
      </div>
      <div class="comments-section">
        <h4 class="comments-title">评论列表</h4>
        <div class="comments-list">
          <el-empty v-if="comments.length === 0" description="暂无评论" :image-size="100" />
          <div v-else v-for="comment in comments" :key="comment.id" class="comment-item">
            <div class="comment-header">
              <span class="comment-author">{{ comment.authorName }}</span>
              <span class="comment-time">{{ comment.time }}</span>
            </div>
            <div class="comment-content">{{ comment.content }}</div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessageBox, ElMessage, ElNotification } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import service from '../components/request.ts'
import Pagination from '../components/Pagination.vue'
import BaseLoading from '../components/BaseLoading.vue'
import { useUserStore } from '../stores/user.ts'

const userStore = useUserStore()

const minLoadingTime = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// ==================== 类型定义 ====================
interface Announcement {
  id: number
  title: string
  description: string
  time: string
  author: string
}

interface ForumPost {
  id: number
  title: string
  description: string
  createTime: string
  author: string
  viewCount: number
  likeCount: number
}

interface Comment {
  id: number
  postId: number
  content: string
  authorName: string
  time: string
}

// ==================== 数据状态 ====================
// 我的公告
const myAnnouncementsList = ref<Announcement[]>([])
const myCurrentPage = ref(1)
const myPageSize = ref(10)
const myTotal = ref(0)

// 学生论坛
const forumList = ref<ForumPost[]>([])
const forumCurrentPage = ref(1)
const forumPageSize = ref(10)
const forumTotal = ref(0)

const activeTab = ref('my')
const loading = ref(false)

// 弹窗相关
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editId = ref<number | null>(null)
const formRef = ref<FormInstance>()

// 帖子详情
const postDetailVisible = ref(false)
const currentPost = ref<ForumPost>({
  id: 0,
  title: '',
  description: '',
  createTime: '',
  author: '',
  viewCount: 0,
  likeCount: 0
})
const comments = ref<Comment[]>([])

const dialogTitle = computed(() => (dialogMode.value === 'add' ? '发布公告' : '编辑公告'))

const announcementForm = ref<Announcement>({
  id: 0,
  title: '',
  description: '',
  time: '',
  author: '管理员'
})

const formRules: FormRules = {
  title: [{ required: true, message: '公告标题不能为空', trigger: 'blur' }],
  description: [{ required: true, message: '公告内容不能为空', trigger: 'blur' }]
}

// ==================== 数据请求（完全模仿 cats.vue） ====================
const fetchMyAnnouncements = async () => {
  loading.value = true
  try {
    const [res] = await Promise.all([
      service.get('/api/announcements', {
        params: {
          page: myCurrentPage.value,
          pageSize: myPageSize.value
        }
      }),
      minLoadingTime(300)
    ])
    if (res.data.success) {
      myAnnouncementsList.value = res.data.data.list || []
      myTotal.value = res.data.data.total || 0
    } else {
      ElMessage.error(res.data.msg || '获取公告失败')
      myAnnouncementsList.value = []
      myTotal.value = 0
    }
  } catch (error) {
    console.error('获取公告失败:', error)
    ElMessage.error('获取公告数据失败，请重试')
    myAnnouncementsList.value = []
    myTotal.value = 0
  } finally {
    loading.value = false
  }
}

const fetchForumList = async () => {
  loading.value = true
  try {
    const [res] = await Promise.all([
      service.get('/api/student/forum', {
        params: {
          page: forumCurrentPage.value,
          pageSize: forumPageSize.value
        }
      }),
      minLoadingTime(300)
    ])
    if (res.data.success) {
      forumList.value = res.data.data.list || []
      forumTotal.value = res.data.data.total || 0
    } else {
      ElMessage.error(res.data.msg || '获取论坛帖子失败')
      forumList.value = []
      forumTotal.value = 0
    }
  } catch (error) {
    console.error('获取论坛帖子失败:', error)
    ElMessage.error('获取论坛数据失败，请重试')
    forumList.value = []
    forumTotal.value = 0
  } finally {
    loading.value = false
  }
}

// ==================== 监听分页变化（核心：保证翻页自动请求） ====================
watch([myCurrentPage, myPageSize], () => {
  fetchMyAnnouncements()
})

watch([forumCurrentPage, forumPageSize], () => {
  fetchForumList()
})

// ==================== 标签切换 ====================
const handleTabClick = () => {
  // 首次切换到某个标签时，如果还没有数据则加载
  if (activeTab.value === 'my' && myAnnouncementsList.value.length === 0) {
    fetchMyAnnouncements()
  } else if (activeTab.value === 'forum' && forumList.value.length === 0) {
    fetchForumList()
  }
}

// ==================== 公告表单操作 ====================
const openDialog = (mode: 'add' | 'edit', row?: Announcement) => {
  dialogMode.value = mode
  formRef.value?.clearValidate()
  if (mode === 'edit' && row) {
    editId.value = row.id
    announcementForm.value = { ...row }
  } else {
    editId.value = null
    resetForm()
  }
  dialogVisible.value = true
}

const resetForm = () => {
  announcementForm.value = {
    id: 0,
    title: '',
    description: '',
    time: '',
    author: '管理员'
  }
  formRef.value?.clearValidate()
}


const submitAnnouncement = () => {
  formRef.value?.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        if (dialogMode.value === 'add') { 
          await service.post('/api/announcements', announcementForm.value)
          ElMessage.success('公告发布成功！')
        } else if (dialogMode.value === 'edit' && editId.value) {
          await service.put(`/api/announcements/${editId.value}`, announcementForm.value)
          ElMessage.success('公告更新成功！')
        }
       } catch (e) { 
        ElMessage.error('提交失败，请重试')
        console.error('提交公告失败：', e)
      }
    } else { 
      ElMessage.error('请完善表单信息后再提交')
    }
  })
}
const handleClose = async(done: () => void) => { 
  try {
    await ElMessageBox.confirm('确定要关闭吗？', '提示', { center: true, type: 'warning' })
    done()
  } catch (e) { 
    ElMessage.info('已取消')
    done()
  }
}
const deleteAnnouncement = async (id: number) => {
  try {
    await ElMessageBox.confirm('此操作将永久删除该公告，是否继续？', '提示', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
      center: true
    })
    await service.delete(`/api/announcements/${id}`)
    ElMessage.success('公告删除成功！')
    await fetchMyAnnouncements()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除公告失败：', error)
      ElMessage.error('删除失败')
    }
  }
}

// ==================== 论坛帖子操作 ====================
const deleteStuForum = async (id: number) => {
  try {
    await ElMessageBox.confirm('此操作将永久删除该帖子，是否继续？', '提示', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
      center: true
    })
    await service.delete(`/api/student/forum/${id}`)
    ElMessage.success('删除成功')
    await fetchForumList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除帖子失败：', error)
      ElMessage.error('删除失败')
    }
  }
}

const viewForumPost = (post: ForumPost) => {
  currentPost.value = { ...post }
  fetchComments(post.id)
  postDetailVisible.value = true
}

const fetchComments = async (postId: number) => {
  try {
    const res = await service.get(`/api/student/forum/${postId}/comments`, {
      headers: { Authorization: `Bearer ${userStore.userInfo?.token || ''}` }
    })
    comments.value = Array.isArray(res.data.data) ? res.data.data : []
  } catch (e) {
    console.error('获取评论失败：', e)
    comments.value = []
    ElMessage.error('获取评论数据失败，请重试')
  }
}

const handlePostDetailClose = async (done: () => void) => {
  postDetailVisible.value = false
  comments.value = []
  done()
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchMyAnnouncements()
  fetchForumList()
})
</script>

<style scoped>
/* 样式代码保持不变（与之前相同，此处省略，请使用你原来提供的样式） */
.announcement-page {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 16px;
  min-height: calc(100vh - 80px);
  background-color: #f5f7fa;
}
.header {
  background-color: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header .title {
  margin: 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
  padding-left: 8px;
  border-left: 4px solid #409eff;
}
.category-tabs {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.announcement-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}
.announcement-card {
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
  transition: all 0.3s ease;
}
.announcement-card:hover {
  background-color: #e3f2fd;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.forum-card {
  border-left-color: #67c23a;
}
.forum-card:hover {
  background-color: #f0f9eb;
}
.announcement-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}
.announcement-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
  flex: 1;
  margin-right: 16px;
}
.announcement-time {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}
.announcement-content {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 12px;
}
.announcement-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #e9ecef;
  flex-wrap: wrap;
  gap: 8px;
}
.announcement-author {
  font-size: 12px;
  color: #666;
}
.announcement-type {
  font-size: 12px;
  color: #409eff;
  font-weight: 500;
}
.post-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
}
.post-stats .view-count,
.post-stats .like-count {
  display: flex;
  align-items: center;
  gap: 4px;
}
.announcement-actions,
.forum-actions {
  display: flex;
  gap: 8px;
}
.pagination-container {
  margin-top: 20px;
  text-align: right;
}
.post-detail {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e9ecef;
}
.post-detail .post-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px 0;
}
.post-detail .post-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.post-detail .post-meta span {
  font-size: 14px;
  color: #999;
}
.post-detail .post-content {
  font-size: 16px;
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
}
.comments-section .comments-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
}
.comments-list .comment-item {
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 12px;
}
.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}
.comment-author {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}
.comment-time {
  font-size: 12px;
  color: #999;
}
.comment-content {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}
@media (max-width: 768px) {
  .announcement-page {
    padding: 12px;
  }
  .header {
    padding: 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .header .title {
    font-size: 16px;
    padding-left: 6px;
    border-left-width: 3px;
  }
  .category-tabs {
    padding: 16px;
  }
  .announcement-card {
    padding: 16px;
  }
  .announcement-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .announcement-time {
    align-self: flex-end;
  }
  .announcement-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .announcement-actions,
  .forum-actions {
    align-self: flex-end;
  }
  .post-detail .post-title {
    font-size: 18px;
  }
  .post-detail .post-meta {
    flex-direction: column;
    gap: 4px;
  }
  .comments-list .comment-item {
    padding: 12px;
  }
}
</style>