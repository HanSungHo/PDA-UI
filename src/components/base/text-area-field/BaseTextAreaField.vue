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
    <ATextarea
      class="base-text-area-field__control ds-text-area-field__control"
      v-bind="textAreaAttributes"
      @blur="handleBlur"
      @focus="handleFocus"
      @update:value="emitModelValue"
    />
  </BaseFieldShell>
</template>

<script setup lang="ts">
import { Textarea as ATextarea } from 'ant-design-vue';
import { computed, ref, watch } from 'vue';

import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import {
  baseTextAreaFieldDefaults,
  type BaseTextAreaFieldEmits,
  type BaseTextAreaFieldProps,
  type BaseTextAreaFieldState,
} from './base-text-area-field.types';

const props = withDefaults(defineProps<BaseTextAreaFieldProps>(), baseTextAreaFieldDefaults);

const emit = defineEmits<BaseTextAreaFieldEmits>();

const isFocused = ref(false);
const lastEmittedValue = ref<string | null>(null);

const { controlId, labelId, messageId, status, message, isStructurallyDisabled } = useBaseField(
  props,
  'base-text-area-field',
);

const isError = computed(() => status.value === 'error');
const isFilled = computed(() => props.modelValue.length > 0);
const textAreaStatus = computed<'' | 'error'>(() => (isError.value ? 'error' : ''));
const textAreaAttributes = computed(() => ({
  id: controlId.value,
  ...(props.maxLength !== null ? { maxlength: props.maxLength } : {}),
  'aria-labelledby': props.label ? labelId.value : undefined,
  'aria-describedby': message.value ? messageId.value : undefined,
  'aria-invalid': isError.value || undefined,
  'aria-required': props.required || undefined,
  disabled: isStructurallyDisabled.value,
  placeholder: props.placeholder,
  showCount: props.showCount,
  status: textAreaStatus.value,
  value: props.modelValue,
}));

const visualState = computed<BaseTextAreaFieldState>(() => {
  if (props.disabled) {
    return 'disabled';
  }

  if (isError.value) {
    return 'error';
  }

  if (isFocused.value) {
    return 'focus';
  }

  if (isFilled.value) {
    return 'filled';
  }

  return 'default';
});

const rootClasses = computed(() => [
  'ds-text-area-field',
  `base-text-area-field--${props.layout}`,
  `base-text-area-field--${visualState.value}`,
  `ds-text-area-field--${visualState.value}`,
]);

watch(
  () => props.modelValue,
  (value) => {
    lastEmittedValue.value = value;
  },
);

function emitModelValue(value: string | number): void {
  const nextValue = String(value);

  if (nextValue === lastEmittedValue.value) {
    return;
  }

  lastEmittedValue.value = nextValue;
  emit('update:modelValue', nextValue);
}

function handleFocus(event: FocusEvent): void {
  isFocused.value = true;
  emit('focus', event);
}

function handleBlur(event: FocusEvent): void {
  isFocused.value = false;
  emit('blur', event);
}
</script>

<style src="./base-text-area-field.css"></style>
