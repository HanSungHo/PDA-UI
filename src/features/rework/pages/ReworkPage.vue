<script setup lang="ts">
import { onMounted } from 'vue';

import { BaseButton } from '~/components/base';
import BaseCheckbox from '~/components/base/checkbox/BaseCheckbox.vue';
import BaseDropdownList from '~/components/base/dropdown-list/BaseDropdownList.vue';
import BaseInput from '~/components/base/input/BaseInput.vue';
import BaseModal from '~/components/base/modal/BaseModal.vue';
import { BaseScreen } from '~/components/base/screen';

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
  <BaseScreen class="rework-screen" title="REWORK">
    <div class="rework-form">
      <section class="ds-screen__card rework-card" aria-label="REWORK 정보">
        <BaseInput v-model="lotNo" label="LOT No." readonly />
        <BaseInput v-model="eqpId" label="장비" readonly />

        <BaseDropdownList v-model="selectedReworkCode" label="RW CODE" :options="reworkCodeList" />

        <BaseInput v-model="comment" label="COMMENT" @keyup.enter="onCommentEnter" />
      </section>

      <section class="ds-screen__card rework-transfer" aria-label="반송 정보">
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
      </section>

      <section class="ds-screen__card rework-card" aria-label="제품 정보">
        <BaseInput v-model="product" label="제품명" readonly />

        <BaseInput v-model="currentOperation" label="현공정" readonly />

        <div class="form-row">
          <BaseInput v-model="operator" label="작업자" readonly />
          <BaseInput v-model="qty" label="수량" readonly />
        </div>
      </section>
    </div>

    <template #footer>
      <div class="rework-actions">
        <BaseButton
          label="확인"
          variant="primary"
          block
          :disabled="!isOkEnabled || isBusy"
          @click="executeRework"
        />

        <BaseButton label="취소" variant="tertiary" block @click="handleCancel" />
      </div>
    </template>

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
  </BaseScreen>
</template>

<style scoped src="../styles/rework.css"></style>
