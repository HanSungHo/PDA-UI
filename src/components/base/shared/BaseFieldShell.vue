<template>
  <div class="ds-field" :class="[`ds-field--${status}`, { 'ds-field--block': block }]">
    <div v-if="label || $slots.extra" class="ds-field__header">
      <label v-if="label" :id="labelId" :for="controlId" class="ds-field__label">
        {{ label }}<span v-if="required" class="ds-field__required" aria-hidden="true"> *</span>
      </label>

      <slot name="extra" />
    </div>

    <slot />

    <p
      v-if="message"
      :id="messageId"
      class="ds-field__message"
      :role="status === 'error' ? 'alert' : undefined"
    >
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * Presentational shell shared by every field-like Base Component.
 * `class`/`style` passed by a parent are merged onto the root
 * `.ds-field` element via Vue's attribute fallthrough — consumers rely
 * on this instead of adding an extra wrapper `<div>`.
 */
import type { BaseComponentStatus } from './base-field.types';

defineOptions({ name: 'BaseFieldShell' });

withDefaults(
  defineProps<{
    controlId: string;
    labelId: string;
    messageId: string;
    label?: string | undefined;
    message?: string | undefined;
    required?: boolean | undefined;
    status?: BaseComponentStatus | undefined;
    block?: boolean | undefined;
  }>(),
  {
    label: undefined,
    message: undefined,
    required: false,
    status: 'default',
    block: false,
  },
);

defineSlots<{
  default(): unknown;
  extra?(): unknown;
}>();
</script>

./base-field-shell.css />
