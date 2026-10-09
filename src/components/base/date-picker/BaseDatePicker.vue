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
      class="base-picker__control base-date-picker__control"
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
      <template v-if="shouldRenderTime" #prepend>
        <QIcon name="o_event" class="cursor-pointer">
          <QPopupProxy
            ref="datePopupRef"
            class="base-date-picker__dropdown"
            cover
            :breakpoint="0"
            transition-show="scale"
            transition-hide="scale"
            @before-show="handlePopupShow"
            @before-hide="handlePopupHide"
          >
            <QDate
              :model-value="quasarValue"
              :mask="quasarValueMask"
              :readonly="isStructurallyDisabled"
              :range="isRangeMode"
              @update:model-value="handleQuasarDateValue"
            >
              <div class="row items-center justify-end">
                <QBtn label="Close" color="primary" flat @click="closeDatePopup" />
              </div>
            </QDate>
          </QPopupProxy>
        </QIcon>
      </template>

      <template #append>
        <QIcon :name="shouldRenderTime ? 'o_access_time' : 'o_event'" class="cursor-pointer">
          <QPopupProxy
            ref="appendPopupRef"
            class="base-date-picker__dropdown"
            cover
            :breakpoint="0"
            transition-show="scale"
            transition-hide="scale"
            @before-show="handlePopupShow"
            @before-hide="handlePopupHide"
          >
            <QDate
              v-if="!shouldRenderTime"
              :model-value="quasarValue"
              :mask="quasarValueMask"
              :readonly="isStructurallyDisabled"
              :range="isRangeMode"
              @update:model-value="handleQuasarDateValue"
            >
              <div class="row items-center justify-end">
                <QBtn label="Close" color="primary" flat @click="closeAppendPopup" />
              </div>
            </QDate>
            <QTime
              v-else
              :model-value="quasarSingleValue"
              :mask="quasarValueMask"
              :readonly="isStructurallyDisabled"
              :with-seconds="withSeconds"
              format24h
              @update:model-value="handleQuasarDateValue"
            >
              <div class="row items-center justify-end">
                <QBtn label="Close" color="primary" flat @click="closeAppendPopup" />
              </div>
            </QTime>
          </QPopupProxy>
        </QIcon>
      </template>
    </QInput>
  </BaseFieldShell>
</template>

<script setup lang="ts">
import { QBtn, QDate, QIcon, QInput, QPopupProxy, QTime } from 'quasar';
import { computed, ref, watch } from 'vue';

import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import {
  baseDatePickerDefaults,
  type BaseDatePickerEmits,
  type BaseDatePickerProps,
  type BaseDatePickerRangeValue,
  type BaseDatePickerState,
  type BaseDatePickerValue,
} from './base-date-picker.types';

type QuasarRangeValue = {
  from: string;
  to: string;
};

const props = withDefaults(defineProps<BaseDatePickerProps>(), baseDatePickerDefaults);

const emit = defineEmits<BaseDatePickerEmits>();

const appendPopupRef = ref<InstanceType<typeof QPopupProxy> | null>(null);
const datePopupRef = ref<InstanceType<typeof QPopupProxy> | null>(null);
const isFocused = ref(false);
const isOpen = ref(false);
const inputText = ref('');

const { controlId, labelId, messageId, status, message, isStructurallyDisabled } = useBaseField(
  props,
  'base-date-picker',
);

const isRangeMode = computed(() => props.mode === 'range');
const shouldRenderTime = computed(() => props.withTime && !isRangeMode.value);
const isError = computed(() => status.value === 'error');
const inputMask = computed(() => toInputMask(props.format, isRangeMode.value));
const quasarValueMask = computed(() => toQuasarPickerMask(props.valueFormat));
const hasValue = computed(() => isCompleteValue(props.modelValue));
const quasarValue = computed(() => toQuasarValue(props.modelValue));
const quasarSingleValue = computed(() =>
  typeof quasarValue.value === 'string' ? quasarValue.value : null,
);

watch(
  () => props.modelValue,
  (value) => {
    inputText.value = formatDisplayValue(value);
  },
  { immediate: true },
);

const visualState = computed<BaseDatePickerState>(() => {
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
  'base-date-picker',
  `base-picker--${visualState.value}`,
  `base-date-picker--${visualState.value}`,
  `base-date-picker--${props.mode}`,
]);

function handleQuasarDateValue(value: string | QuasarRangeValue | null): void {
  const normalizedValue = normalizeQuasarValue(value);

  inputText.value = formatDisplayValue(normalizedValue);
  emit('update:modelValue', cloneValue(normalizedValue));
}

