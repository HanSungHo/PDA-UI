<template>
  <div class="ds-empty-state">
    <div class="ds-empty-state__icon" aria-hidden="true">
      <slot name="icon"><QIcon name="sym_o_info" size="32px" /></slot>
    </div>
    <strong class="ds-empty-state__title">{{ title }}</strong>
    <p class="ds-empty-state__message">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';

import { baseEmptyStateDefaults, type BaseEmptyStateProps } from './base-empty-state.types';

defineOptions({ name: 'BaseEmptyState' });

withDefaults(defineProps<BaseEmptyStateProps>(), baseEmptyStateDefaults);
</script>

<style src="./base-empty-state.css"></style>
