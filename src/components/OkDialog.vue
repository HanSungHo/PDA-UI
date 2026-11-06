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
        <BaseButton class="ok-dialog__button" variant="link" @click="handleConfirm">
          {{ confirmLabel }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { App } from '@capacitor/app';
import { BaseButton, BaseModal } from 'src/components/base';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { onBeforeUnmount, watch } from 'vue';

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

const props = withDefaults(defineProps<OkDialogProps>(), {
  confirmLabel: COMMON_FIELD.BTNOKSTR,
});
const emit = defineEmits<OkDialogEmits>();

function handleConfirm(): void {
  emit('confirm');
  emit('update:open', false);
}

// Legacy OkDialog.onBackPressed: the device Back button acts like OK.
let backButtonListener: { remove: () => Promise<void> } | undefined;
let listenerToken = 0;

function removeBackListener(): void {
  listenerToken += 1;
  void backButtonListener?.remove().catch(() => undefined);
  backButtonListener = undefined;
}

watch(
  () => props.open,
  (isOpen) => {
    removeBackListener();
    if (!isOpen) return;
    const token = listenerToken;
    void App.addListener('backButton', handleConfirm)
      .then((listener) => {
        if (token === listenerToken) backButtonListener = listener;
        else void listener.remove();
      })
      .catch(() => undefined);
  },
  { immediate: true },
);

onBeforeUnmount(removeBackListener);

function handleOpenChange(value: boolean): void {
  emit('update:open', value);
}
</script>

<style>
.ok-dialog__message {
  margin: 0;
  max-height: 50vh;
  overflow-y: auto;
  white-space: pre-line;
}

.ok-dialog__button {
  min-width: 88px;
}
</style>
