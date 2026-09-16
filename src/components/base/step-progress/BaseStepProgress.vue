<template>
  <div class="ds-step-progress" :class="`ds-step-progress--${direction}`" role="list">
    <div v-for="(item, index) in items" :key="index" class="ds-step-progress__step-wrapper">
      <div
        class="ds-step-progress__node"
        :class="`ds-step-progress__node--${item.status || 'pending'}`"
        role="listitem"
      >
        <div class="ds-step-progress__badge" aria-hidden="true">
          <slot name="icon" :item="item" :index="index">
            <!-- Pending -->
            <span v-if="!item.status || item.status === 'pending'" class="ds-step-progress__dot" />

            <!-- Loading -->
            <svg
              v-else-if="item.status === 'loading'"
              class="ds-step-progress__spinner"
              viewBox="0 0 32 32"
            >
              <circle
                class="ds-step-progress__spinner-track"
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke-width="3"
              />
              <circle
                class="ds-step-progress__spinner-indicator"
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke-width="3"
              />
            </svg>

            <!-- Success -->
            <svg
              v-else-if="item.status === 'success'"
              class="ds-step-progress__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 12 10.5 16.5 18 8" />
            </svg>

            <!-- Warning -->
            <svg
              v-else-if="item.status === 'warning'"
              class="ds-step-progress__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M10.3 3.8C11.1 2.5 12.9 2.5 13.7 3.8L21.7 18.2C22.5 19.6 21.6 21.3 20 21.3H4C2.4 21.3 1.5 19.6 2.3 18.2L10.3 3.8Z"
              />
              <line x1="12" y1="9" x2="12" y2="14" />
              <circle cx="12" cy="17.5" r="1" fill="currentColor" stroke="none" />
            </svg>

            <!-- Error -->
            <svg
              v-else-if="item.status === 'error'"
              class="ds-step-progress__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
            </svg>
          </slot>
        </div>

        <div class="ds-step-progress__label">
          <slot name="label" :item="item" :index="index">
            {{ item.label }}
          </slot>
        </div>
      </div>

      <!-- Connector line between steps in horizontal mode -->
      <div
        v-if="direction === 'horizontal' && index < items.length - 1"
        class="ds-step-progress__connector"
        aria-hidden="true"
      >
        <span class="ds-step-progress__joint" />
        <span class="ds-step-progress__line" />
        <span class="ds-step-progress__joint" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  type BaseStepItem,
  baseStepProgressDefaults,
  type BaseStepProgressProps,
} from './base-step-progress.types';

defineOptions({ name: 'BaseStepProgress' });

withDefaults(defineProps<BaseStepProgressProps>(), baseStepProgressDefaults);

defineSlots<{
  default?(): unknown;
  icon?(props: { item: BaseStepItem; index: number }): unknown;
  label?(props: { item: BaseStepItem; index: number }): unknown;
}>();
</script>

<style src="./base-step-progress.css"></style>
