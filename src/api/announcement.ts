/**
 * 系统公告与校园论坛管理接口
 */
import service from '../components/request'
import type { ApiResponse, PageResult, PageParams } from './types'

export interface AnnouncementFormData {
  title: string
  description: string
  time?: string
  author?: string
  [key: string]: any
}

export interface AnnouncementItem extends AnnouncementFormData {
  id: number
  time: string
  author: string
}

export interface ForumPostItem {
  id: number
  author: string
  studentNo: string
  title: string
  description: string
  createTime: string
  viewCount: number
  likeCount: number
  commentCount?: number
  [key: string]: any
}

export interface ForumCommentItem {
  id: number
  postId: number
  authorName: string
  studentNo: string
  content: string
  time: string
  [key: string]: any
}

/**
 * 分页查询系统公告列表
 */
export function getAnnouncementsApi(params?: PageParams) {
  return service.get<ApiResponse<PageResult<AnnouncementItem>>>('/api/announcements', { params })
}

/**
 * 发布系统公告
 */
export function createAnnouncementApi(data: AnnouncementFormData) {
  return service.post<ApiResponse<{ id: number }>>('/api/announcements', data)
}

/**
 * 修改系统公告
 */
export function updateAnnouncementApi(id: number | string, data: AnnouncementFormData) {
  return service.put<ApiResponse<null>>(`/api/announcements/${id}`, data)
}

/**
 * 删除系统公告
 */
export function deleteAnnouncementApi(id: number | string) {
  return service.delete<ApiResponse<null>>(`/api/announcements/${id}`)
}

/**
 * 分页查询学生社区论坛帖子
 */
export function getStudentForumApi(params?: PageParams) {
  return service.get<ApiResponse<PageResult<ForumPostItem>>>('/api/student/forum', { params })
}

/**
 * 管理员/作者删除论坛帖子
 */
export function deleteStudentForumApi(id: number | string) {
  return service.delete<ApiResponse<null>>(`/api/student/forum/${id}`)
}

/**
 * 获取指定帖子的评论列表
 */
export function getStudentForumCommentsApi(postId: number | string, params?: PageParams) {
  return service.get<ApiResponse<ForumCommentItem[]>>(`/api/student/forum/${postId}/comments`, { params })
}

/**
 * 删除指定评论
 */
export function deleteStudentForumCommentApi(id: number | string) {
  return service.delete<ApiResponse<null>>(`/api/student/forum/comments/${id}`)
}

