<template>
  <div
    class="ds-table-cell"
    :class="[
      `ds-table-cell--${props.variant}`,
      `ds-table-cell--align-${props.align}`,
      { 'ds-table-cell--truncate': props.truncate },
    ]"
  >
    <span v-if="$slots.prefix" class="ds-table-cell__prefix">
      <slot name="prefix" />
    </span>
    <div class="ds-table-cell__content" :title="props.truncate ? displayValue : undefined">
      <slot>{{ displayValue }}</slot>
    </div>
    <span v-if="$slots.suffix" class="ds-table-cell__suffix">
      <slot name="suffix" />
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { BaseTableCellProps } from './base-table-cell.types';

defineOptions({ name: 'BaseTableCell' });

const props = withDefaults(defineProps<BaseTableCellProps>(), {
  align: 'start',
  truncate: false,
  variant: 'body',
});

defineSlots<{
  default?(): unknown;
  prefix?(): unknown;
  suffix?(): unknown;
}>();

const displayValue = computed(() =>
  props.value === null || props.value === undefined ? '' : String(props.value),
);
</script>

<style scoped src="./base-table-cell.css"></style>
