<template>
  <div
    class="ds-toast"
    role="alert"
    aria-live="polite"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="ds-toast__icon-wrapper">
      <slot name="icon">
        <!-- Success -->
        <svg
          v-if="type === 'success'"
          class="ds-toast__icon"
          viewBox="0 0 32 32"
          width="32"
          height="32"
          aria-hidden="true"
        >
          <circle cx="16" cy="16" r="16" fill="var(--ds-toast-success-bg)" />
          <path
            d="M10 16.5L14 20.5L22 12.5"
            stroke="var(--ds-toast-success-fg)"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
        </svg>

        <!-- Error -->
        <svg
          v-else-if="type === 'error'"
          class="ds-toast__icon"
          viewBox="0 0 32 32"
          width="32"
          height="32"
          aria-hidden="true"
        >
          <circle cx="16" cy="16" r="16" fill="var(--ds-toast-error-bg)" />
          <path
            d="M16 10V18"
            stroke="var(--ds-toast-error-fg)"
            stroke-width="2.5"
            stroke-linecap="round"
            fill="none"
          />
          <circle cx="16" cy="22.5" r="1.5" fill="var(--ds-toast-error-fg)" />
        </svg>

        <!-- Info -->
        <svg
          v-else-if="type === 'info'"
          class="ds-toast__icon"
          viewBox="0 0 32 32"
          width="32"
          height="32"
          aria-hidden="true"
        >
          <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--ds-toast-info-bg)" />
          <circle cx="16" cy="10" r="1.5" fill="var(--ds-toast-info-fg)" />
          <path
            d="M16 14.5V22"
            stroke="var(--ds-toast-info-fg)"
            stroke-width="2.5"
            stroke-linecap="round"
            fill="none"
          />
        </svg>

        <!-- Warning -->
        <svg
          v-else-if="type === 'warning'"
          class="ds-toast__icon"
          viewBox="0 0 32 32"
          width="32"
          height="32"
          aria-hidden="true"
        >
          <path
            d="M13.4 5C14.6 3 17.4 3 18.6 5L29.6 24C30.8 26 29.4 28.5 27 28.5H5C2.6 28.5 1.2 26 2.4 24L13.4 5Z"
            fill="var(--ds-toast-warning-bg)"
          />
          <path
            d="M16 12V18.5"
            stroke="var(--ds-toast-warning-fg)"
            stroke-width="2.5"
            stroke-linecap="round"
            fill="none"
          />
          <circle cx="16" cy="23" r="1.5" fill="var(--ds-toast-warning-fg)" />
        </svg>
      </slot>
    </div>

    <div class="ds-toast__content">
      <div v-if="title || $slots.title" class="ds-toast__title">
        <slot name="title">{{ title }}</slot>
      </div>
      <div v-if="description || $slots.default" class="ds-toast__description">
        <slot>{{ description }}</slot>
      </div>
    </div>

    <button
      v-if="closable"
      type="button"
      class="ds-toast__close-btn"
      aria-label="Close"
      @click="handleClose"
    >
      <slot name="closeIcon">
        <CloseOutlined />
      </slot>
    </button>
  </div>
</template>

<script setup lang="ts">
import { CloseOutlined } from '@ant-design/icons-vue';
import { onBeforeUnmount, onMounted, watch } from 'vue';

import { baseToastDefaults, type BaseToastEmits, type BaseToastProps } from './base-toast.types';

defineOptions({ name: 'BaseToast' });

const props = withDefaults(defineProps<BaseToastProps>(), baseToastDefaults);
const emit = defineEmits<BaseToastEmits>();

defineSlots<{
  default?(): unknown;
  title?(): unknown;
  icon?(): unknown;
  closeIcon?(): unknown;
}>();

let timer: ReturnType<typeof setTimeout> | null = null;

function startTimer(): void {
  stopTimer();
  if (props.duration && props.duration > 0) {
    timer = setTimeout(() => {
      emit('close');
    }, props.duration);
  }
}

function stopTimer(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function handleMouseEnter(): void {
  stopTimer();
}

function handleMouseLeave(): void {
  startTimer();
}

function handleClose(): void {
  stopTimer();
  emit('close');
}

onMounted(() => {
  startTimer();
});

onBeforeUnmount(() => {
  stopTimer();
});

watch(
  () => props.duration,
  () => {
    startTimer();
  },
);
</script>

<style src="./base-toast.css"></style>
