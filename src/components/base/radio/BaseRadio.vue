<template>
  <BaseFieldShell
    class="ds-radio"
    :class="{
      'ds-radio--disabled': disabled,
      'ds-radio--readonly': readonly,
      'ds-radio--loading': loading,
    }"
    :control-id="controlId"
    :label-id="labelId"
    :message-id="messageId"
    :message="message"
    :required="required"
    :status="status"
    :block="block"
  >
    <div
      class="ds-radio__row"
      @click.capture="handleReadonlyClick"
      @keydown.capture="handleReadonlyKeydown"
    >
      <ARadio
        :id="controlId"
        class="ds-radio__control"
        :checked="modelValue"
        :disabled="isStructurallyDisabled"
        :autofocus="autofocus"
        :name="name"
        :aria-label="label ? undefined : ariaLabel"
        :aria-labelledby="label ? labelId : undefined"
        :aria-describedby="message ? messageId : undefined"
        :aria-invalid="status === 'error' || undefined"
        :aria-required="required || undefined"
        :aria-readonly="readonly || undefined"
        :aria-busy="loading || undefined"
        @update:checked="handleUpdate"
        @change="handleChange"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      />

      <label v-if="label" :id="labelId" :for="controlId" class="ds-radio__label">
        {{ label }}<span v-if="required" class="ds-radio__required" aria-hidden="true"> *</span>
      </label>
    </div>
  </BaseFieldShell>
</template>

<script setup lang="ts">
/**
 * BaseRadio wraps Ant Design Vue's radio while keeping the public contract framework-agnostic.
 * Ant has no readonly radio state, so readonly keeps the native control enabled and focusable,
 * then cancels activation and guards all value-changing events at this owned wrapper boundary.
 */
import { Radio as ARadio } from 'ant-design-vue';
import type { RadioChangeEvent } from 'ant-design-vue/es/radio/interface';

import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import { baseRadioDefaults, type BaseRadioEmits, type BaseRadioProps } from './base-radio.types';

defineOptions({ name: 'BaseRadio' });

const props = withDefaults(defineProps<BaseRadioProps>(), baseRadioDefaults);
const emit = defineEmits<BaseRadioEmits>();

const { controlId, labelId, messageId, status, message, isStructurallyDisabled, isValueLocked } =
  useBaseField(props, 'base-radio');

function handleUpdate(value: boolean): void {
  if (!isValueLocked.value) emit('update:modelValue', value);
}

function handleChange(event: RadioChangeEvent): void {
  if (!isValueLocked.value) emit('change', event.target.checked, event.nativeEvent);
}

function handleReadonlyClick(event: MouseEvent): void {
  if (!props.readonly) return;
  event.preventDefault();
  event.stopPropagation();
}

function handleReadonlyKeydown(event: KeyboardEvent): void {
  if (props.readonly && (event.key === ' ' || event.key === 'Enter')) event.preventDefault();
}
</script>

<style scoped src="./base-radio.css" />
