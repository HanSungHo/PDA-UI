<template>
  <BaseFieldShell
    :class="[
      `ds-toggle--${size}`,
      `ds-toggle--${variant}`,
      {
        'ds-toggle--readonly': readonly,
        'ds-toggle--label-start': labelPlacement === 'start',
      },
    ]"
    :control-id="controlId"
    :label-id="labelId"
    :message-id="messageId"
    :required="required"
    :status="status"
    :message="message"
    :block="block"
  >
    <div class="ds-toggle__row">
      <label
        v-if="label && labelPlacement === 'start'"
        :id="labelId"
        :for="controlId"
        class="ds-toggle__label"
      >
        {{ label }}
      </label>

      <ASwitch
        v-if="variant === 'text' || variant === 'publish'"
        :id="controlId"
        :checked="modelValue"
        :checked-value="checkedValue"
        :unchecked-value="uncheckedValue"
        :disabled="isStructurallyDisabled"
        :loading="loading"
        :size="antSize"
        :aria-label="label ? undefined : ariaLabel"
        :aria-labelledby="label ? labelId : undefined"
        :aria-describedby="message ? messageId : undefined"
        :aria-invalid="status === 'error' || undefined"
        :aria-required="required || undefined"
        :aria-readonly="readonly || undefined"
        :aria-busy="loading || undefined"
        class="ds-toggle__switch"
        @update:checked="handleUpdate"
        @change="handleChange"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      />

      <div
        v-else-if="
          variant === 'segmented' || variant === 'segmented-alt' || variant === 'segmented-icon'
        "
        :id="controlId"
        class="ds-toggle__segmented"
        :class="{
          'ds-toggle__segmented--alt': variant === 'segmented-alt',
          'ds-toggle__segmented--icon': variant === 'segmented-icon',
        }"
        role="radiogroup"
        :aria-label="ariaLabel"
      >
        <AButton
          type="text"
          class="ds-toggle__segment"
          :class="{ 'ds-toggle__segment--selected': modelValue }"
          role="radio"
          :aria-checked="modelValue"
          :disabled="isStructurallyDisabled"
          @click="handleVariantUpdate(true, $event)"
        >
          <span
            v-if="variant === 'segmented-icon'"
            class="ds-toggle__segment-icon"
            aria-hidden="true"
          />
          <span v-else>Published</span>
        </AButton>
        <AButton
          type="text"
          class="ds-toggle__segment"
          :class="{ 'ds-toggle__segment--selected': !modelValue }"
          role="radio"
          :aria-checked="!modelValue"
          :disabled="isStructurallyDisabled"
          @click="handleVariantUpdate(false, $event)"
        >
          <span
            v-if="variant === 'segmented-icon'"
            class="ds-toggle__segment-icon"
            aria-hidden="true"
          />
          <span v-else>Unpublished</span>
        </AButton>
      </div>

      <div
        v-else
        :id="controlId"
        class="ds-toggle__icon"
        role="group"
        :aria-label="ariaLabel"
        :aria-describedby="message ? messageId : undefined"
      >
        <button
          type="button"
          class="ds-toggle__icon-option"
          :class="{ 'ds-toggle__icon-option--selected': modelValue }"
          :aria-pressed="modelValue"
          :disabled="isStructurallyDisabled"
          @click="handleVariantUpdate(true, $event)"
        />
        <button
          type="button"
          class="ds-toggle__icon-option"
          :class="{ 'ds-toggle__icon-option--selected': !modelValue }"
          :aria-pressed="!modelValue"
          :disabled="isStructurallyDisabled"
          @click="handleVariantUpdate(false, $event)"
        />
      </div>

      <label
        v-if="label && labelPlacement !== 'start'"
        :id="labelId"
        :for="controlId"
        class="ds-toggle__label"
      >
        {{ label }}
        <span v-if="required" class="ds-toggle__required" aria-hidden="true"> *</span>
      </label>

      <span v-if="checkedText || uncheckedText" class="ds-toggle__state">
        {{ modelValue ? checkedText : uncheckedText }}
      </span>
    </div>
  </BaseFieldShell>
</template>

<script setup lang="ts">
/**
 * BaseToggle — wraps Ant Design Vue's <a-switch>.
 * Visual reference: Toggle.pdf. Brand color inherited from ConfigProvider
 * colorPrimary (see src/boot/ant-design-vue.ts), not hardcoded here.
 */
import { Button as AButton, Switch as ASwitch } from 'ant-design-vue';
import { computed } from 'vue';

import BaseFieldShell from '../shared/BaseFieldShell.vue';
import { useBaseField } from '../shared/use-base-field';
import { baseToggleDefaults, normalizeCheckedValue } from './base-toggle.constants';
import type { AntSwitchCheckedValue, BaseToggleEmits, BaseToggleProps } from './base-toggle.types';

defineOptions({ name: 'BaseToggle' });

const props = withDefaults(defineProps<BaseToggleProps>(), baseToggleDefaults);
const emit = defineEmits<BaseToggleEmits>();

const { controlId, labelId, messageId, status, message, isStructurallyDisabled, isValueLocked } =
  useBaseField(props, 'base-toggle');

const antSize = computed<'small' | 'default'>(() => (props.size === 'small' ? 'small' : 'default'));

function handleUpdate(value: AntSwitchCheckedValue): void {
  if (isValueLocked.value) return;
  emit('update:modelValue', normalizeCheckedValue(value, props.checkedValue));
}

function handleChange(value: AntSwitchCheckedValue, event: Event): void {
  if (isValueLocked.value) return;
  emit('change', normalizeCheckedValue(value, props.checkedValue), event);
}

function handleVariantUpdate(value: boolean, event: MouseEvent): void {
  if (isValueLocked.value || value === props.modelValue) return;
  emit('update:modelValue', value);
  emit('change', value, event);
}
</script>

<style scoped src="./base-toggle.css" />
