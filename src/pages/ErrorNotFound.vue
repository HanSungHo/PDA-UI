<template>
  <div class="error-page">
    <a-result status="404" title="404" sub-title="Oops. Nothing here...">
      <template #extra>
        <a-button type="primary" @click="goHome"> Go Home </a-button>
      </template>
    </a-result>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function goHome() {
  void router.push('/');
}
</script>

<style scoped>
.error-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>
