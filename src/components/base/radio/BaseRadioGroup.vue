<template>
  <BaseFieldShell
    class="ds-radio-group"
    :class="{
      'ds-radio-group--disabled': disabled,
      'ds-radio-group--readonly': readonly,
      'ds-radio-group--loading': loading,
    }"
    :control-id="controlId"
    :label-id="labelId"
    :message-id="messageId"
    :label="label"
    :message="message"
    :required="required"
    :status="status"
    :block="block"
    :layout="layout"
  >
    <div
      class="ds-radio-group__boundary"
      role="radiogroup"
      :aria-label="label ? undefined : accessibleName"
      :aria-labelledby="label ? labelId : undefined"
      :aria-describedby="message ? messageId : undefined"
      :aria-invalid="status === 'error' || undefined"
      :aria-required="required || undefined"
      :aria-readonly="readonly || undefined"
      :aria-busy="loading || undefined"
      :aria-disabled="!hasEnabledOption || undefined"
      @click.capture="handleReadonlyClick"
      @keydown.capture="handleReadonlyKeydown"
      @focusin="handleFocusIn"
      @focusout="handleFocusOut"
    >
      <ARadioGroup
        class="ds-radio-group__control"
        :value="modelValue"
        :disabled="isStructurallyDisabled || !hasEnabledOption"
        :name="name"
        @update:value="handleUpdate"
        @change="handleChange"
      >
        <ARadio
          v-for="(option, index) in options"
          :key="option.value"
          class="ds-radio-group__option"
          :id="index === firstEnabledOptionIndex ? controlId : undefined"
          :value="option.value"
          :disabled="isStructurallyDisabled || !hasEnabledOption || option.disabled"
          :autofocus="autofocus && index === firstEnabledOptionIndex"
        >
          {{ option.label }}
        </ARadio>
      </ARadioGroup>
    </div>
  </BaseFieldShell>
</template>

<script setup lang="ts">
/**
 * BaseRadioGroup owns the group boundary so readonly can be enforced without querying Ant's DOM.
 * The group remains focusable/readable; only pointer and keyboard activation are cancelled.
 */
import { Radio as ARadio, RadioGroup as ARadioGroup } from 'ant-design-vue';
import type { RadioChangeEvent } from 'ant-design-vue/es/radio/interface';
import { computed } from 'vue';

import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import {
  baseRadioGroupDefaults,
  type BaseRadioGroupEmits,
  type BaseRadioGroupProps,
  type BaseRadioValue,
} from './base-radio.types';

defineOptions({ name: 'BaseRadioGroup' });

const props = withDefaults(defineProps<BaseRadioGroupProps>(), baseRadioGroupDefaults);
const emit = defineEmits<BaseRadioGroupEmits>();

const { controlId, labelId, messageId, status, message, isStructurallyDisabled, isValueLocked } =
  useBaseField(props, 'base-radio-group');

const firstEnabledOptionIndex = computed(() =>
  props.options.findIndex((option) => !option.disabled),
);
const hasEnabledOption = computed(() => firstEnabledOptionIndex.value >= 0);
const accessibleName = computed(() => props.label ?? props.ariaLabel ?? 'Radio group');

function isRadioValue(value: unknown): value is BaseRadioValue {
  return typeof value === 'string' || typeof value === 'number';
}

function handleUpdate(value: unknown): void {
  if (!isValueLocked.value && isRadioValue(value)) emit('update:modelValue', value);
}

function handleChange(event: RadioChangeEvent): void {
  if (!isValueLocked.value && isRadioValue(event.target.value)) {
    emit('change', event.target.value, event.nativeEvent);
  }
}

function handleReadonlyClick(event: MouseEvent): void {
  if (!props.readonly) return;
  event.preventDefault();
  event.stopPropagation();
}

function handleReadonlyKeydown(event: KeyboardEvent): void {
  if (
    props.readonly &&
    [' ', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
  ) {
    event.preventDefault();
  }
}

function handleFocusIn(event: FocusEvent): void {
  const boundary = event.currentTarget;
  if (boundary instanceof HTMLElement && !boundary.contains(event.relatedTarget as Node | null)) {
    emit('focus', event);
  }
}

function handleFocusOut(event: FocusEvent): void {
  const boundary = event.currentTarget;
  if (boundary instanceof HTMLElement && !boundary.contains(event.relatedTarget as Node | null)) {
    emit('blur', event);
  }
}
</script>

<style scoped src="./base-radio.css" />
