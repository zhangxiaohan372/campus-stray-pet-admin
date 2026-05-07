<template>
    <div class="search-filter-bar">
        <div>
        <el-input
        v-model="innerValue"
        :placeholder="placeholder"
        clearable
        :prefix-icon="Search"
        /></div>
        <div class="filter-condition">
            <slot />
    </div>
    </div>
</template>

<script setup lang="ts">
import {computed,watch} from 'vue'
import { Search } from '@element-plus/icons-vue'
import { debounce} from '../components/debounce'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '请输入要查找的内容' },
  debounceTime: { type: Number, default: 1000 }
})

const emits = defineEmits < {
  (e: 'update:modelValue', value: string): void
  (e: 'search', value: string): void
  (e:'reset'):void
}>()

const innerValue = computed({
  get: () => props.modelValue,
  set:(val:string) => emits('update:modelValue',val)
})

const handleSearch = debounce((value: string) => { 
  emits('search',value)
}, props.debounceTime)

watch(innerValue, (newVal) => { 
  if (newVal) {
    handleSearch(newVal)
  } else { 
    emits('reset')
  }
})
</script>
<style scoped>
.search-filter-bar{
  display: flex;
  align-items: center;
  gap: 8px; 
}

.search-input {
  width: 300px; 
}

.search-btn-group {
  display: flex;
  gap: 8px;
}
</style>