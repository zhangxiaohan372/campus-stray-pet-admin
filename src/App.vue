<template>
  <router-view />
  <FloatAIQA v-if="route.name !== 'login'" />
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router'
import FloatAIQA from './components/FloatAIQA.vue'

const route = useRoute()
</script>

<style>
html, body, #app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  overflow: auto;
}
</style>