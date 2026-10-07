<template>
  <QBtn
    class="ds-btn"
    :class="[
      `ds-btn--${variant}`,
      `ds-btn--${size}`,
      {
        'ds-btn--block': block,
        'ds-btn--icon-only': iconOnly,
        'ds-btn--has-adornment': hasInlineAdornment,
        'ds-btn--disabled': isInteractionBlocked,
      },
    ]"
    :type="buttonType"
    :disable="isInteractionBlocked"
    :loading="false"
    :href="buttonHref"
    :target="buttonTarget"
    :rel="linkRel"
    :aria-label="ariaLabel"
    :aria-disabled="isInteractionBlocked || undefined"
    :aria-busy="loading || undefined"
    :no-caps="true"
    :unelevated="true"
    :ripple="false"
    :flat="true"
    :rounded="false"
    :square="false"
    @click="handleClick"
  >
    <span v-if="loading" class="ds-btn__spinner" aria-hidden="true" />
    <span v-else-if="$slots.icon" class="ds-btn__icon">
      <slot name="icon" />
    </span>

    <span v-if="iconOnly" class="ds-btn__icon">
      <slot />
    </span>
    <span v-else class="ds-btn__label">
      <slot>{{ label }}</slot>
    </span>

    <span v-if="!iconOnly && $slots.suffix" class="ds-btn__icon">
      <slot name="suffix" />
    </span>
  </QBtn>
</template>

<script setup lang="ts">
import { QBtn } from 'quasar';
import { computed } from 'vue';

import {
  baseButtonDefaults,
  type BaseButtonEmits,
  type BaseButtonProps,
} from './base-button.types';

defineOptions({ name: 'BaseButton' });

const props = withDefaults(defineProps<BaseButtonProps>(), baseButtonDefaults);
const emit = defineEmits<BaseButtonEmits>();

const slots = defineSlots<{
  default?(): unknown;
  icon?(): unknown;
  suffix?(): unknown;
}>();

const isInteractionBlocked = computed(() => props.disabled || props.loading);

const hasInlineAdornment = computed(
  () => !props.iconOnly && (props.loading || 'icon' in slots || 'suffix' in slots),
);

const buttonHref = computed(() =>
  props.href && !isInteractionBlocked.value ? props.href : undefined,
);

const buttonTarget = computed(() => (buttonHref.value ? props.target : undefined));

const buttonType = computed(() => (buttonHref.value ? undefined : props.htmlType));

const linkRel = computed(() => {
  return buttonHref.value && props.target === '_blank' ? 'noopener noreferrer' : undefined;
});

function handleClick(event: Event): void {
  if (isInteractionBlocked.value) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  emit('click', event as MouseEvent);
}
</script>

<style src="./base-button.css"></style>
