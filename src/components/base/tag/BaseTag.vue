<script setup lang="ts">
import type { BaseTagProps } from './BaseTag.types';

withDefaults(defineProps<BaseTagProps>(), {
  text: '',
  bordered: false,
});
</script>

<template>
  <a-tag class="ds-tag" :color="color" :bordered="bordered">
    <component v-if="icon" :is="icon" />
    <span class="ds-tag__text">
      {{ text }}
    </span>
  </a-tag>
</template>

<style src="./base-tag.css" scoped></style>
