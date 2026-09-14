<template>
  <BaseFieldShell
    class="ds-range-slider"
    :class="[
      `ds-range-slider--${layout}`,
      `ds-range-slider--${size}`,
      {
        'ds-range-slider--disabled': disabled,
        'ds-range-slider--readonly': readonly,
        'ds-range-slider--loading': loading,
      },
    ]"
    :control-id="controlId"
    :label-id="labelId"
    :message-id="messageId"
    :layout="layout"
    :label="label"
    :message="message"
    :required="required"
    :status="status"
    :block="block"
  >
    <div
      class="ds-range-slider__controls"
      role="group"
      :aria-labelledby="label ? labelId : undefined"
      :aria-label="label ? undefined : ariaLabel"
      :aria-describedby="message ? messageId : undefined"
      :aria-invalid="status === 'error' || undefined"
      :aria-required="required || undefined"
      :aria-readonly="readonly || undefined"
      :aria-busy="loading || undefined"
    >
      <BaseSlider
        :id="controlId"
        class="ds-range-slider__slider"
        :model-value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        :readonly="readonly"
        :loading="loading"
        :size="size"
        :aria-label="`${accessibleName} slider`"
        :block="true"
        @update:model-value="handleUpdate"
        @change="handleChange"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      />

      <AInputNumber
        :id="valueInputId"
        class="ds-range-slider__input"
        :value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        :controls="false"
        :disabled="isStructurallyDisabled"
        :readonly="readonly"
        :size="antSize"
        :status="antStatus"
        :aria-label="`${accessibleName} value`"
        :aria-describedby="message ? messageId : undefined"
        :aria-invalid="status === 'error' || undefined"
        :aria-readonly="readonly || undefined"
        @update:value="handleInputUpdate"
        @change="handleInputChange"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      />
    </div>
  </BaseFieldShell>
</template>

<script setup lang="ts">
import { InputNumber as AInputNumber } from 'ant-design-vue';
import { computed } from 'vue';

import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import BaseSlider from '../slider/BaseSlider.vue';
import {
  baseRangeSliderDefaults,
  type BaseRangeSliderEmits,
  type BaseRangeSliderProps,
} from './base-range-slider.types';

defineOptions({ name: 'BaseRangeSlider' });

const props = withDefaults(defineProps<BaseRangeSliderProps>(), baseRangeSliderDefaults);
const emit = defineEmits<BaseRangeSliderEmits>();

type AntInputNumberStatus = 'warning' | 'error' | undefined;
type AntInputNumberSize = 'small' | 'middle' | 'large';
type AntInputNumberValue = number | string | null;

const antSizeMap = {
  large: 'large',
  medium: 'middle',
  small: 'small',
} as const satisfies Record<NonNullable<BaseRangeSliderProps['size']>, AntInputNumberSize>;

const { controlId, labelId, messageId, status, message, isStructurallyDisabled, isValueLocked } =
  useBaseField(props, 'base-range-slider');

const valueInputId = computed(() => `${controlId.value}-value`);
const accessibleName = computed(() => props.label ?? props.ariaLabel ?? 'Range slider');
const antSize = computed(() => antSizeMap[props.size]);
const antStatus = computed<AntInputNumberStatus>(() =>
  status.value === 'warning' || status.value === 'error' ? status.value : undefined,
);

function clamp(value: number): number {
  return Math.min(props.max, Math.max(props.min, value));
}

function toValidNumber(value: AntInputNumberValue): number | undefined {
  if (value === null || value === '') return undefined;
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? clamp(numericValue) : undefined;
}

function emitNormalized(
  eventName: 'update:modelValue' | 'change',
  value: AntInputNumberValue,
): void {
  if (isValueLocked.value) return;
  const nextValue = toValidNumber(value);
  if (nextValue === undefined) return;
  if (eventName === 'update:modelValue') emit('update:modelValue', nextValue);
  else emit('change', nextValue);
}

function handleUpdate(value: number): void {
  emitNormalized('update:modelValue', value);
}

function handleChange(value: number): void {
  emitNormalized('change', value);
}

function handleInputUpdate(value: AntInputNumberValue): void {
  emitNormalized('update:modelValue', value);
}

function handleInputChange(value: AntInputNumberValue): void {
  emitNormalized('change', value);
}
</script>

<style scoped src="./base-range-slider.css" />
