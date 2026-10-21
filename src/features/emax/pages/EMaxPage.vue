<template>
  <main class="emax" aria-label="Activity Emax" />

  <BaseModal
    class="emax-dialog"
    :open="true"
    title="Vent 완료"
    width="calc(100vw - var(--ds-spacing-3) - var(--ds-spacing-3))"
    aria-labelledby="emax-title"
    aria-describedby="emax-comment emax-occurrence"
    :closable="false"
    :overlay-closable="false"
  >
    <template #title>
      <h1 id="emax-title">Vent 완료</h1>
    </template>

    <p id="emax-comment" class="emax-dialog__comment" data-testid="txt-receiver-comment">
      {{ receiverComment }}
    </p>

    <section id="emax-occurrence" class="emax-dialog__occurrence" aria-label="발생시간">
      <p class="emax-dialog__time-label">발생시간</p>
      <div
        class="emax-dialog__times"
        data-testid="txt-receiver-time-result"
        role="status"
        aria-live="polite"
      >
        <template v-for="(time, index) in receiverTimes" :key="`${time}-${index}`">
          <time
            v-for="part in timeParts(time)"
            :key="`${index}-${part}`"
            class="emax-dialog__chip"
            :datetime="part"
            >{{ part }}</time
          >
        </template>
      </div>
    </section>

    <template #footer>
      <BaseButton
        class="emax-dialog__ok"
        variant="tertiary"
        data-testid="btn-ok"
        autofocus
        @click="onSingleClick"
        >Ok</BaseButton
      >
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { BaseButton, BaseModal } from 'src/components/base';
import { ROUTE } from 'src/constants/routes';
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { parseEMaxReceiverMessage } from '../services/emax-message.service';

defineOptions({ name: 'EMaxPage' });

const route = useRoute();
const router = useRouter();
let lastClickTime = Number.NEGATIVE_INFINITY;
let closing = false;

const receiverMessage = computed(() => {
  const value = route.query.receiverMessage;
  return Array.isArray(value) ? (value[0] ?? undefined) : (value ?? undefined);
});
const result = computed(() => parseEMaxReceiverMessage(receiverMessage.value));
const receiverComment = computed(() => result.value.receiverComment);
const receiverTimes = computed(() => result.value.receiverTimes);

function timeParts(value: string): string[] {
  return value.split(' ', 2).filter(Boolean);
}

async function finish(): Promise<void> {
  if (closing) return;
  closing = true;
  if (router.options.history.state.back) router.back();
  else await router.replace({ path: `/${ROUTE.main}` });
}

function onSingleClick(): void {
  const now = Date.now();
  if (now - lastClickTime <= 1000) return;
  lastClickTime = now;
  void finish();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  void finish();
}

onMounted(() => window.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));
</script>

<style src="../styles/emax.css"></style>
