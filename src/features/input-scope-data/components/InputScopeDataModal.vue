<template>
  <BaseModal
    :open="modelValue"
    title="Scope 측정 Data 입력"
    :closable="true"
    :overlay-closable="false"
    class="input-scope-data-modal"
    @cancel="handleModalClose"
    @update:open="handleModalOpenChange"
  >
    <template #title>
      <span class="input-scope-data-modal__title">Scope 측정 Data 입력</span>
    </template>

    <div class="input-scope-data-modal__content">
      <InputScopeDataView
        :initial-lot-id="initialLotId"
        @complete="handleComplete"
        @cancel="handleModalClose"
      />
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { BaseModal } from 'src/components/base';

import type {
  InputScopeDataModalEmits,
  InputScopeDataModalProps,
  ScopeDataResult,
} from '~/features/input-scope-data/types/input-scope-data.types.ts';

import InputScopeDataView from './InputScopeDataView.vue';

defineOptions({ name: 'InputScopeDataModal' });

withDefaults(defineProps<InputScopeDataModalProps>(), {
  modelValue: false,
  initialLotId: '',
  standalone: false,
});

const emit = defineEmits<InputScopeDataModalEmits>();

function handleModalClose() {
  emit('update:modelValue', false);
  emit('cancel');
}

function handleModalOpenChange(open: boolean) {
  emit('update:modelValue', open);
  if (!open) {
    emit('cancel');
  }
}

function handleComplete(result: ScopeDataResult) {
  emit('update:modelValue', false);
  emit('complete', result);
}
</script>

<style scoped>
.input-scope-data-modal :deep(.ds-modal) {
  width: min(440px, calc(100vw - var(--spacing-space-4, 16px) * 2)) !important;
  max-height: 92vh;
}

.input-scope-data-modal :deep(.ds-modal__body) {
  padding: 0 !important;
  background-color: var(--ds-color-bg-secondary, #f7f8f9);
  overflow-y: auto;
}

.input-scope-data-modal__title {
  font-size: var(--size-16px, 16px);
  font-weight: var(--weight-font-semibold, 600);
  color: var(--ds-color-text, #030712);
}

.input-scope-data-modal__content {
  width: 100%;
}
</style>
