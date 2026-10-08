<template>
  <BaseFieldShell
    class="ds-toggle"
    :class="[`ds-toggle--${size}`, `ds-toggle--${variant}`, { 'ds-toggle--readonly': readonly }]"
    :control-id="controlId"
    :label-id="labelId"
    :message-id="messageId"
    :required="required"
    :status="status"
    :message="message"
    :block="block"
  >
    <div class="ds-toggle__row">
      <span v-if="label && labelPlacement === 'start'" :id="labelId" class="ds-toggle__label">
        {{ label }}<span v-if="required" class="ds-toggle__required" aria-hidden="true"> *</span>
      </span>

      <QToggle
        v-if="!isSegmented"
        :id="controlId"
        :model-value="selectedValue"
        :true-value="checkedValue"
        :false-value="uncheckedValue"
        :disable="isStructurallyDisabled"
        :size="quasarSize"
        color="primary"
        :aria-label="label ? undefined : ariaLabel"
        :aria-labelledby="label ? labelId : undefined"
        :aria-describedby="message ? messageId : undefined"
        :aria-invalid="status === 'error' || undefined"
        :aria-required="required || undefined"
        :aria-readonly="readonly || undefined"
        :aria-busy="loading || undefined"
        class="ds-toggle__switch"
        @update:model-value="handleUpdate"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      />

      <QBtnToggle
        v-else
        :id="controlId"
        :model-value="selectedValue"
        :options="variantOptions"
        :disable="isStructurallyDisabled"
        :readonly="readonly"
        flat
        no-caps
        toggle-color=""
        :class="[
          'ds-toggle__segments',
          `ds-toggle__segments--${variant}`,
          { 'ds-toggle__segments--readonly': readonly },
        ]"
        role="group"
        :aria-label="label ? undefined : ariaLabel"
        :aria-labelledby="label ? labelId : undefined"
        :aria-describedby="message ? messageId : undefined"
        :aria-invalid="status === 'error' || undefined"
        :aria-required="required || undefined"
        :aria-readonly="readonly || undefined"
        :aria-busy="loading || undefined"
        @update:model-value="handleVariantUpdate"
        @click="handleVariantClick"
        @focusin="emit('focus', $event)"
        @focusout="emit('blur', $event)"
      >
        <template #checked-icon>
          <span class="ds-toggle__segment-icon" aria-hidden="true" />
        </template>
        <template #unchecked-icon>
          <span class="ds-toggle__segment-icon" aria-hidden="true" />
        </template>
      </QBtnToggle>

      <span v-if="label && labelPlacement === 'end'" :id="labelId" class="ds-toggle__label">
        {{ label }}<span v-if="required" class="ds-toggle__required" aria-hidden="true"> *</span>
      </span>

      <span v-if="checkedText || uncheckedText" class="ds-toggle__state">
        {{ modelValue ? checkedText : uncheckedText }}
      </span>
    </div>
  </BaseFieldShell>
</template>

<script setup lang="ts">
import { QBtnToggle, QToggle } from 'quasar';
import { computed, ref } from 'vue';

import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import { baseToggleDefaults, normalizeCheckedValue } from './base-toggle.constants';
import type { BaseToggleEmits, BaseToggleProps, ToggleCheckedValue } from './base-toggle.types';

defineOptions({ name: 'BaseToggle' });

const props = withDefaults(defineProps<BaseToggleProps>(), baseToggleDefaults);
const emit = defineEmits<BaseToggleEmits>();

const { controlId, labelId, messageId, status, message, isStructurallyDisabled, isValueLocked } =
  useBaseField(props, 'base-toggle');

const isSegmented = computed(() =>
  ['segmented', 'segmented-alt', 'segmented-icon', 'icon'].includes(props.variant),
);
const selectedValue = computed(() =>
  props.modelValue ? props.checkedValue : props.uncheckedValue,
);
const quasarSize = computed(() => (props.size === 'small' ? '16px' : '20px'));
const pendingVariantValue = ref<boolean | undefined>();

interface ToggleButtonOption {
  value: ToggleCheckedValue;
  label?: string;
  slot?: string;
  attrs: Record<string, string>;
}

const variantOptions = computed<ToggleButtonOption[]>(() => {
  const iconOnly = props.variant === 'icon' || props.variant === 'segmented-icon';

  return [
    {
      value: props.checkedValue,
      label: iconOnly ? undefined : 'Published',
      slot: iconOnly ? 'checked-icon' : undefined,
      attrs: { 'aria-label': props.checkedText ?? 'Published' },
    },
    {
      value: props.uncheckedValue,
      label: iconOnly ? undefined : 'Unpublished',
      slot: iconOnly ? 'unchecked-icon' : undefined,
      attrs: { 'aria-label': props.uncheckedText ?? 'Unpublished' },
    },
  ];
});

function handleUpdate(value: ToggleCheckedValue, event?: Event): void {
  if (isValueLocked.value) return;
  const normalizedValue = normalizeCheckedValue(value, props.checkedValue);
  emit('update:modelValue', normalizedValue);
  if (event !== undefined) emit('change', normalizedValue, event);
}

function handleVariantUpdate(value: ToggleCheckedValue): void {
  if (isValueLocked.value) return;
  const normalizedValue = normalizeCheckedValue(value, props.checkedValue);
  if (normalizedValue === props.modelValue) return;
  pendingVariantValue.value = normalizedValue;
  emit('update:modelValue', normalizedValue);
}

function handleVariantClick(event: Event): void {
  const value = pendingVariantValue.value;
  pendingVariantValue.value = undefined;
  if (value !== undefined && !isValueLocked.value) emit('change', value, event);
}
</script>

<style src="./base-toggle.scss" />