function closeAppendPopup(): void {
  appendPopupRef.value?.hide();
}

function closeDatePopup(): void {
  datePopupRef.value?.hide();
}

function handleInputValue(value: string | number | null): void {
  const nextInputText = String(value ?? '');
  const parsedValue = parseInputValue(nextInputText);

  inputText.value = nextInputText;

  if (!nextInputText.trim() || isCompleteValue(parsedValue)) {
    emit('update:modelValue', cloneValue(parsedValue));
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

function normalizeQuasarValue(value: string | QuasarRangeValue | null): BaseDatePickerValue {
  if (isRangeMode.value) {
    if (!isQuasarRangeValue(value)) {
      return null;
    }

    return {
      from: normalizeDateSeparators(value.from),
      to: normalizeDateSeparators(value.to),
    };
  }

  return typeof value === 'string' && value.length > 0 ? normalizeDateSeparators(value) : null;
}

function toQuasarValue(value: BaseDatePickerValue | undefined): string | QuasarRangeValue | null {
  if (isRangeMode.value) {
    if (!isRangeValue(value)) {
      return null;
    }

    return {
      from: toQuasarDate(value.from),
      to: toQuasarDate(value.to),
    };
  }

  return typeof value === 'string' && value.length > 0 ? toQuasarDate(value) : null;
}

function formatDisplayValue(value: BaseDatePickerValue | undefined): string {
  if (isRangeMode.value) {
    if (!isRangeValue(value)) {
      return '';
    }

    return `${formatPickerValue(value.from, props.format)} - ${formatPickerValue(
      value.to,
      props.format,
    )}`;
  }

  return typeof value === 'string' && value.length > 0
    ? formatPickerValue(value, props.format)
    : '';
}

function parseInputValue(value: string): BaseDatePickerValue {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (isRangeMode.value) {
    const [from, to] = trimmedValue.split(/\s+-\s+/, 2);

    if (!from || !to) {
      return null;
    }

    const fromValue = parseFormattedDate(from, props.format);
    const toValue = parseFormattedDate(to, props.format);

    return fromValue && toValue ? { from: fromValue, to: toValue } : null;
  }

  return parseFormattedDate(trimmedValue, props.format);
}

function isCompleteValue(value: BaseDatePickerValue | undefined): boolean {
  if (isRangeMode.value) {
    return isRangeValue(value);
  }

  return typeof value === 'string' && value.length > 0;
}

function cloneValue(value: BaseDatePickerValue | undefined): BaseDatePickerValue {
  if (isRangeValue(value)) {
    return { from: value.from, to: value.to };
  }

  return typeof value === 'string' && value.length > 0 ? value : null;
}

function isRangeValue(value: BaseDatePickerValue | undefined): value is BaseDatePickerRangeValue {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'from' in value &&
    'to' in value &&
    typeof value.from === 'string' &&
    value.from.length > 0 &&
    typeof value.to === 'string' &&
    value.to.length > 0,
  );
}

function isQuasarRangeValue(value: unknown): value is QuasarRangeValue {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'from' in value &&
    'to' in value &&
    typeof value.from === 'string' &&
    value.from.length > 0 &&
    typeof value.to === 'string' &&
    value.to.length > 0,
  );
}

function toQuasarPickerMask(format: string): string {
  return format.replace(/-/g, '/');
}

function toInputMask(format: string, isRange: boolean): string {
  const inputMaskTokens: Record<string, string> = {
    D: '#',
    DD: '##',
    HH: '##',
    MMM: 'SSS',
    MM: '##',
    YYYY: '####',
    ddd: 'SSS',
    mm: '##',
    ss: '##',
  };
  const singleDateMask = format.replace(
    /YYYY|MMM|MM|DD|ddd|HH|mm|ss|D/g,
    (token) => inputMaskTokens[token] ?? token,
  );

  return isRange ? `${singleDateMask} - ${singleDateMask}` : singleDateMask;
}

function toQuasarDate(value: string): string {
  return normalizeDateSeparators(value).replace(/-/g, '/');
}

function normalizeDateSeparators(value: string): string {
  return value.replace(/\//g, '-');
}

function formatPickerValue(value: string, format: string): string {
  const date = parseDateValue(value);

  if (!date) {
    return '';
  }

  const tokens: Record<string, string> = {
    D: `${date.day}`,
    DD: `${date.day}`.padStart(2, '0'),
    HH: `${date.hour}`.padStart(2, '0'),
    MMM: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date.native),
    MM: `${date.month}`.padStart(2, '0'),
    YYYY: `${date.year}`,
    ddd: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date.native),
    mm: `${date.minute}`.padStart(2, '0'),
    ss: `${date.second}`.padStart(2, '0'),
  };

  return format.replace(/YYYY|MMM|MM|DD|ddd|HH|mm|ss|D/g, (token) => tokens[token] ?? token);
}

