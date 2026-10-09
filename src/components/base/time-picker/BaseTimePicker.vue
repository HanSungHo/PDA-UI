<template>
  <BaseFieldShell
    :class="rootClasses"
    :data-state="visualState"
    :control-id="controlId"
    :label-id="labelId"
    :message-id="messageId"
    :message="message"
    :required="required"
    :status="status"
    block
  >
    <QInput
      class="base-picker__control base-time-picker__control"
      :model-value="inputText"
      input-class="base-picker__input"
      :for="controlId"
      :label="label"
      :aria-describedby="message ? messageId : undefined"
      :aria-invalid="isError || undefined"
      :aria-required="required || undefined"
      :disable="isStructurallyDisabled"
      :readonly="inputReadOnly"
      :placeholder="placeholder"
      :dense="size === 'small'"
      :error="isError"
      :mask="inputMask"
      filled
      stack-label
      no-error-icon
      hide-bottom-space
      @update:model-value="handleInputValue"
      @focusin="handleFocus"
      @focusout="handleBlur"
      @focus="handleFocus"
      @blur="handleBlur"
    >
      <template #append>
        <QIcon name="o_access_time" class="cursor-pointer">
          <QPopupProxy
            ref="popupRef"
            class="base-time-picker__dropdown"
            cover
            :breakpoint="0"
            transition-show="scale"
            transition-hide="scale"
            @before-show="handlePopupShow"
            @before-hide="handlePopupHide"
          >
            <QTime
              :model-value="modelValue"
              :mask="valueFormat"
              :readonly="isStructurallyDisabled"
              :with-seconds="usesSeconds"
              format24h
              @update:model-value="handleTimeValue"
            >
              <div class="row items-center justify-end">
                <QBtn label="Close" color="primary" flat @click="closePopup" />
              </div>
            </QTime>
          </QPopupProxy>
        </QIcon>
      </template>
    </QInput>
  </BaseFieldShell>
</template>

<script setup lang="ts">
import { QBtn, QIcon, QInput, QPopupProxy, QTime } from 'quasar';
import { computed, ref, watch } from 'vue';

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

const inputText = ref('');
const isFocused = ref(false);
const isOpen = ref(false);
const popupRef = ref<InstanceType<typeof QPopupProxy> | null>(null);

const { controlId, labelId, messageId, status, message, isStructurallyDisabled } = useBaseField(
  props,
  'base-time-picker',
);

const isError = computed(() => status.value === 'error');
const hasValue = computed(() => Boolean(props.modelValue));
const inputMask = computed(() => toInputMask(props.format));
const usesSeconds = computed(
  () => usesToken(props.format, 'ss') || usesToken(props.valueFormat, 'ss'),
);

watch(
  () => props.modelValue,
  (value) => {
    inputText.value = formatDisplayValue(value);
  },
  { immediate: true },
);

const visualState = computed<BaseTimePickerState>(() => {
  if (props.disabled) {
    return 'disabled';
  }

  if (isError.value) {
    return 'error';
  }

  if (isFocused.value || isOpen.value) {
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
  `base-picker--${visualState.value}`,
  `base-time-picker--${visualState.value}`,
]);

function closePopup(): void {
  popupRef.value?.hide();
}

function handleTimeValue(value: string | null): void {
  const normalizedValue = normalizeTimeValue(value);

  inputText.value = formatDisplayValue(normalizedValue);
  emit('update:modelValue', normalizedValue);
}

function handleInputValue(value: string | number | null): void {
  const nextInputText = String(value ?? '');
  const parsedValue = parseFormattedTime(nextInputText, props.format, props.valueFormat);

  inputText.value = nextInputText;

  if (!nextInputText.trim() || parsedValue) {
    emit('update:modelValue', parsedValue);
  }
}

function handlePopupShow(): void {
  isOpen.value = true;
  isFocused.value = true;
}

function handlePopupHide(): void {
  isOpen.value = false;
  isFocused.value = false;
}

function handleFocus(event: Event): void {
  if (!isStructurallyDisabled.value) {
    isFocused.value = true;
  }

  emit('focus', event as FocusEvent);
}

function handleBlur(event: Event): void {
  if (!isOpen.value) {
    isFocused.value = false;
  }

  emit('blur', event as FocusEvent);
}

function normalizeTimeValue(value: string | null | undefined): BaseTimePickerValue {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function formatDisplayValue(value: BaseTimePickerValue | undefined): string {
  if (!value) {
    return '';
  }

  const parsedValue = parseTimeValue(value, props.valueFormat);

  return parsedValue ? formatTimeParts(parsedValue, props.format) : '';
}

function parseFormattedTime(
  value: string,
  format: string,
  valueFormat: string,
): BaseTimePickerValue {
  const parsedValue = parseTimeValue(value, format);

  return parsedValue ? formatTimeParts(parsedValue, valueFormat) : null;
}

function parseTimeValue(
  value: string,
  format: string,
): { hour: number; minute: number; second: number } | null {
  const tokens = format.match(/HH|mm|ss/g);
  const values = value.match(/\d+/g);

  if (!tokens || !values || tokens.length !== values.length) {
    return null;
  }

  const timeParts = tokens.reduce<Record<string, number>>((parts, token, index) => {
    parts[token] = Number(values[index]);
    return parts;
  }, {});
  const hour = timeParts.HH;
  const minute = timeParts.mm ?? 0;
  const second = timeParts.ss ?? 0;

  if (
    hour === undefined ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  return { hour, minute, second };
}

function formatTimeParts(
  value: { hour: number; minute: number; second: number },
  format: string,
): string {
  const tokens: Record<string, string> = {
    HH: `${value.hour}`.padStart(2, '0'),
    mm: `${value.minute}`.padStart(2, '0'),
    ss: `${value.second}`.padStart(2, '0'),
  };

  return format.replace(/HH|mm|ss/g, (token) => tokens[token] ?? token);
}

function toInputMask(format: string): string {
  const inputMaskTokens: Record<string, string> = {
    HH: '##',
    mm: '##',
    ss: '##',
  };

  return format.replace(/HH|mm|ss/g, (token) => inputMaskTokens[token] ?? token);
}

function usesToken(format: string, token: string): boolean {
  return format.match(/HH|mm|ss/g)?.includes(token) ?? false;
}
</script>

<style src="./base-time-picker.css"></style>
