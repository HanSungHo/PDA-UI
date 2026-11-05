<template>
  <BaseModal
    class="ok-cancel-dialog"
    :open="open"
    :title="title"
    :closable="false"
    :back-closable="true"
    :overlay-closable="false"
    @update:open="handleOpenChange"
  >
    <p class="ok-cancel-dialog__message" role="alert">{{ message }}</p>
    <template #footer>
      <div class="ok-cancel-dialog__footer">
        <BaseButton class="ok-cancel-dialog__button" variant="link" @click="handleCancel">
          {{ cancelLabel }}
        </BaseButton>
        <BaseButton class="ok-cancel-dialog__button" variant="link" @click="handleOk">
          {{ okLabel }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { BaseButton, BaseModal } from 'src/components/base';
import { COMMON_FIELD } from 'src/constants/common-strings';

interface OkCancelDialogProps {
  open: boolean;
  title: string;
  message: string;
  okLabel?: string;
  cancelLabel?: string;
}

interface OkCancelDialogEmits {
  (event: 'update:open', value: boolean): void;
  (event: 'ok'): void;
  (event: 'cancel'): void;
}

withDefaults(defineProps<OkCancelDialogProps>(), {
  okLabel: COMMON_FIELD.POSITIVEBTNSTR,
  cancelLabel: COMMON_FIELD.NEGATIVEBTNSTR,
});
const emit = defineEmits<OkCancelDialogEmits>();

function handleOk(): void {
  emit('ok');
  emit('update:open', false);
}

function handleCancel(): void {
  emit('cancel');
  emit('update:open', false);
}

/** legacy onBackPressed answers RETURN_CODE_OK, so closing with back/Esc is an OK. */
function handleOpenChange(value: boolean): void {
  if (!value) handleOk();
}
</script>

<style>
.ok-cancel-dialog__message {
  margin: 0;
  white-space: pre-line;
}

.ok-cancel-dialog .ds-modal__header {
  padding: var(--spacing-space-1) var(--spacing-space-2);
  background: var(--background-background-brand-opacity-20);
}

.ok-cancel-dialog .ds-modal__footer {
  padding: var(--spacing-space-3);
  background: var(--background-background-primary, #fff);
}

.ok-cancel-dialog__footer {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.ok-cancel-dialog__button {
  min-width: 88px;
}
</style>
