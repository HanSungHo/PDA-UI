<template>
  <BaseFieldShell
    :class="[
      'ds-input',
      `ds-input--${inputSize}`,
      {
        'ds-input--block': isBlock,
        'ds-input--disabled': disabled,
        'ds-input--loading': loading,
        'ds-input--readonly': readonly,
      },
    ]"
    :control-id="controlId"
    :label-id="labelId"
    :message-id="footerId"
    :label="label"
    :required="required"
    :status="status"
    :block="isBlock"
  >
    <div
      ref="controlRef"
      class="ds-input__control"
      :style="controlStyle"
      :class="[
        {
          'ds-input__textarea': inputMode === 'textarea',
          'ds-input__textarea--resizable': isTextareaResizable,
          'ds-input__control--custom-content': Boolean($slots.content),
          'ds-input__control--has-prefix': Boolean($slots.prefix),
          'ds-input__control--has-suffix':
            Boolean($slots.suffix) ||
            showClear ||
            Boolean(inputType === 'password' && showPasswordToggle),
        },
      ]"
    >
      <span v-if="$slots.prefix" class="ds-input__icon">
        <slot name="prefix" />
      </span>

      <span class="ds-input__value">
        <slot name="content" :input-id="controlId" :disabled="isStructurallyDisabled" />

        <component
          :is="inputMode === 'textarea' ? 'textarea' : 'input'"
          :id="controlId"
          ref="nativeInputRef"
          class="ds-input__native"
          :style="nativeInputStyle"
          :aria-label="label ? undefined : ariaLabel"
          :aria-labelledby="label ? labelId : undefined"
          :aria-describedby="hasFooter ? footerId : undefined"
          :aria-invalid="status === 'error' || undefined"
          :aria-busy="loading || undefined"
          :aria-required="required || undefined"
          :readonly="readonly"
          :disabled="isStructurallyDisabled"
          :type="inputMode === 'input' ? visibleType : undefined"
          :name="name"
          :autocomplete="autocomplete"
          :autofocus="autofocus"
          :placeholder="placeholder"
          :rows="inputMode === 'textarea' ? rows : undefined"
          :maxlength="maxLength"
          :value="modelValue ?? ''"
          @input="handleInput"
          @change="handleChange"
          @focus="emit('focus', $event)"
          @blur="emit('blur', $event)"
        />
      </span>

      <button
        v-if="isTextareaResizable"
        class="ds-input__resize-handle"
        type="button"
        aria-label="Resize textarea height"
        :aria-controls="controlId"
        @keydown="handleResizeKeydown"
        @pointerdown="handleResizePointerDown"
        @pointermove="handleResizePointerMove"
        @pointerup="handleResizePointerEnd"
        @pointercancel="handleResizePointerEnd"
      >
        <span class="ds-input__resizer" aria-hidden="true">
          <svg viewBox="0 0 8.35 8.35" focusable="false">
            <path d="M 8.17 4.17 L 4.17 8.17" />
            <path d="M 8.17 0.17 L 0.17 8.17" />
          </svg>
        </span>
      </button>

      <span v-if="$slots.suffix" class="ds-input__icon">
        <slot name="suffix" />
      </span>
      <button
        v-if="inputType === 'password' && showPasswordToggle"
        class="ds-input__action"
        type="button"
        :aria-label="passwordVisible ? 'Hide password' : 'Show password'"
        :disabled="isStructurallyDisabled"
        @click="passwordVisible = !passwordVisible"
      >
        <EyeInvisibleOutlined v-if="passwordVisible" />
        <EyeOutlined v-else />
      </button>
      <button
        v-if="showClear"
        class="ds-input__action"
        type="button"
        aria-label="Clear input"
        @click="handleClear"
      >
        <CloseOutlined />
      </button>
    </div>

    <p
      v-if="hasFooter"
      :id="footerId"
      class="ds-input__footer"
      :role="status === 'error' ? 'alert' : undefined"
    >
      <span v-if="message" class="ds-input__footer-left">
        <InfoCircleOutlined aria-hidden="true" />
        <span>{{ message }}</span>
      </span>
      <span v-if="showCount && maxLength" class="ds-input__count"
        >{{ currentLength }}/{{ maxLength }}</span
      >
    </p>
  </BaseFieldShell>
</template>

