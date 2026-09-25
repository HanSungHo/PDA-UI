<template>
  <BaseModal
    class="ok-dialog"
    :open="open"
    :title="title"
    :closable="false"
    :overlay-closable="false"
    @update:open="handleOpenChange"
  >
    <p class="ok-dialog__message" role="alert">{{ message }}</p>
    <template #footer>
      <div class="ok-dialog__footer">
        <BaseButton class="ok-dialog__button" @click="handleConfirm">
          {{ confirmLabel }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { BaseButton, BaseModal } from 'src/components/base';
import { COMMON_FIELD } from 'src/constants/common-strings';

interface OkDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
}

interface OkDialogEmits {
  (event: 'update:open', value: boolean): void;
  (event: 'confirm'): void;
}

withDefaults(defineProps<OkDialogProps>(), {
  confirmLabel: COMMON_FIELD.BTNOKSTR,
});
const emit = defineEmits<OkDialogEmits>();

function handleConfirm(): void {
  emit('confirm');
  emit('update:open', false);
}

function handleOpenChange(value: boolean): void {
  emit('update:open', value);
}
</script>

<style>
.ok-dialog__message {
  margin: 0;
  white-space: pre-line;
}

.ok-dialog .ds-modal__header {
  padding: var(--spacing-space-1) var(--spacing-space-2);
  background: var(--background-background-brand-opacity-20);
}

.ok-dialog .ds-modal__footer {
  padding: var(--spacing-space-3);
  background: var(--background-background-primary, #fff);
}

.ok-dialog__footer {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.ok-dialog__button {
  min-width: 88px;
}
</style>
