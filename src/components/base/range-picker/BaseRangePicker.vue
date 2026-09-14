<template>
  <BaseFieldShell
    :class="rangeRootClasses"
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
    <div
      class="base-range-picker__accessibility"
      v-bind="rangeAccessibilityAttributes"
      @click="focusRangePicker"
    >
      <ARangePicker
        ref="pickerRef"
        class="base-range-picker__control base-range-picker__control--range"
        v-bind="pickerAttributes"
        @blur="handleBlur"
        @focus="handleFocus"
        @update:value="emitModelValue"
      >
        <template #separator>
          <ArrowRightOutlined class="base-range-picker__range-arrow" />
        </template>
      </ARangePicker>
    </div>
  </BaseFieldShell>
</template>

<script setup lang="ts">
import { ArrowRightOutlined } from '@ant-design/icons-vue';
import { RangePicker as ARangePicker } from 'ant-design-vue';
import { computed, h, nextTick, ref, watch } from 'vue';

import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import {
  baseRangePickerDefaults,
  type BaseRangePickerEmits,
  type BaseRangePickerProps,
  type BaseRangePickerState,
  type BaseRangePickerValue,
} from './base-range-picker.types';

type PickerPanelMode =
  | 'date'
  | 'month'
  | 'year'
  | 'decade'
  | 'time'
  | 'datetime'
  | 'week'
  | 'quarter';

const props = withDefaults(defineProps<BaseRangePickerProps>(), {
  ...baseRangePickerDefaults,
  placeholder: () => [...baseRangePickerDefaults.placeholder],
});

const emit = defineEmits<BaseRangePickerEmits>();

const pickerRef = ref<InstanceType<typeof ARangePicker> | null>(null);
const activeRangeInputIndex = ref<number | null>(null);
const isFocused = ref(false);
const isOpen = ref(false);
const draftValue = ref<BaseRangePickerValue>(cloneRangeValue(props.modelValue ?? null));
const ignoreNextSelectionClose = ref(false);
const keepDraftOnNextClose = ref(false);
const hasValue = computed(
  () => Array.isArray(props.modelValue) && props.modelValue.every((value) => value.length > 0),
);

const { controlId, labelId, messageId, status, message, isStructurallyDisabled } = useBaseField(
  props,
  'base-range-picker',
);

const isError = computed(() => status.value === 'error');
const pickerStatus = computed<'' | 'error'>(() => (isError.value ? 'error' : ''));

const visualState = computed<BaseRangePickerState>(() => {
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
  'base-range-picker',
  `base-range-picker--${props.layout}`,
  `base-range-picker--${visualState.value}`,
]);

const rangeRootClasses = computed(() => [
  ...rootClasses.value,
  'base-range-picker--range',
  activeRangeInputIndex.value === 0 && 'base-range-picker--range-start-active',
  activeRangeInputIndex.value === 1 && 'base-range-picker--range-end-active',
]);
const hasShowTime = computed(() => Boolean(props.showTime));
const rangeAccessibilityAttributes = computed(() => ({
  id: controlId.value,
  role: 'group',
  'aria-labelledby': props.label ? labelId.value : undefined,
  'aria-describedby': message.value ? messageId.value : undefined,
  'aria-invalid': isError.value || undefined,
  'aria-required': props.required || undefined,
}));

const pickerAttributes = computed(() => {
  const sharedAttributes = {
    disabled: isStructurallyDisabled.value,
    format: props.format,
    inputReadOnly: props.inputReadOnly,
    placeholder: props.placeholder,
    popupClassName: 'base-range-picker__dropdown',
    showTime: props.showTime,
    size: props.size === 'small' ? ('small' as const) : ('middle' as const),
    status: pickerStatus.value,
    valueFormat: props.valueFormat,
  };

  if (hasShowTime.value) {
    return {
      ...sharedAttributes,
      value: props.modelValue ?? undefined,
    };
  }

  return {
    ...sharedAttributes,
    onCalendarChange: handleCalendarChange,
    onOpenChange: handleOpenChange,
    open: isOpen.value,
    renderExtraFooter,
    value: draftValue.value ?? undefined,
  };
});

