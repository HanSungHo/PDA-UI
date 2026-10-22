<template>
  <BaseModal
    :open="modelValue"
    width="100%"
    :closable="false"
    :overlay-closable="false"
    class="rcp-comm-modal"
    @cancel="handleClose"
    @update:open="handleModalOpenChange"
  >
    <!-- Header Title: RCP 조건 ( OWNERCODE ) -->
    <template #title>
      <span class="rcp-modal__title">{{ titleText }}</span>
    </template>

    <div class="rcp-modal__body">
      <!-- Owner / Instruction Field & Modify Button -->
      <div class="rcp-field-row">
        <BaseInput :model-value="ownerText" readonly class="rcp-owner-input" />
        <BaseButton
          variant="secondary"
          label="변경"
          size="medium"
          :disabled="!canDownload || isExecuting"
          :loading="isExecuting"
          @click="executeModify"
        />
      </div>

      <!-- Machine Card -->
      <BaseInput :model-value="receiveEqpId" label="Machine" readonly />

      <!-- Recipe Card -->
      <BaseInput :model-value="receiveRecipe" label="Recipe" readonly />

      <!-- Table RevoGrid -->
      <div class="rcp-table-wrap">
        <BaseRevoGrid
          class="rcp-grid"
          :columns="gridColumns"
          :rows="gridRows"
          row-key="id"
          :row-size="40"
          :readonly="true"
        />
      </div>
    </div>

    <!-- Footer: Close Button (닫기) -->
    <template #footer>
      <div class="rcp-modal__footer">
        <BaseButton
          class="rcp-btn--close"
          label="닫기"
          size="large"
          :disabled="isExecuting"
          @click="handleClose"
        />
      </div>
    </template>

    <!-- OkDialog Popup 1:1 -->
    <BaseModal
      :open="dialogState.open"
      :width="360"
      :closable="false"
      :overlay-closable="false"
      @update:open="closeAlert"
    >
      <template #title>
        <span class="dialog-title">{{ dialogState.title }}</span>
      </template>
      <div class="dialog-body">
        <p>{{ dialogState.message }}</p>
      </div>
      <template #footer>
        <BaseButton
          class="rcp-btn--close"
          label="확인"
          variant="link"
          size="medium"
          @click="closeAlert"
        />
      </template>
    </BaseModal>

    <!-- OkCancelDialog Confirm 1:1 -->
    <BaseModal
      :open="confirmState.open"
      :width="360"
      :closable="false"
      :overlay-closable="false"
      @update:open="confirmState.open = $event"
    >
      <template #title>
        <span class="dialog-title">{{ confirmState.title }}</span>
      </template>
      <div class="dialog-body">
        <p>{{ confirmState.message }}</p>
      </div>
      <template #footer>
        <div class="dialog-actions">
          <BaseButton label="확인" class="mr-2" @click="confirmState.onConfirm" />
          <BaseButton variant="link" label="취소" @click="confirmState.open = false" />
        </div>
      </template>
    </BaseModal>
  </BaseModal>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';

import BaseButton from '~/components/base/button/BaseButton.vue';
import BaseInput from '~/components/base/input/BaseInput.vue';
import BaseModal from '~/components/base/modal/BaseModal.vue';
import BaseRevoGrid from '~/components/base/revo-grid/BaseRevoGrid.vue';

import { useRemoteEtchCommRcp } from '../composables/useRemoteEtchCommRcp';
import type { RemoteEtchApi, RemoteEtchInboundParams } from '../types/remoteEtchCommRcp.types';

interface Props {
  modelValue: boolean;
  inboundParams?: RemoteEtchInboundParams;
  api?: RemoteEtchApi;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  api: undefined,
  inboundParams: () => ({
    LOTID: 'LOT_DEMO_01',
    RECIPE: 'ETCH_RCP_DEMO',
    EQPID: 'TE8500_01',
    OPERID: 'OPER_100',
    OPERDESC: 'Poly Etch Step',
  }),
});

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'close'): void;
}>();

const {
  receiveRecipe,
  receiveEqpId,
  ownerText,
  titleText,
  canDownload,
  gridRows,
  gridColumns,
  isExecuting,
  dialogState,
  confirmState,
  setData,
  executeModify,
  closeAlert,
} = useRemoteEtchCommRcp(props.inboundParams, props.api);

function handleModalOpenChange(val: boolean) {
  emit('update:modelValue', val);
  if (!val) {
    emit('close');
  }
}

// Rule #7: Block peripherals until completion
function handleClose() {
  if (isExecuting.value) return;
  emit('update:modelValue', false);
  emit('close');
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      void setData();
    }
  },
);

onMounted(() => {
  if (props.modelValue) {
    void setData();
  }
});
</script>

<style scoped src="../styles/remote-etch-comm-rcp.css"></style>
