<script setup lang="ts">
import BaseButton from '~/components/base/button/BaseButton.vue';
import BaseCheckbox from '~/components/base/checkbox/BaseCheckbox.vue';
import BaseDropdownList from '~/components/base/dropdown-list/BaseDropdownList.vue';
import BaseInput from '~/components/base/input/BaseInput.vue';
import BaseModal from '~/components/base/modal/BaseModal.vue';

import { useRemoteImpBatch } from '../composables/useRemoteImpBatch';

const {
  txtIngMachine,
  txtRecipe,
  chkCarry,
  selectedBay,
  selectedStk,
  bayOptions,
  stkOptions,
  isSpinnerBayEnabled,
  isSpinnerStkEnabled,
  isBtnStartEnabled,
  ports,
  editLot2Ref,
  checkChangeListener,
  itemSelectedListener,
  editorActionListener,
  onSingleClick,
  onLotInputUpdate,
  messageModalOpen,
  messageModal,
  handleModalConfirm,
  handleModalCancel,
} = useRemoteImpBatch();
</script>

<template>
  <div class="remote-imp-batch-legacy">
    <div class="header">
      <span class="title">진행 장비 선택</span>
    </div>

    <div class="container">
      <!-- 진행 장비 / RECIPE -->
      <div class="card-product-info">
        <BaseInput v-model="txtIngMachine" label="진행 장비" aria-label="진행 장비" readonly />
        <BaseInput v-model="txtRecipe" label="RECIPE" aria-label="RECIPE" readonly />
      </div>

      <!-- 반송 / BAY / STK -->
      <div class="cbs-area">
        <div class="cbs-checkbox">
          <BaseCheckbox
            :model-value="chkCarry"
            label="반송"
            aria-label="반송"
            @update:model-value="checkChangeListener"
          />
        </div>

        <div class="cbs-dropdowns">
          <div class="cbs-dropdown">
            <BaseDropdownList
              :model-value="selectedBay"
              :options="bayOptions"
              :disabled="!isSpinnerBayEnabled"
              label="BAY"
              aria-label="BAY"
              @update:model-value="itemSelectedListener"
            />
          </div>
          <div class="cbs-dropdown">
            <BaseDropdownList
              v-model="selectedStk"
              :options="stkOptions"
              :disabled="!isSpinnerStkEnabled"
              label="STK"
              aria-label="STK"
            />
          </div>
        </div>
      </div>

      <!-- 진행 LOT 정보 (PORT 1, PORT 2) -->
      <div v-for="port in ports" :key="port.id" class="card-lot">
        <span v-if="port.id === 1" class="card-title">진행 LOT 정보</span>

        <span class="port-label">{{ port.label }}</span>
        <div class="form-row">
          <BaseInput
            :ref="
              (el: unknown) => {
                if (port.id === 2) editLot2Ref = el as { focus?: () => void } | null;
              }
            "
            :model-value="port.lotId"
            :readonly="port.isReadonlyInput"
            :aria-label="`${port.label} LOT ID`"
            placeholder="Search"
            @update:model-value="(val: unknown) => onLotInputUpdate(port.id, String(val ?? ''))"
            @keyup.enter="port.id === 2 ? editorActionListener() : undefined"
          />

          <div class="form-row__action form-row__action--sm">
            <BaseButton
              label="조회"
              variant="secondary"
              size="medium"
              :aria-label="`${port.label} 조회`"
              :disabled="port.isSearchDisabled"
              @click="onSingleClick(port.id === 1 ? 'btn_search_port1' : 'btn_search_port2')"
            />
          </div>
        </div>

        <span class="field-label">제품명</span>
        <div class="form-row">
          <BaseInput :model-value="port.product" :aria-label="`${port.label} 제품명`" readonly />
          <BaseInput :model-value="port.jobCode" :aria-label="`${port.label} JOBCODE`" readonly />
        </div>

        <span class="field-label">공정명</span>
        <div class="form-row">
          <BaseInput :model-value="port.operation" :aria-label="`${port.label} 공정명`" readonly />
          <BaseInput :model-value="port.qty" :aria-label="`${port.label} 수량`" readonly />
          <div class="form-row__action form-row__action--md">
            <BaseButton
              label="EEN"
              variant="secondary"
              :aria-label="`${port.label} EEN`"
              :disabled="!port.isCommentEnabled"
              @click="onSingleClick(port.id === 1 ? 'btn_comment_read1' : 'btn_comment_read2')"
            />
          </div>
        </div>
      </div>

      <div class="bottom-section">
        <BaseButton
          label="START"
          variant="primary"
          aria-label="START"
          :disabled="!isBtnStartEnabled"
          @click="onSingleClick('btn_start')"
        />
        <BaseButton
          label="취소"
          variant="tertiary"
          aria-label="취소"
          @click="onSingleClick('btn_cancel')"
        />
      </div>
    </div>

    <!-- BaseModal -->
    <BaseModal
      v-model:open="messageModalOpen"
      :title="messageModal.title"
      :closable="false"
      :overlay-closable="false"
      :footer="null"
      :width="400"
      @cancel="handleModalCancel"
    >
      <div class="message-modal">
        <div class="message-modal__content">
          {{ messageModal.message }}
        </div>

        <div class="message-modal__footer">
          <BaseButton
            v-if="messageModal.isConfirm"
            label="취소"
            variant="tertiary"
            aria-label="취소"
            @click="handleModalCancel"
          />

          <BaseButton
            label="확인"
            variant="primary"
            aria-label="확인"
            @click="handleModalConfirm"
          />
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.message-modal__content {
  padding: 16px 0;
  white-space: pre-line;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.5;
}

.message-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
</style>
<style scoped src="../styles/remote-imp-batch.css"></style>
