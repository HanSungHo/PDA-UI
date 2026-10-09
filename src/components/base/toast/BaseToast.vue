<template>
  <!-- Notify renders the visible toast in Quasar's global notification layer. -->
  <span hidden aria-hidden="true" />
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { onBeforeUnmount, onMounted, watch } from 'vue';

import { baseToastDefaults, type BaseToastEmits, type BaseToastProps } from './base-toast.types';

defineOptions({ name: 'BaseToast' });

const props = withDefaults(defineProps<BaseToastProps>(), baseToastDefaults);
const emit = defineEmits<BaseToastEmits>();
const $q = useQuasar();

const icons = {
  success: 'sym_o_check',
  error: 'sym_o_priority_high',
  info: 'sym_o_info_i',
  warning: 'sym_o_priority_high',
} as const;

let dismiss: (() => void) | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let suppressClose = false;

function stopTimer(): void {
  if (timer !== undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
}

function startTimer(): void {
  stopTimer();
  if (props.duration > 0) {
    timer = setTimeout(() => dismiss?.(), props.duration);
  }
}

function showToast(): void {
  dismiss = $q.notify({
    message: props.title || props.description || '',
    caption: props.title && props.description ? props.description : undefined,
    icon: icons[props.type],
    classes: `ds-toast ds-toast--${props.type}`,
    position: 'top-right',
    group: false,
    timeout: 0,
    actions: props.closable
      ? [{ icon: 'sym_o_close', flat: true, 'aria-label': 'Close', class: 'ds-toast__close-btn' }]
      : [],
    attrs: {
      'aria-live': 'polite',
      onMouseenter: stopTimer,
      onMouseleave: startTimer,
    },
    onDismiss: () => {
      stopTimer();
      dismiss = undefined;
      if (!suppressClose) emit('close');
    },
  });
  startTimer();
}

function replaceToast(): void {
  suppressClose = true;
  stopTimer();
  dismiss?.();
  suppressClose = false;
  showToast();
}

onMounted(showToast);

onBeforeUnmount(() => {
  suppressClose = true;
  stopTimer();
  dismiss?.();
});

watch(() => props.duration, startTimer);
watch(() => [props.type, props.title, props.description, props.closable], replaceToast);
</script>

<style src="./base-toast.css"></style>
