<template>
  <div
    ref="canvas"
    class="eqp-spc-canvas"
    role="dialog"
    aria-modal="true"
    aria-label="EQPSPC INTERLOCK"
  >
    <EQPspcScreen :fields="event.fields" @ok="setData" />
  </div>
</template>

<script setup lang="ts">
import { App } from '@capacitor/app';
import { onMounted, onUnmounted, ref } from 'vue';

import { type EQPspcEvent, intlkpopupcheck, releaseEQPspcEvent } from '../eqp-spc.service';
import EQPspcScreen from './EQPspcScreen.vue';

const props = defineProps<{ event: EQPspcEvent }>();
const canvas = ref<HTMLElement | null>(null);
let acknowledged = false;
let previousFocus: HTMLElement | null = null;
let isUnmounted = false;
let backButtonListener: { remove: () => Promise<void> } | undefined;

function closeWithoutConfirm(): void {
  if (acknowledged) return;
  acknowledged = true;
  releaseEQPspcEvent(props.event.id);
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    closeWithoutConfirm();
    return;
  }
  if (event.key !== 'Tab' || !canvas.value) return;
  const controls = Array.from(canvas.value.querySelectorAll<HTMLElement>('input, button')).filter(
    (element) => !element.hasAttribute('disabled'),
  );
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) return;
  const focused = document.activeElement;
  if (event.shiftKey && (focused === first || !canvas.value.contains(focused))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (focused === last || !canvas.value.contains(focused))) {
    event.preventDefault();
    first.focus();
  }
}

onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.addEventListener('keydown', handleKeydown, true);
  canvas.value?.querySelector<HTMLButtonElement>('.eqp-spc-ok')?.focus();
  void App.addListener('backButton', closeWithoutConfirm)
    .then((listener) => {
      if (isUnmounted) void listener.remove();
      else backButtonListener = listener;
    })
    .catch(() => undefined);
});

onUnmounted(() => {
  isUnmounted = true;
  document.removeEventListener('keydown', handleKeydown, true);
  void backButtonListener?.remove().catch(() => undefined);
  if (previousFocus?.isConnected) previousFocus.focus();
});

function setData(): void {
  if (acknowledged) return;
  acknowledged = true;
  void intlkpopupcheck(props.event.fields).catch(() => undefined);
  releaseEQPspcEvent(props.event.id);
}
</script>
