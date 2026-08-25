<template>
  <q-card flat bordered class="example-feature-card">
    <q-card-section>
      <div class="text-subtitle1">{{ title }}</div>
      <div class="text-body2 text-grey-7">{{ description }}</div>
    </q-card-section>
  </q-card>
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
</style>