<script setup lang="ts">
import {
  CloseOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons-vue';
import { computed, ref } from 'vue';

import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import {
  type BaseInputEmits,
  type BaseInputMode,
  type BaseInputProps,
  type BaseInputType,
  type BaseInputValue,
} from './base-input.types';

defineOptions({ name: 'BaseInput' });

const props = defineProps<BaseInputProps>();
const emit = defineEmits<BaseInputEmits>();

const slots = defineSlots<{
  content?(props: { inputId: string; disabled: boolean }): unknown;
  prefix?(): unknown;
  suffix?(): unknown;
}>();

const { controlId, labelId, messageId, status, message, isStructurallyDisabled, isValueLocked } =
  useBaseField(props, 'base-input');

const passwordVisible = ref(false);
const controlRef = ref<HTMLElement | null>(null);
const nativeInputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);
const textareaHeight = ref<number>();
const resizeStart = ref<{ pointerId: number; clientY: number; height: number }>();

function focus(): void {
  nativeInputRef.value?.focus();
}

function select(): void {
  nativeInputRef.value?.select();
}

defineExpose({ focus, select });

const footerId = computed(() => messageId.value);
const inputMode = computed<BaseInputMode>(() => props.mode ?? 'input');
const inputType = computed<BaseInputType>(() => props.type ?? 'text');
const inputSize = computed(() => props.size ?? 'medium');
const isBlock = computed(() => props.block ?? true);
const hasFooter = computed(
  () => Boolean(message.value) || Boolean(props.showCount && props.maxLength),
);
const currentLength = computed(() => String(props.modelValue ?? '').length);
const isTextareaResizable = computed(
  () => inputMode.value === 'textarea' && props.resize !== 'none',
);
const nativeInputStyle = computed(() => {
  if (!slots.content || inputMode.value === 'textarea') return undefined;

  return { flexBasis: `${Math.max(currentLength.value, 1)}ch` };
});
const showClear = computed(
  () => props.clearable && !isValueLocked.value && String(props.modelValue ?? '').length > 0,
);
const visibleType = computed(() =>
  inputType.value === 'password' && passwordVisible.value ? 'text' : inputType.value,
);
const textareaMinHeightBySize = {
  small: 38,
  medium: 46,
  large: 46,
} as const;
const resizeKeyboardStep = 8;
const resizeKeyboardLargeStep = 24;
const minimumTextareaHeight = computed(() => textareaMinHeightBySize[inputSize.value]);
const controlStyle = computed(() => {
  if (inputMode.value !== 'textarea' || textareaHeight.value === undefined) return undefined;

  return { height: `${textareaHeight.value}px` };
});

function normalizeInputValue(event: Event): BaseInputValue {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;

  if (inputType.value === 'number' && target.value !== '') {
    return Number(target.value);
  }

  return target.value;
}

function handleInput(event: Event): void {
  if (isValueLocked.value) return;

  const value = normalizeInputValue(event);

  emit('update:modelValue', value);
  emit('input', value, event);
}

function handleChange(event: Event): void {
  if (isValueLocked.value) return;

  emit('change', normalizeInputValue(event), event);
}

function handleClear(): void {
  if (isValueLocked.value) return;

  emit('update:modelValue', undefined);
  emit('clear');
}

function updateTextareaHeight(height: number): void {
  const nextHeight = Math.max(minimumTextareaHeight.value, Math.round(height));

  if (nextHeight === textareaHeight.value) return;

  textareaHeight.value = nextHeight;
  emit('resize', nextHeight);
}

function handleResizePointerDown(event: PointerEvent): void {
  if (!isTextareaResizable.value || !controlRef.value) return;

  event.preventDefault();
  const handle = event.currentTarget as HTMLElement;
  handle.setPointerCapture?.(event.pointerId);
  resizeStart.value = {
    pointerId: event.pointerId,
    clientY: event.clientY,
    height: controlRef.value.getBoundingClientRect().height,
  };
}

function handleResizePointerMove(event: PointerEvent): void {
  const start = resizeStart.value;

  if (!start || start.pointerId !== event.pointerId) return;

  updateTextareaHeight(start.height + event.clientY - start.clientY);
}

function handleResizePointerEnd(event: PointerEvent): void {
  if (resizeStart.value?.pointerId !== event.pointerId) return;

  const handle = event.currentTarget as HTMLElement;
  if (handle.hasPointerCapture?.(event.pointerId)) handle.releasePointerCapture(event.pointerId);
  resizeStart.value = undefined;
}

function handleResizeKeydown(event: KeyboardEvent): void {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

  event.preventDefault();
  const currentHeight =
    textareaHeight.value ?? controlRef.value?.getBoundingClientRect().height ?? 0;
  const direction = event.key === 'ArrowDown' ? 1 : -1;
  const step = event.shiftKey ? resizeKeyboardLargeStep : resizeKeyboardStep;

  updateTextareaHeight(currentHeight + direction * step);
}
</script>

<style src="./base-input.css"></style>
