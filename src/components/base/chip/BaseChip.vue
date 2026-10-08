<template>
  <q-chip
    :class="['ds-chip', `ds-chip--${size}`, { 'ds-chip--selected': modelValue }]"
    :disable="disabled"
    :removable="false"
    :aria-label="label"
    :aria-pressed="modelValue"
    :aria-disabled="disabled"
    role="button"
    dense
    clickable
    @click="onClick"
    @focus="emit('focus', $event)"
    @blur="emit('blur', $event)"
  >
    <component :is="beforeIcon" v-if="beforeIcon" class="ds-chip__icon ds-chip__icon--before" />
    <span class="ds-chip__label">{{ label }}</span>
    <component :is="afterIcon" v-if="afterIcon" class="ds-chip__icon ds-chip__icon--after" />
  </q-chip>
</template>

<script setup lang="ts">
import { QChip } from 'quasar';

import type { BaseChipEmits, BaseChipProps } from './base-chip.types';

defineOptions({ name: 'BaseChip' });

const props = withDefaults(defineProps<BaseChipProps>(), {
  modelValue: false,
  size: 'medium',
  disabled: false,
});

const emit = defineEmits<BaseChipEmits>();

/**
 * NOTE: Do NOT bind `modelValue` to QChip. In Quasar, QChip's `modelValue`
 * controls visibility (false => nothing is rendered). The selected state is
 * managed here and exposed through the `ds-chip--selected` class + aria-pressed.
 * QChip does not emit `click` while disabled, so no extra guard is needed.
 */
function onClick(event: Event): void {
  emit('click', event as MouseEvent);
  emit('update:modelValue', !props.modelValue);
}
</script>

<style src="./base-chip.scss" scoped></style>
