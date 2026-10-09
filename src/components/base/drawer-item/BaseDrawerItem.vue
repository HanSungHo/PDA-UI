<template>
  <button
    type="button"
    class="ds-drawer-item"
    :class="{
      'ds-drawer-item--selected': selected,
      'ds-drawer-item--disabled': disabled,
    }"
    :disabled="disabled"
    :aria-current="selected ? 'page' : undefined"
    @click="handleSelect"
  >
    <span class="ds-drawer-item__label">
      <slot>{{ label }}</slot>
    </span>
    <QIcon v-if="selected" name="sym_o_check" class="ds-drawer-item__check" aria-hidden="true" />
  </button>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';

import {
  baseDrawerItemDefaults,
  type BaseDrawerItemEmits,
  type BaseDrawerItemProps,
} from './base-drawer-item.types';

defineOptions({ name: 'BaseDrawerItem' });

const props = withDefaults(defineProps<BaseDrawerItemProps>(), baseDrawerItemDefaults);
const emit = defineEmits<BaseDrawerItemEmits>();

defineSlots<{
  default?(): unknown;
}>();

function handleSelect(event: MouseEvent): void {
  if (!props.disabled) emit('select', props.value, event);
}
</script>

<style scoped src="./base-drawer-item.css" />
