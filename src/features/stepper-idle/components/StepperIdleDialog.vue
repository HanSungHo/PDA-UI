<template>
  <BaseModal
    :open="open"
    :closable="false"
    :overlay-closable="false"
    width="100%"
    class="stepper-idle-modal"
    @update:open="handleOpenChange"
  >
    <template #title>
      <span class="stepper-idle-modal__title">STEPPER IDLE</span>
    </template>

    <div class="stepper-idle-modal__body">
      <p class="stepper-idle-modal__notice">마지막 WAFER 진행 후 7분이상 경과</p>

      <div class="stepper-idle-modal__fields">
        <BaseInput label="발생시간" :model-value="sTime || ''" readonly />
        <p class="stepper-idle-modal__section-title">내용</p>
        <BaseInput label="장비명" :model-value="sEqpid || ''" readonly />
        <BaseInput label="LOTNAME" :model-value="sLotid || ''" readonly />
        <BaseInput label="WAFER_NO" :model-value="sWafer || ''" readonly />
      </div>
    </div>

    <template #footer>
      <BaseButton
        variant="link"
        size="medium"
        label="OK"
        class="stepper-idle-modal__ok-btn"
        @click="handleOk"
      />
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { BaseButton, BaseInput, BaseModal } from 'src/components/base';

import { useStepperIdle } from '../composables/use-stepper-idle';
import type { StepperIdleDialogEmits, StepperIdleDialogProps } from '../types/stepper-idle.types';

defineOptions({ name: 'StepperIdleDialog' });

const props = defineProps<StepperIdleDialogProps>();
const emit = defineEmits<StepperIdleDialogEmits>();

const { sTime, sEqpid, sLotid, sWafer } = useStepperIdle(() => props.receiverMessage);

function handleOpenChange(open: boolean) {
  if (!open) handleOk();
}

function handleOk() {
  emit('update:open', false);
  emit('confirm');
}
</script>

<style scoped>
:global(.stepper-idle-modal .ds-modal) {
  overflow: hidden;
  border-radius: 4px;
  box-shadow:
    0 8px 10px rgb(0 0 0 / 20%),
    0 6px 30px rgb(0 0 0 / 12%),
    0 16px 24px rgb(0 0 0 / 14%);
}

:global(.stepper-idle-modal .ds-modal__header) {
  padding: var(--spacing-space-1, 8px) var(--spacing-space-2, 12px);
}

.stepper-idle-modal__title {
  color: var(--text-text-primary, #030712);
}

:global(.stepper-idle-modal .ds-modal__body) {
  padding: 0;
  gap: 0;
  background-color: var(--utility-gray-gray-bg, #f3f4f6);
}

.stepper-idle-modal__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-space-1, 8px);
  padding: var(--spacing-space-3, 16px);
  background-color: var(--utility-gray-gray-bg, #f3f4f6);
}

.stepper-idle-modal__fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-space-1, 8px);
}

.stepper-idle-modal__notice {
  margin: 0;
  color: var(--text-text-info, #146bb5);
  font-size: var(--typography-size-14px, 14px);
  font-weight: var(--font-weight-medium, 500);
  line-height: var(--typography-height-20px, 20px);
  text-align: center;
}

.stepper-idle-modal__section-title {
  margin: 0;
  color: var(--text-text-primary, #030712);
  font-size: var(--typography-size-16px, 16px);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--typography-height-24px, 24px);
}

:global(.stepper-idle-modal .ds-modal__footer) {
  padding: var(--spacing-space-2, 12px);
}

.stepper-idle-modal__ok-btn {
  width: 72px;
}
</style>
