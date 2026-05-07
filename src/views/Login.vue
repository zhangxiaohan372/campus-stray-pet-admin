<template> 
  <div class="login-container">
    <div class="text">
    <p class="school">太原理工大学</p>
    <p class="name">校园流浪动物管理系统</p>
  </div>
    <div class="login-card">
      <h2 class="login-title">欢迎回来!</h2>
      <el-form
        ref="elFormRef"
        :model="loginForm"
        :rules="rules"
        label-width="0"
        class="login-form"
      >
        <el-form-item prop="name">
          <el-input
            v-model="loginForm.name"
            placeholder="请输入管理员名称"
            :prefix-icon="User"
            size="large"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>
        <el-form-item class="login-btn-group">
          <el-button type="primary" @click="handleLogin" size="large" class="login-btn">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElForm, ElFormItem, ElInput, ElButton } from 'element-plus'
import { useUserStore } from '../stores/user'
import request from '../components/request'
import { Lock,User } from '@element-plus/icons-vue'
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const elFormRef = ref<InstanceType<typeof ElForm>>()
const loginForm = ref({
  name: '',
  password: ''
})

// 登录校验规则
const rules = ref({
  name: [{ required: true, message: '请输入管理员名称', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
})

// 登录处理函数
const handleLogin = async () => {
  // 1. 表单校验
  try {
    await elFormRef.value?.validate()
  } catch {
    ElMessage.error('请填写完整登录信息！')
    return
  }

  // 2. 调用登录接口
  try {
    const res = await request.post('/api/login', {
      name: loginForm.value.name,
      password: loginForm.value.password
    })

    if (res.data.success) {
      userStore.login(res.data.data) 
      ElMessage.success('登录成功！')
      
      // 跳转目标页
      const redirect = route.query.redirect 
        ? decodeURIComponent(route.query.redirect as string) 
        : '/'
      router.push(redirect)
    } else {
      ElMessage.error(res.data.msg || '登录失败')
    }
  } catch (err) {
    ElMessage.error('网络异常，请稍后重试')
    console.error('登录报错：', err)
  }
}
</script>
<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.login-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-image: url('../image/backgroundImage.png');
  background-size: cover;
  background-position: center;
  padding: 20px;
}
.text{
  padding-left: 50px;
  .school{
    font-size: 25px;
    padding-bottom: 15px;
  }
  .name{
    font-size: 80px;
  }
}
.login-card {
  width: 400px;
  max-width: 100%;
  padding: 40px 30px;
  background: white;
  border-radius: 16px;
  box-shadow:0 10px 20px rgba(128, 128, 128, 0.379);
  transition: all 0.3s;
  margin-right: 10%;
}

.login-title {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-weight: 500;
  font-size: 26px;
  letter-spacing: 1px;
  position: relative;
}

.login-form {
  margin-top: 20px;
}

.login-btn-group {
  margin-top: 30px;
  margin-bottom: 0;
}

.login-btn {
  width: 100%;
  font-size: 16px;
  letter-spacing: 1px;
  background: linear-gradient(90deg, #f3b2dd 0%, #9bc7ed 100%);
  border: none;
  transition: opacity 0.3s;
  height: 44px;
}

.login-btn:hover {
  opacity: 0.9;
}


.el-form-item:last-child {
  margin-bottom: 0;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .login-container {
    justify-content: center;
    flex-direction: column;
    padding: 16px;
    background-position: 30%;
  }
  .text{
    margin-bottom: 20px;
    .school{
      font-size: 20px;
      font-weight: 700;
    }
    .name{
      font-size: 35px;
      font-weight: 700;
    }
  }
  .login-card {
    width: 100%;
    margin-right: 0;
    padding: 30px 20px;
  }

  .login-title {
    font-size: 22px;
    margin-bottom: 20px;
  }

  .login-title::after {
    width: 40px;
  }

  .login-btn-group {
    margin-top: 24px;
  }
}

@media screen and (max-width: 375px) {
  .login-card {
    padding: 20px 16px;
  }
  .login-title {
    font-size: 20px;
  }
  .login-btn {
    font-size: 15px;
    height: 42px;
  }
}
</style>