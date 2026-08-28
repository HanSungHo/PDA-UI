<template>
  <component
    :is="tag"
    class="ds-btn"
    :class="[
      `ds-btn--${variant}`,
      `ds-btn--${size}`,
      {
        'ds-btn--block': block,
        'ds-btn--icon-only': iconOnly,
        'ds-btn--disabled': isInteractionBlocked,
      },
    ]"
    :type="tag === 'button' ? htmlType : undefined"
    :disabled="tag === 'button' && isInteractionBlocked ? true : undefined"
    :href="tag === 'a' ? href : undefined"
    :target="tag === 'a' ? target : undefined"
    :rel="linkRel"
    :aria-label="ariaLabel"
    :aria-disabled="isInteractionBlocked || undefined"
    :aria-busy="loading || undefined"
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
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import {
  baseButtonDefaults,
  type BaseButtonEmits,
  type BaseButtonProps,
} from './base-button.types';

defineOptions({ name: 'BaseButton' });

const props = withDefaults(defineProps<BaseButtonProps>(), baseButtonDefaults);
const emit = defineEmits<BaseButtonEmits>();

defineSlots<{
  default?(): unknown;
  icon?(): unknown;
  suffix?(): unknown;
}>();

const isInteractionBlocked = computed(() => props.disabled || props.loading);

const tag = computed(() => (props.href && !isInteractionBlocked.value ? 'a' : 'button'));

const linkRel = computed(() =>
  tag.value === 'a' && props.target === '_blank' ? 'noopener noreferrer' : undefined,
);

function handleClick(event: MouseEvent): void {
  if (isInteractionBlocked.value) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  emit('click', event);
}
</script>

<style src="./base-button.css"></style>
