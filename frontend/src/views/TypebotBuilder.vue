<script setup lang="ts">
import { ref } from 'vue'

const typebotUrl = import.meta.env.VITE_TYPEBOT_BUILDER_URL || 'https://app.typebot.io/typebots'
const isLoading = ref(true)

const onIframeLoad = () => {
  isLoading.value = false
}
</script>

<template>
  <div class="builder-container d-flex flex-column position-relative w-100" style="height: calc(100vh - 220px); min-height: 500px;">
    <div v-if="isLoading" class="d-flex align-center justify-center position-absolute w-100 h-100 bg-surface z-10" style="z-index: 10;">
      <v-progress-circular color="primary" indeterminate size="52" />
    </div>
    <iframe
      :src="typebotUrl"
      class="w-100 h-100 border-0 rounded-lg"
      title="Typebot Builder"
      @load="onIframeLoad"
      allow="camera; microphone; clipboard-read; clipboard-write;"
    ></iframe>
  </div>
</template>

<style scoped>
.builder-container iframe {
  width: 100%;
  height: 100%;
}
</style>
