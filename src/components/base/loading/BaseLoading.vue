<template>
  <span class="ds-loading" :class="`ds-loading--${size}`" role="status">
    <svg class="ds-loading__svg" viewBox="0 0 32 32" aria-hidden="true">
      <circle class="ds-loading__track" cx="16" cy="16" r="13" fill="none" stroke-width="3" />
      <circle class="ds-loading__indicator" cx="16" cy="16" r="13" fill="none" stroke-width="3" />
    </svg>
  </span>
</template>

<script setup lang="ts">
import { baseLoadingDefaults, type BaseLoadingProps } from './base-loading.types';

defineOptions({ name: 'BaseLoading' });

withDefaults(defineProps<BaseLoadingProps>(), baseLoadingDefaults);
</script>

<style src="./base-loading.css"></style>
