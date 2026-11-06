<template>
  <EQPspcScreen :fields="event.fields" @ok="setData" />
</template>

<script setup lang="ts">
import { App } from '@capacitor/app';
import { onMounted, onUnmounted } from 'vue';

import { type EQPspcEvent, intlkpopupcheck, releaseEQPspcEvent } from '../eqp-spc.service';
import EQPspcScreen from './EQPspcScreen.vue';

const props = defineProps<{ event: EQPspcEvent }>();
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
  if (event.key !== 'Escape') return;
  event.preventDefault();
  event.stopPropagation();
  closeWithoutConfirm();
}

onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.addEventListener('keydown', handleKeydown, true);
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
