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
      ref="radioRow"
      class="ds-radio__row"
      @click.capture="handleReadonlyClick"
      @keydown.capture="handleReadonlyKeydown"
      @keyup.capture="handleReadonlyKeydown"
    >
      <QRadio
        :id="controlId"
        class="ds-radio__control"
        :model-value="modelValue"
        :val="true"
        :disable="isStructurallyDisabled"
        :tabindex="isStructurallyDisabled ? -1 : 0"
        :name="name"
        :aria-label="label ? undefined : ariaLabel"
        :aria-labelledby="label ? labelId : undefined"
        :aria-describedby="message ? messageId : undefined"
        :aria-invalid="status === 'error' || undefined"
        :aria-required="required || undefined"
        :aria-readonly="readonly || undefined"
        :aria-busy="loading || undefined"
        @update:model-value="handleUpdate"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      >
        <span v-if="label" :id="labelId" class="ds-radio__label">
          {{ label }}<span v-if="required" class="ds-radio__required" aria-hidden="true"> *</span>
        </span>
      </QRadio>
    </div>
  </BaseFieldShell>
</template>

<script setup lang="ts">
import { QRadio } from 'quasar';
import { onMounted, ref } from 'vue';

import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import { baseRadioDefaults, type BaseRadioEmits, type BaseRadioProps } from './base-radio.types';

defineOptions({ name: 'BaseRadio' });

const props = withDefaults(defineProps<BaseRadioProps>(), baseRadioDefaults);
const emit = defineEmits<BaseRadioEmits>();

const { controlId, labelId, messageId, status, message, isStructurallyDisabled, isValueLocked } =
  useBaseField(props, 'base-radio');
const radioRow = ref<HTMLElement>();

onMounted(() => {
  if (props.autofocus) radioRow.value?.querySelector<HTMLElement>('[role="radio"]')?.focus();
});

function handleUpdate(value: unknown, event?: Event): void {
  if (isValueLocked.value || value !== true) return;
  emit('update:modelValue', true);
  if (event) emit('change', true, event);
}

function handleReadonlyClick(event: MouseEvent): void {
  if (!props.readonly) return;
  event.preventDefault();
  event.stopPropagation();
}

function handleReadonlyKeydown(event: KeyboardEvent): void {
  if (!props.readonly || ![' ', 'Enter'].includes(event.key)) return;
  event.preventDefault();
  event.stopPropagation();
}
</script>

<style scoped src="./base-radio.css" />
