<template>
  <div class="map-page">
    <div class="header">
      <h2>太原理工大学明向校区 - 流浪宠物救助地图</h2>
    </div>
    
    <div id="map" class="map-container"></div>

    <button class="add-btn" @click="startAddPoint">新增救助点</button>
    

    <div class="add-form" v-if="isAdding">
      <div class="form-header">
        <h3>新增救助点信息</h3>
      </div>
      <div class="form-content">
        <div class="form-item">
          <label class="form-label">点位名称：</label>
          <input v-model="addForm.name" class="form-input" placeholder="例如：图书馆南侧投喂点" />
        </div>
        <div class="form-item">
          <label class="form-label">详细地址：</label>
          <input v-model="addForm.address" class="form-input" placeholder="例如：明向校区图书馆南门林荫道" />
        </div>
        <div class="form-item">
          <label class="form-label">点位描述：</label>
          <textarea v-model="addForm.desc" class="form-textarea" placeholder="例如：流浪猫聚集点，防水猫屋，专人维护"></textarea>
        </div>
        <div class="form-item">
          <label class="form-label">提供物资：</label>
          <input v-model="addForm.food" class="form-input" placeholder="例如：猫粮、纯净水、罐头" />
        </div>
        <div class="form-item">
          <label class="form-label">联系人：</label>
          <input v-model="addForm.contact" class="form-input" placeholder="例如：动保协会-小张" />
        </div>
        <div class="form-item">
          <label class="form-label">经纬度：</label>
          <input 
            :value="addForm.position.join(',')" 
            class="form-input readonly-input" 
            readonly 
            placeholder="点击地图任意位置自动获取" 
          />
        </div>
      </div>
      <div class="form-footer">
        <button class="btn confirm-btn" @click="submitAddPoint">确认新增</button>
        <button class="btn cancel-btn" @click="cancelAddPoint">取消</button>
      </div>
    </div>
    
    <div class="info-card" v-if="currentPoint">
      <div class="info-header">
        <h3>{{ currentPoint.name }}</h3>
        <span class="info-close" @click="currentPoint = null">×</span>
      </div>
      <div class="info-body">
        <div class="info-item">
          <span class="info-label">详细地址：</span>
          <span class="info-value">{{ currentPoint.address }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">点位描述：</span>
          <span class="info-value">{{ currentPoint.desc || '无' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">提供物资：</span>
          <span class="info-value">{{ currentPoint.food || '无' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">联系人：</span>
          <span class="info-value">{{ currentPoint.contact || '无' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">经纬度：</span>
          <span class="info-value">{{ currentPoint.position?.join(',') || '无' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">创建时间：</span>
          <span class="info-value">{{ currentPoint.createTime }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import service from '../components/request.ts'

// ==================== 1. 核心变量 ====================
const KEY = 'cb1812a81faf359cc2c1e64b5d856817'
const feedingPoints = ref([]) // 救助点数据
const currentPoint = ref(null) // 当前选中的点
let map = null 
let markerList = []

// 新增表单状态
const isAdding = ref(false)
const addForm = ref({
  name: '',
  address: '',
  desc: '',
  food: '',
  contact: '',
  position: [] 
})

// ==================== 3. 地图标记渲染与数据获取 ====================
// 渲染地图标记
const renderMarkers = () => {
  if (!map) return
  // 清空旧标记
  markerList.forEach(marker => marker.setMap(null))
  markerList = []
  // 渲染新标记
  feedingPoints.value.forEach(point => {
    const marker = new window.AMap.Marker({
      position: point.position,
      map: map,
      title: point.name,
      anchor: 'bottom-center'
    })
    marker.on('click', () => currentPoint.value = point)
    markerList.push(marker)
  })
}

// 获取救助点数据
const getPoints = async () => { 
  try { 
    const res = await service.get('/api/points')
    if (res.data.success) feedingPoints.value = res.data.data
    renderMarkers() // 获取数据后渲染标记
  } catch (error) {
    alert('获取数据失败：' + error.message)
  }
}

// ==================== 4. 地图初始化与事件处理 ====================
// 地图点击处理函数
const handleMapClick = (e) => {
  if (isAdding.value) {
    addForm.value.position = [e.lnglat.lng.toFixed(6), e.lnglat.lat.toFixed(6)]
  }
}

// 初始化地图
const initMap = async () => {
  await AMapLoader.load({ 
    key: KEY, 
    version: '2.0',
    plugins: ['AMap.Marker']
  })
  // 创建地图实例
  map = new window.AMap.Map('map', {
    zoom: 16,
    center: [112.72095, 37.749268],
    resizeEnable: true,
    showLabel: true,
    mapStyle: 'amap://styles/normal'
  })
  // 绑定地图点击事件
  map.on('click', handleMapClick)
  // 获取后端数据
  getPoints()
}

// ==================== 5. 新增表单相关操作 ====================
const startAddPoint = () => {
  isAdding.value = true
  addForm.value = { name: '', address: '', desc: '', food: '', contact: '', position: [] } 
}

const cancelAddPoint = () => {
  isAdding.value = false
  currentPoint.value = null 
}

const submitAddPoint = async () => { 
  if (!addForm.value.name || !addForm.value.address) {
    alert('点位名称、详细地址为必填项！')
    return
  }
  if (!addForm.value.position || addForm.value.position.length !== 2) {
    alert('请先点击地图选择经纬度！')
    return
  }
  
  try { 
    const [lng, lat] = addForm.value.position.map(Number)
    const submitData = {
      name: addForm.value.name,
      address: addForm.value.address,
      desc: addForm.value.desc || '',
      food: addForm.value.food || '',
      contact: addForm.value.contact || '',
      lng: lng,
      lat: lat
    }
    console.log('发送数据:', submitData)
    
    const response = await service.post('/api/points', submitData)
    console.log('响应数据:', response.data)
    alert('新增救助点成功！')
    getPoints()
    cancelAddPoint()
  } catch (error) {
    console.error('新增失败:', error)
    if (error.response) {
      alert(`新增失败：${error.response.data?.msg || error.message}`)
    } else {
      alert('新增失败：' + error.message)
    }
  }
}

// ==================== 6. 生命周期 ====================
onMounted(() => initMap())
</script>

<style scoped>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 页面容器 */
.map-page {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #f8f9fa;
  overflow: hidden;
}

/* 标题头部 */
.header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding: 15px 20px;
  background-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 9;
}

.header h2 {
  font-size: 18px;
  color: #333;
  font-weight: 600;
  text-align: center;
}


.map-container {
  width: 100%;
  height: 100%;
  z-index: 1;
}

.add-btn {
  position: absolute;
  top: 70px;
  left: 20px;
  padding: 10px 20px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  z-index: 10;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.add-btn:hover {
  background: #66b1ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
}

.add-form {
  position: absolute;
  top: 70px;
  left: 20px;
  width: 350px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 10;
  overflow: hidden;
  animation: fadeIn 0.3s ease;
}

/* 表单头部 */
.form-header {
  padding: 12px 20px;
  background-color: #409eff;
  color: white;
}

.form-header h3 {
  font-size: 16px;
  font-weight: 500;
}

/* 表单内容 */
.form-content {
  padding: 20px;
}

.form-item {
  margin-bottom: 15px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  font-size: 14px;
  color: #666;
  transition: border-color 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  font-size: 14px;
  color: #666;
  min-height: 80px;
  resize: none;
  transition: border-color 0.3s ease;
}

.form-textarea:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.readonly-input {
  background-color: #f5f7fa;
  color: #909399;
  cursor: not-allowed;
}

/* 表单底部按钮 */
.form-footer {
  padding: 12px 20px;
  background-color: #f5f7fa;
  display: flex;
  gap: 10px;
}

.btn {
  flex: 1;
  padding: 10px 0;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.confirm-btn {
  background-color: #409eff;
  color: white;
}

.confirm-btn:hover {
  background-color: #66b1ff;
}

.cancel-btn {
  background-color: #f5f7fa;
  color: #666;
  border: 1px solid #e6e6e6;
}

.cancel-btn:hover {
  background-color: #e5e9f2;
}

/* 详情卡片样式 */
.info-card {
  position: absolute;
  top: 70px;
  right: 20px;
  width: 350px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 10;
  overflow: hidden;
  animation: fadeIn 0.3s ease;
}

/* 详情头部 */
.info-header {
  padding: 12px 20px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-header h3 {
  font-size: 16px;
  color: #333;
  font-weight: 600;
}

.info-close {
  font-size: 20px;
  color: #909399;
  cursor: pointer;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.info-close:hover {
  background-color: #e5e9f2;
  color: #666;
}

.info-body {
  padding: 20px;
}

.info-item {
  display: flex;
  margin-bottom: 12px;
  font-size: 14px;
}

.info-label {
  width: 80px;
  color: #909399;
  font-weight: 500;
}

.info-value {
  flex: 1;
  color: #333;
  word-break: break-all;
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式适配 */
@media (max-width: 768px) {
  .add-form, .info-card {
    width: calc(100% - 40px);
    left: 20px;
    right: 20px;
  }
  
  .info-card {
    top: auto;
    bottom: 20px;
  }
}
</style>