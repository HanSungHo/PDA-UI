<script setup lang="ts">
import { ArrowLeftOutlined } from '@ant-design/icons-vue';
import { onMounted } from 'vue';

import { BaseButton } from '~/components/base';
import BaseCheckbox from '~/components/base/checkbox/BaseCheckbox.vue';
import BaseDropdownList from '~/components/base/dropdown-list/BaseDropdownList.vue';
import BaseInputField from '~/components/base/input-field/BaseInputField.vue';
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
      <BaseButton
        class="rework-legacy__back"
        variant="link"
        size="small"
        icon-only
        aria-label="뒤로"
        @click="handleCancel"
      >
        <ArrowLeftOutlined aria-hidden="true" />
      </BaseButton>
      <span class="title">REWORK</span>
    </div>

    <div class="container">
      <div class="card-product-info">
        <div class="form-group">
          <span class="label"> LOT No. </span>

          <BaseInputField v-model="lotNo" :disabled="true" />
        </div>

        <div class="form-group">
          <span class="label">장비</span>
          <BaseInputField v-model="eqpId" :disabled="true" />
        </div>

        <div class="form-group">
          <span class="label"> RW CODE</span>
          <BaseDropdownList v-model="selectedReworkCode" :options="reworkCodeList" />
        </div>

        <div class="form-group">
          <span class="label"> COMMENT </span>
          <BaseInputField v-model="comment" @keyup.enter="onCommentEnter" />
        </div>
      </div>
      <div class="cbs-area">
        <div class="cbs-checkbox">
          <BaseCheckbox v-model="isCarryChecked" label="반송" :disabled="!isCarryEnabled" />
        </div>

        <div class="cbs-dropdowns">
          <div class="cbs-dropdown">
            <label>BAY</label>
            <BaseDropdownList
              v-model="selectedBay"
              :options="bayList"
              :disabled="!isBayStkEnabled"
            />
          </div>

          <div class="cbs-dropdown">
            <label>STK</label>
            <BaseDropdownList
              v-model="selectedStk"
              :options="stkList"
              :disabled="!isBayStkEnabled"
            />
          </div>
        </div>
      </div>
      <div class="card-product-info-2">
        <div class="form-group">
          <span class="label"> 제품명 </span>

          <BaseInputField v-model="product" :disabled="true" />
        </div>

        <div class="form-group">
          <span class="label"> 현공정 </span>
          <BaseInputField v-model="currentOperation" :disabled="true" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <span class="label"> 작업자 </span>
            <BaseInputField v-model="operator" :disabled="true" />
          </div>
          <div class="form-group">
            <span class="label"> 수량 </span>
            <BaseInputField v-model="qty" :disabled="true" />
          </div>
        </div>
      </div>

      <div class="bottom-section">
        <BaseButton
          label="확인"
          variant="primary"
          :disabled="!isOkEnabled || isBusy"
          @click="executeRework"
        />

        <BaseButton label="취소" variant="tertiary" @click="handleCancel" />
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
