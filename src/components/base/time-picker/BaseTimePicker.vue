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
    <ATimePicker
      class="base-picker__control base-time-picker__control"
      v-bind="pickerAttributes"
      @blur="handleBlur"
      @focus="handleFocus"
      @update:value="emitModelValue"
    />
  </BaseFieldShell>
</template>

<script setup lang="ts">
import { TimePicker as ATimePicker } from 'ant-design-vue';
import enUS from 'ant-design-vue/es/date-picker/locale/en_US';
import { computed, h, type InputHTMLAttributes, ref } from 'vue';

import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import {
  baseTimePickerDefaults,
  type BaseTimePickerEmits,
  type BaseTimePickerProps,
  type BaseTimePickerState,
  type BaseTimePickerValue,
} from './base-time-picker.types';

const props = withDefaults(defineProps<BaseTimePickerProps>(), baseTimePickerDefaults);

const emit = defineEmits<BaseTimePickerEmits>();

const isFocused = ref(false);
const hasValue = computed(() => props.modelValue !== null && props.modelValue !== '');
const timePickerLocale = {
  ...enUS,
  lang: {
    ...enUS.lang,
    now: 'Today',
    ok: 'OK',
  },
};

const { controlId, labelId, messageId, status, message, isStructurallyDisabled } = useBaseField(
  props,
  'base-time-picker',
);

const isError = computed(() => status.value === 'error');
const pickerStatus = computed<'' | 'error'>(() => (isError.value ? 'error' : ''));

const visualState = computed<BaseTimePickerState>(() => {
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
  'base-picker',
  'base-time-picker',
  `base-picker--${props.layout}`,
  `base-time-picker--${props.layout}`,
  `base-picker--${visualState.value}`,
  `base-time-picker--${visualState.value}`,
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
  locale: timePickerLocale,
  placeholder: props.placeholder,
  popupClassName: 'base-time-picker__dropdown',
  showNow: true,
  size: props.size === 'small' ? ('small' as const) : ('middle' as const),
  status: pickerStatus.value,
  value: props.modelValue ?? undefined,
  valueFormat: props.valueFormat,
}));

function emitModelValue(value: unknown): void {
  emit('update:modelValue', normalizeTimeValue(value));
}

function handleFocus(event: FocusEvent): void {
  isFocused.value = true;
  emit('focus', event);
}

function handleBlur(event: FocusEvent): void {
  isFocused.value = false;
  emit('blur', event);
}

function normalizeTimeValue(value: unknown): BaseTimePickerValue {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return `${value}`;
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

<style src="./base-time-picker.css"></style>
