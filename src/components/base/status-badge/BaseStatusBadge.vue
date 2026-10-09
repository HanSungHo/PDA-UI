<script setup lang="ts">
import { computed } from 'vue';

import {
  BASE_STATUS_BADGE_DEFAULT_COLOR_BY_STATUS,
  BASE_STATUS_BADGE_STATUS_COLORS,
  BASE_STATUS_BADGE_STATUS_CONFIG,
} from './BaseStatusBadge.constants';
import type {
  BaseStatusBadgeColor,
  BaseStatusBadgeProps,
  BaseStatusBadgeStatus,
} from './BaseStatusBadge.types';

const props = withDefaults(defineProps<BaseStatusBadgeProps>(), {
  status: 'pending',
});

const effectiveStatus = computed<BaseStatusBadgeStatus>(() => props.status ?? 'pending');
const statusConfig = computed(() => BASE_STATUS_BADGE_STATUS_CONFIG[effectiveStatus.value]);

const normalizedColor = computed<BaseStatusBadgeColor>(() => {
  const allowedColors: readonly BaseStatusBadgeColor[] =
    BASE_STATUS_BADGE_STATUS_COLORS[effectiveStatus.value];

  if (props.color && allowedColors.includes(props.color)) {
    return props.color;
  }

  return BASE_STATUS_BADGE_DEFAULT_COLOR_BY_STATUS[effectiveStatus.value];
});

const badgeClasses = computed(() => [
  'ds-status-badge',
  `ds-status-badge--${normalizedColor.value}`,
]);
</script>

<template>
  <div :class="badgeClasses">
    <component :is="statusConfig.icon" class="ds-status-badge__icon" />

    <span class="ds-status-badge__label">
      {{ statusConfig.label }}
    </span>
  </div>
</template>

<style src="./base-statusbadge.css"></style>
