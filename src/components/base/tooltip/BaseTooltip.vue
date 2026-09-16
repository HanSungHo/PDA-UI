<template>
  <ATooltip
    :title="title"
    :placement="placement"
    :trigger="trigger"
    :arrow="arrow"
    overlay-class-name="ds-tooltip"
  >
    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>
    <slot />
  </ATooltip>
</template>

<script setup lang="ts">
import { Tooltip as ATooltip } from 'ant-design-vue';

import { baseTooltipDefaults, type BaseTooltipProps } from './base-tooltip.types';

defineOptions({ name: 'BaseTooltip' });

withDefaults(defineProps<BaseTooltipProps>(), baseTooltipDefaults);

defineSlots<{
  default?(): unknown;
  title?(): unknown;
}>();
</script>

<style src="./base-tooltip.css"></style>
