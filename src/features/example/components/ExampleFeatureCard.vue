<template>
  <a-card class="example-feature-card" :bordered="true">
    <template #title>
      <div class="card-title">{{ title }}</div>
    </template>
    <div class="card-description">{{ description }}</div>
  </a-card>
</template>

<script setup lang="ts">
defineProps<{
  description: string;
  title: string;
}>();
</script>

<style scoped>
.example-feature-card {
  border-radius: 8px;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
}

.card-description {
  font-size: 14px;
  color: #8c8c8c;
}
</style>
