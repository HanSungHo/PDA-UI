<template>
  <BaseModal
    class="alarm-common-popup"
    :open="open"
    :title="roomName"
    :closable="false"
    :overlay-closable="false"
  >
    <q-list class="alarm-common-popup__rows" :aria-label="`${roomName} alarm details`">
      <q-item v-for="item in rows" :key="`${item.title}-${item.value}`" dense>
        <p class="alarm-common-popup__row">
          <span class="alarm-common-popup__key">{{ item.title }}</span>
          <span
            class="alarm-common-popup__value"
            :class="{ 'alarm-common-popup__value--spc-result': item.title === 'SpcResult' }"
          >
            {{ item.value }}
          </span>
        </p>
      </q-item>
    </q-list>
    <template #footer>
      <BaseButton
        variant="link"
        class="alarm-common-popup__confirm"
        @click="alarmCommonPopup.close"
      >
        OK
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { BaseButton, BaseModal } from 'src/components/base';

import { alarmCommonPopup } from '../services/alarm-common-popup.service';

const { open, roomName, rows } = alarmCommonPopup;
</script>

<style scoped>
.alarm-common-popup :deep(.q-dialog__inner) {
  padding: var(--ds-spacing-3);
}

.alarm-common-popup :deep(.ds-modal) {
  min-block-size: min(17.0625rem, calc(100dvh - var(--spacing-space-7)));
}

.alarm-common-popup :deep(.ds-modal__body) {
  min-block-size: 11.3125rem;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-text-secondary, #364153);
  font-family: var(--family-font-family-default, var(--ds-font-family-sans));
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-medium);
  line-height: var(--ds-line-height-md);
  text-align: center;
}

.alarm-common-popup__rows {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  inline-size: 100%;
  align-self: stretch;
  overflow-y: auto;
}

.alarm-common-popup__rows :deep(.q-item) {
  justify-content: center;
  min-height: 1.25rem;
  padding: 0;
}

.alarm-common-popup__row {
  inline-size: 100%;
  margin: 0;
  overflow-wrap: anywhere;
  text-align: center;
}

.alarm-common-popup__key {
  font-weight: var(--ds-font-weight-medium);
}

.alarm-common-popup__value {
  margin-inline-start: 0.25rem;
}

.alarm-common-popup__value--spc-result {
  background: #ffff00;
  color: #ff0000;
}

.alarm-common-popup__confirm {
  min-inline-size: 4.5rem;
  min-block-size: 2.5rem;
  padding: 0.625rem 0.75rem;
  color: var(--text-text-selected, #02b0a5);
  font-family: var(--family-font-family-default, var(--ds-font-family-sans));
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-bold);
  line-height: var(--ds-line-height-md);
}

.alarm-common-popup__confirm :deep(.ds-btn) {
  background: transparent;
}
</style>
