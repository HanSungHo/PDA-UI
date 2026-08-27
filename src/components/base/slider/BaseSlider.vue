<template>
  <BaseFieldShell
    :class="[`ds-slider--${size}`, { 'ds-slider--readonly': readonly }]"
    :control-id="controlId"
    :label-id="labelId"
    :message-id="messageId"
    :label="label"
    :message="message"
    :required="required"
    :status="status"
    :block="block"
  >
    <template #extra>
      <span v-if="showValue" class="ds-slider__value">
        {{ formattedValue }}
      </span>
    </template>

    <ASlider
      :id="controlId"
      class="ds-slider__control"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :dots="dots"
      :included="included"
      :marks="marks"
      :tooltip-open="tooltipOpen"
      :disabled="isStructurallyDisabled"
      :aria-label="label ? undefined : ariaLabel"
      :aria-labelledby="label ? labelId : undefined"
      :aria-describedby="message ? messageId : undefined"
      :aria-invalid="status === 'error' || undefined"
      :aria-required="required || undefined"
      :aria-readonly="readonly || undefined"
      :aria-busy="loading || undefined"
      @update:value="handleUpdate"
      @change="handleChange"
      @after-change="handleAfterChange"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    />
  </BaseFieldShell>
</template>

<script setup lang="ts">
/**
 * BaseSlider — wraps Ant Design Vue's `<a-slider>` (single-value mode
 * only).
 *
 * `readonly` does NOT set the Ant `disabled` prop — see
 * `useBaseField.isStructurallyDisabled` vs `isValueLocked`. The `slider`
 * ARIA role formally supports `aria-readonly`, so it is set here as the
 * authoritative accessibility signal (unlike BaseToggle's best-effort
 * usage on the `switch` role).
 */
import { Slider as ASlider } from 'ant-design-vue';
import { computed } from 'vue';

import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import {
  type AntSliderValue,
  baseSliderDefaults,
  type BaseSliderEmits,
  type BaseSliderProps,
  isSingleSliderValue,
} from './base-slider.types';

defineOptions({ name: 'BaseSlider' });

const props = withDefaults(defineProps<BaseSliderProps>(), baseSliderDefaults);
const emit = defineEmits<BaseSliderEmits>();

const { controlId, labelId, messageId, status, message, isStructurallyDisabled, isValueLocked } =
  useBaseField(props, 'base-slider');

const formattedValue = computed(
  () => `${props.valuePrefix}${props.modelValue}${props.valueSuffix}`,
);

function handleUpdate(value: AntSliderValue): void {
  if (isValueLocked.value || !isSingleSliderValue(value)) return;
  emit('update:modelValue', value);
}

function handleChange(value: AntSliderValue): void {
  if (isValueLocked.value || !isSingleSliderValue(value)) return;
  emit('change', value);
}

function handleAfterChange(value: AntSliderValue): void {
  if (isValueLocked.value || !isSingleSliderValue(value)) return;
  emit('afterChange', value);
}
</script>

./base-slider.css-weight: var(--ds-font-weight-semibold); font-variant-numeric: tabular-nums; }
.ds-slider__control { margin: var(--ds-spacing-1) var(--ds-spacing-2) 2px; } .ds-slider--small
.ds-slider__value { font-size: var(--ds-font-size-xs); } .ds-slider--large .ds-slider__value {
font-size: var(--ds-font-size-md); } .ds-slider--readonly .ds-slider__control { pointer-events:
none; }
