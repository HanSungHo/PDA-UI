<script setup lang="ts">
import { onMounted } from 'vue';

import { BaseButton } from '~/components/base';
import BaseCheckbox from '~/components/base/checkbox/BaseCheckbox.vue';
import BaseDropdownList from '~/components/base/dropdown-list/BaseDropdownList.vue';
import BaseInput from '~/components/base/input/BaseInput.vue';
import BaseModal from '~/components/base/modal/BaseModal.vue';

import { useRework } from '../composables/useRework';

const {
  lotNo,
  eqpId,
  product,
  currentOperation,
  operator,
  qty,
  comment,
  reworkCodeList,
  selectedReworkCode,
  isCarryChecked,
  isCarryEnabled,
  isBayStkEnabled,
  bayList,
  selectedBay,
  stkList,
  selectedStk,
  isOkEnabled,
  isBusy,
  messageModalOpen,
  messageModal,
  closeMessageModal,
  init,
  onCommentEnter,
  executeRework,
  handleCancel,
} = useRework();

onMounted(async () => {
  await init();
});
</script>

<template>
  <div class="rework-legacy">
    <div class="header">
      <span class="title">REWORK</span>
    </div>

    <div class="container">
      <div class="card-product-info">
        <BaseInput v-model="lotNo" label="LOT No." stack-label readonly />
        <BaseInput v-model="eqpId" label="장비" stack-label readonly />

        <BaseDropdownList v-model="selectedReworkCode" label="RW CODE" :options="reworkCodeList" />

        <BaseInput v-model="comment" label="COMMENT" @keyup.enter="onCommentEnter" />
      </div>

      <div class="cbs-area">
        <div class="cbs-checkbox">
          <BaseCheckbox v-model="isCarryChecked" label="반송" :disabled="!isCarryEnabled" />
        </div>

        <div class="cbs-dropdowns">
          <div class="cbs-dropdown">
            <BaseDropdownList
              v-model="selectedBay"
              label="BAY"
              :options="bayList"
              :disabled="!isBayStkEnabled"
            />
          </div>

          <div class="cbs-dropdown">
            <BaseDropdownList
              v-model="selectedStk"
              label="STK"
              :options="stkList"
              :disabled="!isBayStkEnabled"
            />
          </div>
        </div>
      </div>

      <div class="card-product-info-2">
        <BaseInput v-model="product" label="제품명" readonly />

        <BaseInput v-model="currentOperation" label="현공정" readonly />

        <div class="form-row">
          <BaseInput v-model="operator" label="작업자" readonly />
          <BaseInput v-model="qty" label="수량" readonly />
        </div>
      </div>

      <div class="bottom-section">
        <BaseButton
          label="확인"
          variant="primary"
          block
          :disabled="!isOkEnabled || isBusy"
          @click="executeRework"
        />

        <BaseButton label="취소" variant="tertiary" block @click="handleCancel" />
      </div>
    </div>

    <BaseModal
      v-model:open="messageModalOpen"
      :title="messageModal.title"
      :closable="false"
      :mask-closable="false"
      :keyboard="false"
      :footer="null"
      :width="400"
    >
      <div class="message-modal">
        <div class="message-modal__content">{{ messageModal.message }}</div>
        <div class="message-modal__footer">
          <BaseButton label="확인" variant="primary" @click="closeMessageModal" />
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped src="../styles/rework.css"></style>
