<template>
  <BaseFieldShell
    :class="[
      'ds-dropdown-list',
      `ds-dropdown-list--${size}`,
      {
        'ds-dropdown-list--disabled': disabled,
        'ds-dropdown-list--loading': loading,
        'ds-dropdown-list--readonly': readonly,
      },
    ]"
    :control-id="controlId"
    :label-id="labelId"
    :message-id="messageId"
    :label="label"
    :message="message"
    :required="required"
    :status="status"
    :block="block"
  >
    <ASelect
      :id="controlId"
      class="ds-dropdown-list__control"
      role="group"
      :aria-label="label ? undefined : ariaLabel"
      :aria-labelledby="label ? labelId : undefined"
      :aria-describedby="message ? messageId : undefined"
      :aria-invalid="status === 'error' || undefined"
      :aria-busy="loading || undefined"
      :value="modelValue"
      :options="options"
      :size="antSize"
      :status="antStatus"
      :mode="multiple ? 'multiple' : undefined"
      :show-search="searchable && !readonly"
      :filter-option="searchable && !readonly ? filterOption : false"
      :allow-clear="clearable && !isValueLocked"
      :loading="loading"
      :disabled="isStructurallyDisabled"
      :autofocus="autofocus"
      :open="readonly ? false : undefined"
      :placeholder="visiblePlaceholder"
      :popup-class-name="popupClassName"
      @change="handleChange"
      @clear="handleClear"
      @focus="handleFocus"
      @blur="handleBlur"
    />
  </BaseFieldShell>
</template>

<script setup lang="ts">
/**
 * BaseDropdownList wraps Ant Design Vue Select behind the Base Component API.
 *
 * Ant Select has no native readonly mode. Readonly therefore keeps the Select enabled and
 * focusable, controls `open` as false, disables search/clear, and guards every value event.
 * This preserves readable, non-disabled semantics while preventing value changes.
 */
import { Select as ASelect } from 'ant-design-vue';
import { computed } from 'vue';

import type { BaseComponentSize, BaseComponentStatus } from '../shared/base-field.types';
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

type AntSelectSize = 'small' | 'middle' | 'large';

const ANT_SELECT_SIZE_BY_BASE_SIZE: Record<BaseComponentSize, AntSelectSize> = {
  small: 'small',
  medium: 'middle',
  large: 'large',
};

type AntSelectStatus = 'warning' | 'error' | undefined;

function toAntSelectSize(size: BaseComponentSize): AntSelectSize {
  return ANT_SELECT_SIZE_BY_BASE_SIZE[size];
}

/*
 * Ant Select has no native `success` status. The public success state remains a Base
 * Component CSS hook, while only Ant-supported warning/error values cross this boundary.
 */
function toAntSelectStatus(baseStatus: BaseComponentStatus): AntSelectStatus {
  return baseStatus === 'warning' || baseStatus === 'error' ? baseStatus : undefined;
}

const antSize = computed(() => toAntSelectSize(props.size));
const antStatus = computed(() => toAntSelectStatus(status.value));
const popupClassName = computed(
  () => `ds-dropdown-list__popup ds-dropdown-list__popup--${props.size}`,
);

const hasValue = computed(() =>
  Array.isArray(props.modelValue) ? props.modelValue.length > 0 : props.modelValue !== undefined,
);
const visiblePlaceholder = computed(() =>
  props.readonly && !hasValue.value ? undefined : props.placeholder,
);

/*
 * Ant Select 4.2 exposes `id` publicly, so BaseFieldShell's `<label for>` remains stable.
 * It does not expose an input-attrs API. Accessible group metadata is therefore passed
 * through the component's public attr boundary; this intentionally avoids querying or
 * mutating Ant's private combobox DOM. `aria-required` and `aria-readonly` are not placed
 * on role=group because those states are not valid for that role.
 * TODO(a11y): forward those states when Ant exposes a supported combobox-input API.
 */

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

function handleChange(value: unknown): void {
  if (isValueLocked.value || !isBaseDropdownValue(value)) return;

  emit('update:modelValue', value);
  emit('change', value);
}

function handleClear(): void {
  if (!isValueLocked.value) emit('clear');
}

function handleFocus(event: FocusEvent): void {
  emit('focus', event);
}

function handleBlur(event: FocusEvent): void {
  emit('blur', event);
}

function filterOption(input: string, option?: unknown): boolean {
  if (option === undefined || option === null || typeof option !== 'object') return false;

  const label = 'label' in option ? option.label : undefined;

  return typeof label === 'string' && label.toLowerCase().includes(input.toLowerCase());
}
</script>

<style src="./base-dropdown-list.css"></style>
