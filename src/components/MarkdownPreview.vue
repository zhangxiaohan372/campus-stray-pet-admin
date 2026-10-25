<template>
  <div class="custom-markdown-preview">
    <MdPreview
      :editorId="editorId"
      :modelValue="modelValue"
      :theme="theme"
      :previewTheme="previewTheme"
      :codeTheme="codeTheme"
      :showCodeRowNumber="showCodeRowNumber"
    />
  </div>
</template>

<script setup lang="ts">
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'

withDefaults(
  defineProps<{
    modelValue: string
    editorId?: string
    theme?: 'light' | 'dark'
    previewTheme?: 'default' | 'github' | 'vuepress' | 'mk-cute' | 'smart-blue' | 'cyanosis'
    codeTheme?: 'atom' | 'a11y' | 'github' | 'gradient' | 'kimbie' | 'paraiso' | 'solarized' | 'vs' | 'vs-dark' | 'xcode'
    showCodeRowNumber?: boolean
  }>(),
  {
    editorId: () => `preview-${Math.random().toString(36).slice(2, 9)}`,
    theme: 'light',
    previewTheme: 'default',
    codeTheme: 'atom',
    showCodeRowNumber: true
  }
)
</script>

<style scoped>
.custom-markdown-preview :deep(.md-editor) {
  background: transparent;
  border: none;
}

.custom-markdown-preview :deep(.md-editor-preview-wrapper) {
  padding: 0;
}

.custom-markdown-preview :deep(.md-editor-preview) {
  padding: 0;
  font-size: 14px;
  line-height: 1.65;
  color: inherit;
  word-break: break-word;
}

.custom-markdown-preview :deep(.md-editor-preview p) {
  margin: 0.35em 0;
}

.custom-markdown-preview :deep(.md-editor-preview p:first-child) {
  margin-top: 0;
}

.custom-markdown-preview :deep(.md-editor-preview p:last-child) {
  margin-bottom: 0;
}

.custom-markdown-preview :deep(.md-editor-preview pre) {
  margin: 0.6em 0;
  border-radius: 6px;
}
</style>
