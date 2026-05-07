<template>
  <div class="main" style="position: relative; min-height: 600px;">
    <div class="header">
      <div class="text">
        <h2 class="title">小狗信息管理</h2>
      </div>
      <div class="header-actions">
        <SearchFilterBar
          v-model="searchKeyword"
          placeholder="搜索小狗信息"
          clearable
          :prefix-icon="Search"
          @search="handleSearch"
          :debounce-time="1000"
          style="width: 280px;"
        />
        
        <el-button 
          size="default" 
          style="margin-left: 8px;"
          @click="handleReset"
        >
          <el-icon><Refresh /></el-icon>
          重置筛选
        </el-button>
        
        <el-button type="primary" size="default" style="margin-left: 16px;" @click="openDialog('add')">
          <el-icon><Plus /></el-icon>
          添加小狗信息
        </el-button>
        
        <el-select 
          v-model="healthFilter"
          placeholder="筛选健康状态" 
          size="default" 
          style="margin-left: 16px; width: 180px;"
          @change="handleFilter"
        >
          <el-option label="全部" value="all" />
          <el-option label="健康" value="normal" />
          <el-option label="需要关注" value="attention" />
          <el-option label="紧急" value="emergency" />
          <el-option label="已离世" value="dead" />
        </el-select>
      </div>
    </div>

    <div class="table-container" style="position: relative; min-height: 400px;">
      <TableCard
        :table-data="tableData"
        :columns="columnsData"
        :loading="loading"
        :show-operate="true"
      >
        <!-- 健康状况列 -->
        <template #health="scope">
          <div class="health-status">
            <StatusTag :status="scope.row.healthStatus || 'normal'" size="small" />
            {{ scope.row.health || '暂无健康信息' }}
          </div>
        </template>

        <!-- 图片列 -->
        <template #imageUrl="scope">
          <div class="image-cell">
            <el-image
              v-if="scope.row.imageUrl"
              :src="scope.row.imageUrl"
              fit="cover"
              style="width: 80px; height: 80px; border-radius: 4px;"
            />
            <div v-else class="default-image">
              暂无
            </div>
          </div>
        </template>

        <!-- 操作列 -->
        <template #operate="scope">
          <el-button
            type="primary"
            size="small"
            @click="openDialog('edit', scope.row as DogInfo)"
            class="edit-btn"
            :disabled="(scope.row as DogInfo).healthStatus === 'dead'"
          >
            {{ (scope.row as DogInfo).healthStatus === 'dead' ? '已离世' : '编辑' }}
          </el-button>
        </template>
      </TableCard>
    </div>

    <Pagination
      :total="total"
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
    />

    <!-- 弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="550"
      :before-close="handleClose"
    >
      <el-form 
        ref="formRef" 
        :model="dogForm" 
        label-width="120px" 
        class="dog-form"
        :rules="formRules"
      >
        <el-form-item label="小狗名字" prop="name">
          <el-input v-model="dogForm.name" placeholder="请输入小狗昵称" clearable />
        </el-form-item>
        <el-form-item label="小狗年龄" prop="age">
          <el-input v-model="dogForm.age" placeholder="例：6个月 / 1岁" clearable />
        </el-form-item>
        <el-form-item label="小狗品种" prop="breed">
          <el-input v-model="dogForm.breed" placeholder="例：中华田园犬 / 金毛" clearable />
        </el-form-item>
        <el-form-item label="健康状态" prop="healthStatus">
          <el-select v-model="dogForm.healthStatus" placeholder="请选择健康状态" clearable>
            <el-option label="健康" value="normal" />
            <el-option label="需要关注" value="attention" />
            <el-option label="紧急" value="emergency" />
            <el-option label="已离世" value="dead" />
          </el-select>
        </el-form-item>
        <el-form-item label="健康状况" prop="health">
          <el-input v-model="dogForm.health" placeholder="例：已绝育/轻微外伤/健康" clearable />
        </el-form-item>
        <el-form-item label="活动区域" prop="area">
          <el-input v-model="dogForm.area" placeholder="例：一号教学楼旁 / 食堂后门" clearable />
        </el-form-item>
        <el-form-item label="发现时间" prop="foundTime">
          <el-date-picker
            v-model="dogForm.foundTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择发现时间"
            clearable
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="离世时间" prop="deadTime">
          <el-date-picker
            v-model="dogForm.deadTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择离世时间"
            clearable
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="小狗照片">
          <el-upload
            class="avatar-uploader"
            :action="uploadUrl"
            :headers="{ Authorization: 'Bearer ' + (userStore.userInfo?.token || '') }"
            :show-file-list="false"
            :on-success="handleImageUploadSuccess"
            :on-error="handleImageUploadError"
            :before-upload="beforeImageUpload"
            name="image"
          >
            <img v-if="dogForm.imageUrl" :src="dogForm.imageUrl" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitDogInfo">
            {{ dialogMode === 'add' ? '确认新增' : '确认修改' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessageBox, ElMessage, ElNotification } from 'element-plus' 
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import service from '../components/request.ts'
import Pagination from '../components/Pagination.vue'
import StatusTag from '../components/StatusTag.vue'
import TableCard from '../components/TableCard.vue'
import SearchFilterBar from '../components/SearchFilterBar.vue'
import { useUserStore } from '../stores/user.ts'

const userStore = useUserStore()

// 最小加载时长函数
const minLoadingTime = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 定义小狗信息接口
interface DogInfo {
  id: number 
  name: string
  age: string
  breed: string
  health: string
  healthStatus: 'normal' | 'emergency' | 'attention' | 'dead'
  area: string
  foundTime?: string
  deadTime?: string
  imageUrl?: string
}

// 初始化表单
const dogForm = ref<DogInfo>({     
  id: 0,
  name: '',
  age: '',
  breed: '',
  health: '',
  healthStatus: 'normal',
  area: '',
  foundTime: '',
  deadTime: '',
  imageUrl: '',
})

const loading = ref(false)
const searchKeyword = ref('')
const healthFilter = ref('all')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const uploadUrl = ref('http://47.93.227.166:3001/api/upload/image')

// 表格数据（后端分页返回的当前页数据）
const tableData = ref<DogInfo[]>([])

// 表格列配置
const columnsData = ref([
  { prop: 'imageUrl', label: '照片', width: '120' },
  { prop: 'name', label: '名字', width: '180' },
  { prop: 'age', label: '年龄', width: '120' },
  { prop: 'breed', label: '品种', width: '150' },
  { prop: 'health', label: '健康状况', minWidth: '200' }, 
  { prop: 'area', label: '经常活动区域', width: '180' }
])

// 核心变量
const dialogMode = ref<'add' | 'edit'>('add')
const editId = ref<number | null>(null)
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()

// 弹窗标题
const dialogTitle = computed(() => {
  return dialogMode.value === 'add' ? '新增流浪狗救助信息' : '编辑流浪狗救助信息'
})

// ===================== 数据请求 =====================
const getDogList = async () => { 
  loading.value = true
  try { 
    const params: any = {
      page: currentPage.value,
      pageSize: pageSize.value,
    }
    if (searchKeyword.value.trim()) {
      params.keyword = searchKeyword.value.trim()
    }
    if (healthFilter.value !== 'all') {
      params.healthStatus = healthFilter.value
    }

    const [response] = await Promise.all([
      service.get('/api/dogs', { params }),
      minLoadingTime(300)
    ])

    if (response.data.success) { 
      tableData.value = response.data.data.list || []
      total.value = response.data.data.total || 0
    } else { 
      ElMessage.error('获取小狗信息失败：' + (response.data.msg || '未知错误'))
    }
  } catch (err: any) { 
    ElMessage.error('获取小狗信息失败，请检查后端是否启动')
    console.error('查询小狗列表出错：', err)
  } finally {
    loading.value = false
  }
}

watch([currentPage, pageSize, healthFilter], () => {
  getDogList()
})

// ===================== 搜索/筛选 =====================
const handleSearch = (keyword: string) => {
  searchKeyword.value = keyword.trim()
  currentPage.value = 1
  getDogList()
}

const handleReset = () => {
  searchKeyword.value = ''
  healthFilter.value = 'all'
  currentPage.value = 1
  getDogList()
  ElMessage.info('已重置搜索条件')
}

const handleFilter = () => {
  currentPage.value = 1
}

// ===================== 弹窗操作 =====================
const openDialog = (mode: 'add' | 'edit', row?: DogInfo) => {
  dialogMode.value = mode
  formRef.value?.clearValidate()
  
  if (mode === 'edit' && row) {
    editId.value = row.id!
    dogForm.value = { 
      ...row,
      foundTime: row.foundTime || new Date().toISOString().slice(0, 19).replace('T', ' '),
      imageUrl: row.imageUrl || ''
    }
  } else {
    editId.value = null
    resetDogForm() 
  }
  dialogVisible.value = true
}

const resetDogForm = () => {
  dogForm.value = {
    id: 0,
    name: '', 
    age: '', 
    breed: '', 
    health: '', 
    healthStatus: 'normal', 
    area: '',
    foundTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
    deadTime: '',
    imageUrl: '',
  }
  formRef.value?.clearValidate()
}

const handleClose = async (done: () => void) => {
  try {
    await ElMessageBox.confirm(
      '确定关闭？未保存内容将丢失',
      '提示',
      {
        center: true,
        type: 'warning',
        customClass: 'custom-message-box'
      }
    )
    resetDogForm()
    done()
  } catch {
    ElMessage.info('已取消')
    done()
  }
}

// ===================== 表单校验 =====================
const formRules = ref<FormRules>({
  name: [{ required: true, message: '小狗名字不能为空哦~', trigger: 'blur' }],
  age: [{ required: true, message: '请填写小狗年龄（如：6个月/1岁）', trigger: 'blur' }],
  breed: [{ required: true, message: '请输入小狗品种', trigger: 'blur' }],
  healthStatus: [{ required: true, message: '请选择健康状态', trigger: 'blur' }],
  health: [{ required: true, message: '请输入健康状况详情', trigger: 'blur' }],
  area: [{ required: true, message: '请输入经常活动区域', trigger: 'blur' }],
  foundTime: [{ required: true, message: '请选择发现时间', trigger: 'change' }],
  deadTime: [
    {
      validator: (rule, value, callback) => {
        if (dogForm.value.healthStatus === 'dead' && !value) {
          callback(new Error('离世时间不能为空'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
})

// ===================== 提交表单 =====================
const submitDogInfo = () => {
  formRef.value?.validate(async (valid) => {
    if (valid) {
      if (dialogMode.value === 'edit' && !editId.value) {
        ElMessage.error('编辑失败：未获取到小狗ID，请刷新页面重试')
        return
      }

      loading.value = true
      try {
        const submitData = { ...dogForm.value }

        const [res] = await Promise.all([
          dialogMode.value === 'add' 
            ? service.post('/api/dogs', submitData)
            : service.put(`/api/dogs/${editId.value}`, submitData),
          minLoadingTime(500)
        ])

        if (res.data.success) {
          const tip = dialogMode.value === 'add' ? '添加' : '更新'
          ElNotification.success(`成功${tip}小狗信息！`)
          getDogList()
          dialogVisible.value = false
          resetDogForm()
        } else {
          ElMessage.error(`操作失败：${res.data.msg || '后端返回未知错误'}`)
        }
      } catch (err: any) {
        console.error('提交小狗信息失败详情：', err)
        if (err.response) {
          const errMsg = err.response.data?.msg || `请求失败（状态码：${err.response.status}）`
          ElMessage.error(`操作失败：${errMsg}`)
        } else if (err.request) {
          ElMessage.error('操作失败：无法连接到后端服务器，请检查后端是否启动（http://localhost:3001）')
        } else {
          ElMessage.error(`操作失败：${err.message}`)
        }
      } finally {
        loading.value = false
      }
    } else { 
      ElMessage.error('请完善表单信息后再提交')
    }
  })
}

// ===================== 图片上传 =====================
const handleImageUploadSuccess = (response: any) => {
  if (response.success) {
    dogForm.value.imageUrl = response.data.imageUrl
    ElMessage.success('图片上传成功！')
  } else {
    ElMessage.error('图片上传失败：' + response.msg)
  }
}

const handleImageUploadError = (error: any) => {
  ElMessage.error('图片上传失败，请重试')
  console.error('上传失败：', error)
}

const beforeImageUpload = (file: File) => {
  const isImage = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/jpg'
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传 JPG/PNG 图片！')
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB！')
  }
  return isImage && isLt5M
}

onMounted(() => {
  getDogList()
})
</script>

<style lang="scss" scoped>

.main {
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
  
  .title {
    margin: 0;
    color: #333;
    font-size: 18px;
    font-weight: 600;
    padding-left: 8px;
    border-left: 4px solid #409eff;
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
}

.table-container {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
  position: relative;
  min-height: 400px;
}

.pagination {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  text-align: right;
}

.health-status {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.edit-btn {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 13px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
  }
  
  &:disabled {
    background-color: #ccc;
    border-color: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
}

@media (max-width: 768px) {
  .main {
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
  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
  .table-container {
    padding: 16px;
  }
  .pagination {
    padding: 12px 16px;
    text-align: left;
  }
  .el-input {
    width: 100% !important;
  }
  ::v-deep .custom-message-box {
    width: 90% !important;
  }
}

@media (max-width: 480px) {
  .main {
    padding: 8px;
  }
  .header {
    padding: 12px;
  }
  .header .title {
    font-size: 14px;
  }
  .table-container {
    padding: 12px;
  }
  .pagination {
    padding: 8px 12px;
  }
}

.avatar-uploader {
  .avatar {
    width: 178px;
    height: 178px;
    display: block;
  }
  .avatar-uploader-icon {
    width: 178px;
    height: 178px;
    font-size: 24px;
    color: #999;
  }
}

.image-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.default-image {
  width: 80px;
  height: 80px;
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #999;
}
</style>