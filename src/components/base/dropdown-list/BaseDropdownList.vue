<template>
  <BaseFieldShell
    :class="[
      'ds-dropdown-list',
      `ds-dropdown-list--${size}`,
      {
        'ds-dropdown-list--disabled': disabled,
        'ds-dropdown-list--loading': loading,
        'ds-dropdown-list--required': required,
        'ds-dropdown-list--readonly': readonly,
      },
    ]"
    :control-id="controlId"
    :label-id="labelId"
    :message-id="messageId"
    :message="message"
    :status="status"
    :block="block"
  >
    <QSelect
      :for="controlId"
      class="ds-dropdown-list__control"
      :aria-label="label || ariaLabel"
      :aria-describedby="message ? messageId : undefined"
      :aria-invalid="status === 'error' || undefined"
      :aria-busy="loading || undefined"
      :aria-required="required || undefined"
      :label="label"
      :required="required"
      :model-value="modelValue ?? null"
      filled
      hide-bottom-space
      :options="searchable && !readonly ? filteredOptions : options"
      option-label="label"
      option-value="value"
      option-disable="disabled"
      emit-value
      map-options
      :multiple="multiple"
      :use-input="searchable && !readonly"
      :input-debounce="0"
      options-dense
      :virtual-scroll-item-size="36"
      :clearable="clearable && !isValueLocked"
      :loading="loading"
      :disable="isStructurallyDisabled"
      :readonly="readonly"
      :error="status === 'error'"
      :display-value="displayValue"
      :hide-dropdown-icon="Boolean($slots.indicator)"
      :autofocus="autofocus"
      :placeholder="visiblePlaceholder"
      behavior="menu"
      :popup-content-class="popupContentClass"
      v-on="filterListeners"
      @update:model-value="handleUpdate"
      @clear="handleClear"
      @focus="handleFocus"
      @blur="handleBlur"
    >
      <template v-if="$slots.indicator" #append><slot name="indicator" /></template>
    </QSelect>
  </BaseFieldShell>
</template>

<script setup lang="ts">
/**
 * BaseDropdownList wraps Quasar QSelect behind the Base Component API.
 *
 * Readonly keeps QSelect focusable while preventing its popup, search, clear, and value changes.
 */
import { QSelect } from 'quasar';
import { computed, ref, watch } from 'vue';

import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import {
  baseDropdownListDefaults,
  type BaseDropdownListEmits,
  type BaseDropdownListProps,
  type BaseDropdownValue,
  type BaseOptionValue,
} from './base-dropdown-list.types';

defineOptions({ name: 'BaseDropdownList' });

const props = withDefaults(defineProps<BaseDropdownListProps>(), baseDropdownListDefaults);
const emit = defineEmits<BaseDropdownListEmits>();

const { controlId, labelId, messageId, status, message, isStructurallyDisabled, isValueLocked } =
  useBaseField(props, 'base-dropdown-list');

const popupContentClass = computed(() => `ds-dropdown-list__popup--${props.size}`);
const filterListeners = computed(() =>
  props.searchable && !props.readonly ? { filter: filterOptions } : {},
);
const filteredOptions = ref(props.options);

watch(
  () => props.options,
  (options) => {
    filteredOptions.value = options;
  },
);

const hasValue = computed(() =>
  Array.isArray(props.modelValue) ? props.modelValue.length > 0 : props.modelValue !== undefined,
);
const visiblePlaceholder = computed(() =>
  props.readonly && !hasValue.value ? undefined : props.placeholder,
);
const displayValue = computed(() =>
  hasValue.value || props.searchable ? undefined : visiblePlaceholder.value,
);

function isBaseOptionValue(value: unknown): value is BaseOptionValue {
  return typeof value === 'string' || typeof value === 'number';
}

function isBaseDropdownValue(value: unknown): value is BaseDropdownValue {
  return (
    value === undefined ||
    isBaseOptionValue(value) ||
    (Array.isArray(value) && value.every(isBaseOptionValue))
  );
}

function handleUpdate(value: unknown): void {
  if (isValueLocked.value) return;

  const normalizedValue = value === null ? undefined : value;
  if (!isBaseDropdownValue(normalizedValue)) return;

  emit('update:modelValue', normalizedValue);
  emit('change', normalizedValue);
}

function filterOptions(
  input: string,
  updateOptions: (apply: () => void, afterUpdate?: () => void) => void,
  abort: () => void,
): void {
  if (!props.searchable || props.readonly || isValueLocked.value) {
    abort();
    return;
  }

  const normalizedInput = input.trim().toLowerCase();
  updateOptions(() => {
    filteredOptions.value = normalizedInput
      ? props.options.filter(({ label }) => label.toLowerCase().includes(normalizedInput))
      : props.options;
  });
}

function handleClear(): void {
  if (!isValueLocked.value) emit('clear');
}

function handleFocus(event: Event): void {
  emit('focus', event as FocusEvent);
}

function handleBlur(event: Event): void {
  emit('blur', event as FocusEvent);
}
</script>

<style src="./base-dropdown-list.css"></style>
