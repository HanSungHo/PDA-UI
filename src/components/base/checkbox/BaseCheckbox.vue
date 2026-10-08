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
    <div
      class="ds-checkbox__row"
      @click.capture="handleReadonlyClick"
      @keydown.capture="handleReadonlyKeydown"
      @keyup.capture="handleReadonlyKeydown"
    >
      <QCheckbox
        :id="controlId"
        class="ds-checkbox__control"
        :model-value="quasarModelValue"
        :disable="isStructurallyDisabled"
        :autofocus="autofocus"
        :aria-label="label ? undefined : accessibleName"
        :aria-labelledby="label ? labelId : undefined"
        :aria-describedby="message ? messageId : undefined"
        :aria-invalid="status === 'error' || undefined"
        :aria-required="required || undefined"
        :aria-readonly="readonly || undefined"
        :aria-busy="loading || undefined"
        :toggle-indeterminate="false"
        @update:model-value="handleUpdate"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      >
        <span v-if="label" :id="labelId" class="ds-checkbox__label">
          {{ label }}
          <span v-if="required" class="ds-checkbox__required" aria-hidden="true"> *</span>
        </span>
      </QCheckbox>
    </div>
  </BaseFieldShell>
</template>

<script setup lang="ts">
import { QCheckbox } from 'quasar';
import { computed, ref, watch } from 'vue';

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
const localIndeterminate = ref(props.indeterminate);
const quasarModelValue = computed(() => (localIndeterminate.value ? null : props.modelValue));

watch(
  () => props.indeterminate,
  (value) => {
    localIndeterminate.value = value;
  },
);

function handleUpdate(value: boolean, event?: Event): void {
  if (isValueLocked.value) return;

  localIndeterminate.value = false;
  emit('update:modelValue', value);
  if (event) emit('change', value, event);
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

<style scoped src="./base-checkbox.css" />