watch(
  () => props.modelValue,
  (nextValue) => {
    if (!isOpen.value) {
      draftValue.value = cloneRangeValue(nextValue ?? null);
    }
  },
);

function emitModelValue(value: unknown): void {
  if (value === null || value === undefined) {
    draftValue.value = null;
    emit('update:modelValue', null);
    ignoreNextSelectionClose.value = false;
    keepDraftOnNextClose.value = true;
    void nextTick(() => {
      keepDraftOnNextClose.value = false;
    });
    return;
  }

  if (hasShowTime.value) {
    emit('update:modelValue', normalizeRangeValue(value));
    return;
  }

  updateDraftValue(value);
}

function handleCalendarChange(value: unknown): void {
  updateDraftValue(value);
}

function updateDraftValue(value: unknown): void {
  draftValue.value = normalizeRangeValue(value);
  ignoreNextSelectionClose.value = true;
  void nextTick(() => {
    ignoreNextSelectionClose.value = false;
  });
}

function handleFocus(event: FocusEvent): void {
  isFocused.value = true;
  syncActiveRangeInput(event.target);
  emit('focus', event);
}

function handleBlur(event: FocusEvent): void {
  void nextTick(() => {
    const pickerElement = getPickerElement();

    if (!pickerElement?.contains(document.activeElement)) {
      activeRangeInputIndex.value = null;
      isFocused.value = false;
    }
  });
  emit('blur', event);
}

function focusRangePicker(): void {
  (pickerRef.value as { focus?: () => void } | null)?.focus?.();
}

function handleOpenChange(open: boolean): void {
  if (!open && ignoreNextSelectionClose.value) {
    return;
  }

  isOpen.value = open;

  if (!open) {
    activeRangeInputIndex.value = null;
    if (keepDraftOnNextClose.value) {
      keepDraftOnNextClose.value = false;
      ignoreNextSelectionClose.value = false;
      return;
    }

    draftValue.value = cloneRangeValue(props.modelValue ?? null);
    ignoreNextSelectionClose.value = false;
    return;
  }

  draftValue.value = cloneRangeValue(props.modelValue ?? null);
}

function handleOkClick(event: MouseEvent): void {
  event.stopPropagation();
  commitDraftValue();
}

function commitDraftValue(): void {
  emit('update:modelValue', cloneRangeValue(draftValue.value));
  keepDraftOnNextClose.value = true;
  isOpen.value = false;
  ignoreNextSelectionClose.value = false;
  void nextTick(() => {
    keepDraftOnNextClose.value = false;
  });
}

function renderExtraFooter(mode?: PickerPanelMode) {
  if (mode !== 'date') {
    return null;
  }

  return h('div', { class: 'base-range-picker__footer' }, [
    h(
      'button',
      {
        class: 'base-range-picker__ok',
        type: 'button',
        onClick: handleOkClick,
      },
      'OK',
    ),
  ]);
}

function normalizeRangeValue(value: unknown): BaseRangePickerValue {
  if (!Array.isArray(value) || value.length !== 2) {
    return null;
  }

  return [String(value[0]), String(value[1])];
}

function cloneRangeValue(value: BaseRangePickerValue): BaseRangePickerValue {
  return value ? [value[0], value[1]] : null;
}

function getInputElements(): HTMLInputElement[] {
  const pickerElement = getPickerElement();

  return Array.from(pickerElement?.querySelectorAll('input') ?? []);
}

function getPickerElement(): HTMLElement | null {
  return (pickerRef.value?.$el as HTMLElement | undefined) ?? null;
}

function syncActiveRangeInput(target: EventTarget | null): void {
  const inputs = getInputElements();
  const focusedIndex = inputs.findIndex((input) => input === target);

  if (focusedIndex !== -1) {
    activeRangeInputIndex.value = focusedIndex;
  }
}
</script>

<style src="./base-range-picker.css"></style>
