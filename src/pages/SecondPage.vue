<template>
  <div class="second-page">
    <a-row justify="center" align="middle" style="min-height: 400px">
      <a-col>
        <div style="text-align: center">
          <h1>Second Page</h1>
          <p>This is the second page of the application</p>
          <a-button type="default" size="large" @click="goToIndexPage"> Go to Index Page </a-button>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function goToIndexPage() {
  void router.push('/');
}
</script>

<style scoped>
.second-page {
  padding: 24px;
}
</style>
