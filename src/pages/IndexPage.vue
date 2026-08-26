<template>
  <div class="index-page">
    <a-row justify="center" align="middle" style="min-height: 400px">
      <a-col>
        <div style="text-align: center">
          <div style="font-size: 64px; margin-bottom: 24px">🚀</div>
          <div style="margin-bottom: 24px">
            <h1>Welcome to ATOP26-SMART</h1>
            <p style="font-size: 16px; color: #666">Powered by Ant Design Vue + Vite</p>
          </div>
          <a-space>
            <a-button type="primary" size="large" @click="goToSecondPage">
              Go to Second Page
            </a-button>
            <a-button size="large" @click="goToExample"> View Example Feature </a-button>
          </a-space>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function goToSecondPage() {
  void router.push('/second');
}

function goToExample() {
  void router.push('/example');
}
</script>

<style scoped>
.index-page {
  padding: 24px;
}
</style>