function parseFormattedDate(value: string, format: string): string | null {
  const parsedInput = parseDateInputByFormat(value, format);

  if (!parsedInput) {
    return null;
  }

  const year = Number(parsedInput.YYYY);
  const month = parsedInput.MM ? Number(parsedInput.MM) : parseShortMonth(parsedInput.MMM);
  const day = Number(parsedInput.DD ?? parsedInput.D);
  const hour = Number(parsedInput.HH ?? 0);
  const minute = Number(parsedInput.mm ?? 0);
  const second = Number(parsedInput.ss ?? 0);

  if (!year || !month || !day) {
    return null;
  }

  const formattedValue = formatDateParts(year, month, day, props.valueFormat, hour, minute, second);

  if (!formattedValue || !isMatchingWeekday(year, month, day, parsedInput.ddd)) {
    return null;
  }

  return formattedValue;
}

function parseDateInputByFormat(value: string, format: string): Record<string, string> | null {
  const tokenPattern = /YYYY|MMM|MM|DD|ddd|HH|mm|ss|D/g;
  const tokens: string[] = [];
  let pattern = '^';
  let lastIndex = 0;

  for (const match of format.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;

    pattern += escapeRegex(format.slice(lastIndex, index));
    pattern += getDateTokenCapturePattern(token);
    tokens.push(token);
    lastIndex = index + token.length;
  }

  pattern += escapeRegex(format.slice(lastIndex));
  pattern += '$';

  const match = new RegExp(pattern, 'i').exec(value.trim());

  if (!match) {
    return null;
  }

  return tokens.reduce<Record<string, string>>((parts, token, index) => {
    parts[token] = match[index + 1] ?? '';
    return parts;
  }, {});
}

function getDateTokenCapturePattern(token: string): string {
  const capturePatterns: Record<string, string> = {
    D: '(\\d{1,2})',
    DD: '(\\d{1,2})',
    HH: '(\\d{1,2})',
    MMM: '([A-Za-z]{3})',
    MM: '(\\d{1,2})',
    YYYY: '(\\d{4})',
    ddd: '([A-Za-z]{3})',
    mm: '(\\d{1,2})',
    ss: '(\\d{1,2})',
  };

  return capturePatterns[token] ?? escapeRegex(token);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseShortMonth(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const monthIndex = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(2026, index, 1)),
  ).findIndex((month) => month.toLowerCase() === value.toLowerCase());

  return monthIndex >= 0 ? monthIndex + 1 : null;
}

function isMatchingWeekday(
  year: number,
  month: number,
  day: number,
  weekday: string | undefined,
): boolean {
  if (!weekday) {
    return true;
  }

  const expectedWeekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(
    new Date(year, month - 1, day),
  );

  return expectedWeekday.toLowerCase() === weekday.toLowerCase();
}

function formatDateParts(
  year: number,
  month: number,
  day: number,
  format: string,
  hour = 0,
  minute = 0,
  second = 0,
): string | null {
  const nativeDate = new Date(year, month - 1, day, hour, minute, second);

  if (
    nativeDate.getFullYear() !== year ||
    nativeDate.getMonth() !== month - 1 ||
    nativeDate.getDate() !== day ||
    nativeDate.getHours() !== hour ||
    nativeDate.getMinutes() !== minute ||
    nativeDate.getSeconds() !== second
  ) {
    return null;
  }

  const tokens: Record<string, string> = {
    D: `${day}`,
    DD: `${day}`.padStart(2, '0'),
    HH: `${hour}`.padStart(2, '0'),
    MM: `${month}`.padStart(2, '0'),
    YYYY: `${year}`,
    mm: `${minute}`.padStart(2, '0'),
    ss: `${second}`.padStart(2, '0'),
  };

  return format.replace(/YYYY|MM|DD|HH|mm|ss|D/g, (token) => tokens[token] ?? token);
}

function parseDateValue(value: string): {
  day: number;
  month: number;
  native: Date;
  hour: number;
  minute: number;
  second: number;
  year: number;
} | null {
  const normalizedValue = normalizeDateSeparators(value);
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/.exec(
    normalizedValue,
  );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  const second = Number(match[6] ?? 0);

  if (
    !year ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  return {
    day,
    hour,
    minute,
    month,
    native: new Date(year, month - 1, day, hour, minute, second),
    second,
    year,
  };
}
</script>

<style src="./base-date-picker.css"></style>
