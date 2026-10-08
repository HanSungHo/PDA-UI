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
      ref="boundary"
      class="ds-radio-group__boundary"
      role="radiogroup"
      :aria-label="label ? undefined : accessibleName"
      :aria-labelledby="label ? labelId : undefined"
      :aria-describedby="message ? messageId : undefined"
      :aria-invalid="status === 'error' || undefined"
      :aria-required="required || undefined"
      :aria-readonly="readonly || undefined"
      :aria-busy="loading || undefined"
      :aria-disabled="isStructurallyDisabled || !hasEnabledOption || undefined"
      @click.capture="handleReadonlyClick"
      @keydown.capture="handleKeydown"
      @focusin="handleFocusIn"
      @focusout="handleFocusOut"
    >
      <div class="ds-radio-group__control" :class="`ds-radio-group__control--${layout}`">
        <QRadio
          v-for="(option, index) in options"
          :key="option.value"
          class="ds-radio-group__option"
          :class="{ 'ds-radio-group__option--disabled': option.disabled }"
          :id="index === firstEnabledOptionIndex ? controlId : undefined"
          :model-value="modelValue"
          :val="option.value"
          :name="name"
          :disable="isStructurallyDisabled || Boolean(option.disabled)"
          :tabindex="tabIndexForOption(index)"
          :data-option-index="index"
          :aria-label="option.label"
          :aria-describedby="message ? messageId : undefined"
          :aria-invalid="status === 'error' || undefined"
          :aria-required="required || undefined"
          @update:model-value="(value, event) => handleUpdate(value, event)"
        >
          <span class="ds-radio-group__label">{{ option.label }}</span>
        </QRadio>
      </div>
    </div>
  </BaseFieldShell>
</template>

<script setup lang="ts">
/**
 * BaseRadioGroup owns the readonly boundary while preserving the scalar model and option contract.
 */
import { QRadio } from 'quasar';
import { computed, nextTick, onMounted, ref } from 'vue';

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
const boundary = ref<HTMLElement>();
const focusedOptionIndex = ref<number | null>(null);

const selectedTabIndex = computed(() => {
  const selectedIndex = props.options.findIndex(
    (option) => option.value === props.modelValue && !option.disabled,
  );
  return selectedIndex >= 0 ? selectedIndex : firstEnabledOptionIndex.value;
});

onMounted(() => {
  if (props.autofocus) focusOption(selectedTabIndex.value);
});

function tabIndexForOption(index: number): number {
  const tabIndex = focusedOptionIndex.value ?? selectedTabIndex.value;
  return index === tabIndex && !props.options[index]?.disabled ? 0 : -1;
}

function isRadioValue(value: unknown): value is BaseRadioValue {
  return typeof value === 'string' || typeof value === 'number';
}

function handleUpdate(value: unknown, event?: Event): void {
  if (isValueLocked.value || !isRadioValue(value)) return;
  focusedOptionIndex.value = props.options.findIndex((option) => option.value === value);
  emit('update:modelValue', value);
  if (event) emit('change', value, event);
}

function handleReadonlyClick(event: MouseEvent): void {
  if (!props.readonly) return;
  event.preventDefault();
  event.stopPropagation();
}

function handleKeydown(event: KeyboardEvent): void {
  if (
    props.readonly &&
    [' ', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
  ) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  const directions: Record<string, number> = {
    ArrowDown: 1,
    ArrowRight: 1,
    ArrowUp: -1,
    ArrowLeft: -1,
  };
  const direction = directions[event.key];
  if (direction === undefined || isValueLocked.value || !hasEnabledOption.value) return;

  const eventTarget = event.target;
  const radioOption =
    eventTarget instanceof Element ? eventTarget.closest<HTMLElement>('[data-option-index]') : null;
  const current = Number(radioOption?.dataset.optionIndex);
  if (!Number.isInteger(current)) return;
  event.preventDefault();

  const nextIndex = findNextEnabledOption(current, direction);
  const nextValue = props.options[nextIndex]?.value;
  if (nextValue === undefined) return;
  handleUpdate(nextValue, event);
  void nextTick(() => focusOption(nextIndex));
}

function findNextEnabledOption(current: number, direction: number): number {
  const { options } = props;
  for (let step = 1; step <= options.length; step += 1) {
    const index = (current + direction * step + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }
  return firstEnabledOptionIndex.value;
}

function focusOption(index: number): void {
  boundary.value?.querySelector<HTMLElement>(`[data-option-index="${index}"]`)?.focus();
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
