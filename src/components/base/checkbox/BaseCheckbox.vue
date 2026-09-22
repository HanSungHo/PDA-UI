<template>
  <BaseFieldShell
    class="ds-checkbox"
    :class="{
      'ds-checkbox--disabled': disabled,
      'ds-checkbox--readonly': readonly,
      'ds-checkbox--loading': loading,
    }"
    :control-id="controlId"
    :label-id="labelId"
    :message-id="messageId"
    :message="message"
    :required="required"
    :status="status"
    :block="block"
  >
    <div class="ds-checkbox__row">
      <ACheckbox
        :id="controlId"
        class="ds-checkbox__control"
        :checked="modelValue"
        :disabled="isStructurallyDisabled"
        :autofocus="autofocus"
        :aria-label="label ? undefined : accessibleName"
        :aria-labelledby="label ? labelId : undefined"
        :aria-describedby="message ? messageId : undefined"
        :aria-invalid="status === 'error' || undefined"
        :aria-required="required || undefined"
        :aria-readonly="readonly || undefined"
        :aria-busy="loading || undefined"
        @update:checked="handleUpdate"
        @change="handleChange"
        @click="handleClick"
        @keydown.space="handleSpace"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      >
        <label v-if="label" :id="labelId" :for="controlId" class="ds-checkbox__label">
          {{ label }}
          <span v-if="required" class="ds-checkbox__required" aria-hidden="true"> *</span>
        </label>
      </ACheckbox>
    </div>
  </BaseFieldShell>
</template>

<script setup lang="ts">
import { Checkbox as ACheckbox } from 'ant-design-vue';
import type { CheckboxChangeEvent } from 'ant-design-vue/es/checkbox/interface';
import { computed } from 'vue';

import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import {
  baseCheckboxDefaults,
  type BaseCheckboxEmits,
  type BaseCheckboxProps,
} from './base-checkbox.types';

defineOptions({ name: 'BaseCheckbox' });

const props = withDefaults(defineProps<BaseCheckboxProps>(), baseCheckboxDefaults);
const emit = defineEmits<BaseCheckboxEmits>();

const { controlId, labelId, messageId, status, message, isStructurallyDisabled, isValueLocked } =
  useBaseField(props, 'base-checkbox');
const accessibleName = computed(() => props.label ?? props.ariaLabel ?? 'Checkbox');

function handleUpdate(value: boolean): void {
  if (!isValueLocked.value) emit('update:modelValue', value);
}

function handleChange(event: CheckboxChangeEvent): void {
  if (!isValueLocked.value) emit('change', event.target.checked, event.nativeEvent);
}

/**
 * Ant Design Vue has no readonly checkbox state. Keep the real checkbox
 * focusable and visually enabled, while cancelling pointer and keyboard
 * activation and guarding every value-changing emit.
 */
function handleClick(event: MouseEvent): void {
  if (!props.readonly) return;
  event.preventDefault();
  event.stopPropagation();
}

function handleSpace(event: KeyboardEvent): void {
  if (props.readonly) event.preventDefault();
}
</script>

<style scoped src="./base-checkbox.css" />
