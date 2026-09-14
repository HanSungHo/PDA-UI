<template>
  <BaseFieldShell
    :class="rootClasses"
    :data-state="visualState"
    :control-id="controlId"
    :label-id="labelId"
    :message-id="messageId"
    :layout="layout"
    :label="label || undefined"
    :message="message"
    :required="required"
    :status="status"
    block
  >
    <ADatePicker
      class="base-date-picker__control"
      v-bind="pickerAttributes"
      @blur="handleBlur"
      @focus="handleFocus"
      @update:value="emitModelValue"
    />
  </BaseFieldShell>
</template>

<script setup lang="ts">
import { DatePicker as ADatePicker } from 'ant-design-vue';
import { computed, h, type InputHTMLAttributes, ref } from 'vue';

import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import {
  baseDatePickerDefaults,
  type BaseDatePickerEmits,
  type BaseDatePickerProps,
  type BaseDatePickerState,
  type BaseDatePickerValue,
} from './base-date-picker.types';

const props = withDefaults(defineProps<BaseDatePickerProps>(), baseDatePickerDefaults);

const emit = defineEmits<BaseDatePickerEmits>();

const isFocused = ref(false);
const hasValue = computed(() => props.modelValue !== null && props.modelValue !== '');

const { controlId, labelId, messageId, status, message, isStructurallyDisabled } = useBaseField(
  props,
  'base-date-picker',
);

const isError = computed(() => status.value === 'error');
const pickerStatus = computed<'' | 'error'>(() => (isError.value ? 'error' : ''));

const visualState = computed<BaseDatePickerState>(() => {
  if (props.disabled) {
    return 'disabled';
  }

  if (isError.value) {
    return 'error';
  }

  if (isFocused.value) {
    return 'focus';
  }

  if (hasValue.value) {
    return 'filled';
  }

  return 'default';
});

const rootClasses = computed(() => [
  'base-date-picker',
  `base-date-picker--${props.layout}`,
  `base-date-picker--${visualState.value}`,
]);

const pickerAttributes = computed(() => ({
  id: controlId.value,
  'aria-labelledby': props.label ? labelId.value : undefined,
  'aria-describedby': message.value ? messageId.value : undefined,
  'aria-invalid': isError.value || undefined,
  'aria-required': props.required || undefined,
  disabled: isStructurallyDisabled.value,
  format: props.format,
  inputRender: renderInput,
  inputReadOnly: props.inputReadOnly,
  placeholder: props.placeholder,
  popupClassName: 'base-date-picker__dropdown',
  showToday: true,
  size: props.size === 'small' ? ('small' as const) : ('middle' as const),
  status: pickerStatus.value,
  value: props.modelValue ?? undefined,
  valueFormat: props.valueFormat,
}));

function emitModelValue(value: unknown): void {
  emit('update:modelValue', normalizeDateValue(value));
}

function handleFocus(event: FocusEvent): void {
  isFocused.value = true;
  emit('focus', event);
}

function handleBlur(event: FocusEvent): void {
  isFocused.value = false;
  emit('blur', event);
}

function normalizeDateValue(value: unknown): BaseDatePickerValue {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  return null;
}

function renderInput(inputProps: InputHTMLAttributes) {
  return h('input', {
    ...inputProps,
    'aria-labelledby': props.label ? labelId.value : undefined,
    'aria-describedby': message.value ? messageId.value : undefined,
    'aria-invalid': isError.value || undefined,
    'aria-required': props.required || undefined,
  });
}
</script>

<style src="./base-date-picker.css"></style>
