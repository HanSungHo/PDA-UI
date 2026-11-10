<template>
  <BaseModal
    class="alarm-common-popup"
    :open="open"
    :title="roomName"
    :closable="false"
    :back-closable="true"
    :overlay-closable="false"
    @update:open="handleOpenChange"
  >
    <ul class="alarm-common-popup__rows" :aria-label="`${roomName} alarm details`">
      <li v-for="(item, index) in rows" :key="index" class="alarm-common-popup__row">
        <span class="alarm-common-popup__key">{{ item.title }}</span>
        <span
          class="alarm-common-popup__value"
          :class="{ 'alarm-common-popup__value--spc-result': item.title === 'SpcResult' }"
        >
          {{ item.value }}
        </span>
      </li>
    </ul>
    <template #footer>
      <BaseButton variant="link" size="medium" @click="alarmCommonPopup.close">OK</BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { App } from '@capacitor/app';
import { BaseButton, BaseModal } from 'src/components/base';
import { onBeforeUnmount, watch } from 'vue';

import { alarmCommonPopup } from '../services/alarm-common-popup.service';

const { open, roomName, rows } = alarmCommonPopup;

// Legacy AlarmCommonActivity has no onBackPressed override: Back finishes it, like OK.
function handleOpenChange(value: boolean): void {
  if (!value) alarmCommonPopup.close();
}

let backButtonListener: { remove: () => Promise<void> } | undefined;
let listenerToken = 0;

function removeBackListener(): void {
  listenerToken += 1;
  void backButtonListener?.remove().catch(() => undefined);
  backButtonListener = undefined;
}

watch(
  open,
  (isOpen) => {
    removeBackListener();
    if (!isOpen) return;
    const token = listenerToken;
    void App.addListener('backButton', () => alarmCommonPopup.close())
      .then((listener) => {
        if (token === listenerToken) backButtonListener = listener;
        else void listener.remove();
      })
      .catch(() => undefined);
  },
  { immediate: true },
);

onBeforeUnmount(removeBackListener);
</script>

<style scoped>
.alarm-common-popup__rows {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.alarm-common-popup__row {
  padding: var(--spacing-space-2);
  border: 1px solid var(--border-border-primary);
  border-radius: var(--radius-4);
  background: var(--background-background-primary);
  color: var(--text-text-primary);
  font-size: var(--typography-size-12px);
  font-weight: var(--font-weight-medium);
  line-height: var(--typography-height-14px);
  overflow-wrap: anywhere;
}

.alarm-common-popup__value {
  margin-inline-start: var(--spacing-space-0);
}

.alarm-common-popup__value--spc-result {
  background: #ffff00;
  color: #ff0000;
}
</style>
