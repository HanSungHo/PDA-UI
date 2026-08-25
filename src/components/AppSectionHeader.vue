<template>
  <div class="app-section-header">
    <div>
      <p v-if="eyebrow" class="app-section-header__eyebrow">{{ eyebrow }}</p>
      <h2 class="app-section-header__title">{{ title }}</h2>
    </div>

    <slot name="actions" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  eyebrow?: string;
}>();
</script>

<style scoped>
.app-section-header {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.app-section-header__eyebrow {
  color: #5f6368;
  font-size: 12px;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.app-section-header__title {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.25;
  margin: 0;
}
</style>
