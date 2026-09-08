<template>
  <span class="ds-badge" :class="`ds-badge--${color}`" :aria-label="ariaLabel">
    <span v-if="$slots.icon" class="ds-badge__icon" aria-hidden="true">
      <slot name="icon" />
    </span>

    <span class="ds-badge__text">
      <span class="ds-badge__label">
        <slot>{{ label }}</slot>
      </span>
    </span>

    <span v-if="$slots.suffix" class="ds-badge__icon" aria-hidden="true">
      <slot name="suffix" />
    </span>
  </span>
</template>

<script setup lang="ts">
import { baseBadgeDefaults, type BaseBadgeProps } from './base-badge.types';

defineOptions({ name: 'BaseBadge' });

withDefaults(defineProps<BaseBadgeProps>(), baseBadgeDefaults);

defineSlots<{
  default?(): unknown;
  icon?(): unknown;
  suffix?(): unknown;
}>();
</script>

<style scoped src="./base-badge.css" />
