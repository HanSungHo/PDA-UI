<template>
  <BaseFieldShell
    :class="rootClasses"
    :data-state="visualState"
    :control-id="controlId"
    :label-id="labelId"
    :message-id="messageId"
    :layout="layout"
    :label="label || undefined"
    :message="message"
    :required="required"
    :status="status"
    block
  >
    <AInputPassword
      v-if="type === 'password'"
      class="base-input-field__control ds-input-field__control"
      v-bind="mergedInputAttributes"
      @blur="handleBlur"
      @focus="handleFocus"
      @update:value="emitModelValue"
    >
      <template v-if="$slots.prefix || prefixIconComponent" #prefix>
        <slot name="prefix">
          <component
            :is="prefixIconComponent"
            class="base-input-field__icon ds-input-field__icon"
          />
        </slot>
      </template>
    </AInputPassword>

    <AInput
      v-else
      class="base-input-field__control ds-input-field__control"
      v-bind="mergedInputAttributes"
      :type="props.type"
      @blur="handleBlur"
      @focus="handleFocus"
      @update:value="emitModelValue"
    >
      <template v-if="$slots.prefix || prefixIconComponent" #prefix>
        <slot name="prefix">
          <component
            :is="prefixIconComponent"
            class="base-input-field__icon ds-input-field__icon"
          />
        </slot>
      </template>

      <template v-if="hasTextSuffix" #suffix>
        <slot name="suffix">
          <button
            v-if="showClearButton"
            aria-label="Clear input"
            class="base-input-field__clear ds-input-field__clear"
            type="button"
            @click="clearInput"
          >
            <CloseOutlined />
          </button>
          <InfoCircleOutlined
            v-else-if="isError"
            class="base-input-field__error-icon ds-input-field__error-icon"
          />
        </slot>
      </template>
    </AInput>
  </BaseFieldShell>
</template>

<script setup lang="ts">
import { CloseOutlined, InfoCircleOutlined } from '@ant-design/icons-vue';
import { Input as AInput, InputPassword as AInputPassword } from 'ant-design-vue';
import { computed, ref, toRaw, useAttrs, watch } from 'vue';

import type { BaseFieldProps } from '../shared/base-field.types';
import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import {
  baseInputFieldDefaults,
  type BaseInputFieldEmits,
  type BaseInputFieldProps,
  type BaseInputFieldState,
} from './base-input-field.types';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<BaseInputFieldProps>(), baseInputFieldDefaults);

const emit = defineEmits<BaseInputFieldEmits>();

const attrs = useAttrs();

const isFocused = ref(false);
// AntD's `Input`/`InputPassword` can re-emit `update:value` twice for a
// single change (confirmed via test: `setValue` produced two identical
// `update:modelValue` emits once this guard was removed). Dedup against the
// last emitted/received value to keep `update:modelValue` firing once.
const lastEmittedValue = ref<string | null>(null);

const sharedFieldProps: Readonly<BaseFieldProps> = {
  get id() {
    return props.id || undefined;
  },
  get label() {
    return props.label || undefined;
  },
  get hint() {
    return props.helperText || undefined;
  },
  get errorMessage() {
    return props.errorText || undefined;
  },
  get required() {
    return props.required;
  },
  get disabled() {
    return props.disabled;
  },
  get loading() {
    return false;
  },
  get readonly() {
    return false;
  },
  get size() {
    return 'medium' as const;
  },
  get status() {
    return 'default' as const;
  },
  get error() {
    return false;
  },
  get block() {
    return true;
  },
};

const { controlId, labelId, messageId, status, message, isStructurallyDisabled } = useBaseField(
  sharedFieldProps,
  'base-input-field',
);

const isError = computed(() => status.value === 'error');
const isFilled = computed(() => props.modelValue.length > 0);
const inputStatus = computed<'' | 'error'>(() => (isError.value ? 'error' : ''));
const inputAttributes = computed(() => ({
  id: controlId.value,
  ...(props.maxLength !== null ? { maxlength: props.maxLength } : {}),
  'aria-labelledby': props.label ? labelId.value : undefined,
  'aria-describedby': message.value ? messageId.value : undefined,
  'aria-invalid': isError.value || undefined,
  'aria-required': props.required || undefined,
  disabled: isStructurallyDisabled.value,
  placeholder: props.placeholder,
  showCount: props.showCount,
  status: inputStatus.value,
  value: props.modelValue,
}));
// Native attributes (e.g. `name`, `autocomplete`, `inputmode`) forwarded from
// the consumer must land on the actual `<input>`, not on the wrapper. Fields
// managed by `inputAttributes` always win over forwarded `$attrs` since they
// encode required internal/accessibility state.
const mergedInputAttributes = computed(() => ({ ...attrs, ...inputAttributes.value }));
const prefixIconComponent = computed(() => toRaw(props.prefixIcon));
const showClearButton = computed(
  () => props.allowClear && isFilled.value && !props.disabled && props.type === 'text',
);
const hasTextSuffix = computed(() => showClearButton.value || isError.value);

const visualState = computed<BaseInputFieldState>(() => {
  if (props.disabled) {
    return 'disabled';
  }

  if (isError.value) {
    return 'error';
  }

  if (isFocused.value) {
    return 'focus';
  }

  if (isFilled.value) {
    return 'filled';
  }

  return 'default';
});

const rootClasses = computed(() => [
  'ds-input-field',
  `base-input-field--${props.layout}`,
  `base-input-field--${visualState.value}`,
  `ds-input-field--${visualState.value}`,
]);

watch(
  () => props.modelValue,
  (value) => {
    lastEmittedValue.value = value;
  },
);

function emitModelValue(value: string | number): void {
  const nextValue = String(value);

  if (nextValue === lastEmittedValue.value) {
    return;
  }

  lastEmittedValue.value = nextValue;
  emit('update:modelValue', nextValue);
}

function handleFocus(event: FocusEvent): void {
  isFocused.value = true;
  emit('focus', event);
}

function handleBlur(event: FocusEvent): void {
  isFocused.value = false;
  emit('blur', event);
}

function clearInput(): void {
  emitModelValue('');
  emit('clear');
}
</script>

<style src="./base-input-field.css"></style>
