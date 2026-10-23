<template>
  <BaseFieldShell
    v-bind="rootAttrs"
    :class="[
      'ds-input',
      `ds-input--${inputSize}`,
      `ds-input--tone-${inputTone}`,
      {
        'ds-input--block': isBlock,
        'ds-input--font-weight-bold': props.fontWeight === 'bold',
        'ds-input--truncate': props.truncate,
        'ds-input--textarea': inputMode === 'textarea',
        'ds-input--disabled': disabled,
        'ds-input--loading': loading,
        'ds-input--readonly': readonly,
      },
    ]"
    :control-id="controlId"
    :label-id="labelId"
    :message-id="footerId"
    :message="message"
    @focusin="handleFocus"
    @focusout="handleBlur"
    :label="label"
    :required="required"
    :status="status"
    :layout="layout"
    :block="isBlock"
  >
    <QInput
      v-bind="nativeAttrs"
      ref="nativeInputRef"
      class="ds-input__qinput"
      input-class="ds-input__native"
      :input-style="nativeInputStyle"
      filled
      :for="controlId"
      :aria-label="label ? undefined : (ariaLabel ?? nativeAttrs['aria-label'])"
      :aria-labelledby="label ? labelId : undefined"
      :aria-describedby="message ? footerId : undefined"
      :aria-invalid="status === 'error' || undefined"
      :aria-busy="loading || undefined"
      :aria-required="required || undefined"
      hide-bottom-space
      :readonly="readonly"
      :disable="isStructurallyDisabled"
      :loading="loading"
      :error="status === 'error'"
      no-error-icon
      :clearable="clearable || allowClear"
      :counter="Boolean(showCount && maxLength)"
      :autogrow="inputMode === 'textarea' && isTextareaResizable"
      :type="inputMode === 'textarea' ? 'textarea' : inputType"
      :name="name"
      :autocomplete="autocomplete"
      :autofocus="autofocus"
      :placeholder="placeholder"
      :rows="rows"
      :maxlength="maxLength ?? (nativeAttrs.maxlength as number | string | undefined)"
      :model-value="modelValue ?? ''"
      @update:model-value="handleModelUpdate"
      @change="handleChange"
      @clear="handleClear"
    >
      <template v-if="$slots.append || $slots.suffix" #append>
        <slot v-if="$slots.append" name="append" />
        <slot v-else name="suffix" />
      </template>
    </QInput>
  </BaseFieldShell>
</template>

<script setup lang="ts">
import { QInput } from 'quasar';
import { computed, ref, useAttrs } from 'vue';

import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import {
  type BaseInputEmits,
  type BaseInputMode,
  type BaseInputProps,
  type BaseInputTone,
  type BaseInputType,
  type BaseInputValue,
} from './base-input.types';

defineOptions({ name: 'BaseInput', inheritAttrs: false });

const props = defineProps<BaseInputProps>();
const emit = defineEmits<BaseInputEmits>();
defineSlots<{ append?: () => unknown; suffix?: () => unknown }>();
const attrs = useAttrs();

const { controlId, labelId, messageId, status, message, isStructurallyDisabled, isValueLocked } =
  useBaseField(props, 'base-input');

const rootAttrs = computed(() => ({
  class: attrs.class,
  style: attrs.style,
  ...Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith('data-'))),
}));
const nativeAttrs = computed(() =>
  Object.fromEntries(
    Object.entries(attrs).filter(
      ([key]) => key !== 'class' && key !== 'style' && !key.startsWith('data-'),
    ),
  ),
);
const nativeInputRef = ref<InstanceType<typeof QInput> | null>(null);

function focus(): void {
  nativeInputRef.value?.focus();
}

function select(): void {
  nativeInputRef.value?.select();
}

defineExpose({ focus, select });

const footerId = computed(() => messageId.value);
const inputMode = computed<BaseInputMode>(() => props.mode ?? 'input');
const inputType = computed<BaseInputType>(() => props.type ?? 'text');
const inputTone = computed<BaseInputTone>(() => props.tone ?? 'default');
const inputSize = computed(() => props.size ?? 'medium');
const isBlock = computed(() => props.block ?? true);
const layout = computed(() => props.layout ?? 'vertical');
const isTextareaResizable = computed(
  () => inputMode.value === 'textarea' && props.resize === 'vertical',
);
const nativeInputStyle = computed(() =>
  inputMode.value === 'textarea'
    ? { resize: isTextareaResizable.value ? 'vertical' : 'none' }
    : undefined,
);

function normalizeInputValue(event: Event): BaseInputValue {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;

  if (inputType.value === 'number' && target.value !== '') {
    return Number(target.value);
  }

  return target.value;
}

function normalizeModelValue(value: string | number | null): BaseInputValue {
  if (value === null) return props.allowClear ? '' : undefined;

  if (inputType.value === 'number' && value !== '' && value !== null) {
    return Number(value);
  }

  return value ?? undefined;
}

function handleModelUpdate(value: string | number | null): void {
  if (isValueLocked.value) return;

  const normalizedValue = normalizeModelValue(value);

  emit('update:modelValue', normalizedValue);
  emit('input', normalizedValue, new Event('input'));
}

function handleChange(value: Event | string | number): void {
  if (isValueLocked.value) return;

  const normalizedValue =
    value instanceof Event ? normalizeInputValue(value) : normalizeModelValue(value);
  const event = value instanceof Event ? value : new Event('change');

  emit('change', normalizedValue, event);
}

function handleFocus(event: Event): void {
  emit('focus', event as FocusEvent);
}

function handleBlur(event: Event): void {
  emit('blur', event as FocusEvent);
}

function handleClear(): void {
  emit('clear');
}
</script>

<style lang="scss">
@use './base-input';
</style>
