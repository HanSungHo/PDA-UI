<script setup lang="ts">
import { QIcon } from 'quasar';

import {
  BaseButton,
  BaseCheckbox,
  BaseDropdownList,
  BaseInput,
  BaseModal,
  BaseScreen,
} from '~/components/base';

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
  <BaseScreen class="remote-imp-batch" title="진행 장비 선택">
    <section class="ds-screen__card remote-imp-batch__product-card" aria-label="진행 장비 정보">
      <BaseInput v-model="txtIngMachine" label="진행 장비" readonly />
      <BaseInput v-model="txtRecipe" label="RECIPE" readonly />
    </section>

    <section class="ds-screen__card remote-imp-batch__carry-card" aria-label="반송 설정">
      <div class="remote-imp-batch__carry-checkbox">
        <BaseCheckbox
          :model-value="chkCarry"
          label="반송"
          @update:model-value="checkChangeListener"
        />
      </div>

      <div class="remote-imp-batch__carry-dropdowns">
        <div class="remote-imp-batch__carry-dropdown">
          <BaseDropdownList
            :model-value="selectedBay"
            :options="bayOptions"
            :disabled="!isSpinnerBayEnabled"
            label="BAY"
            @update:model-value="itemSelectedListener"
          />
        </div>

        <div class="remote-imp-batch__carry-dropdown">
          <BaseDropdownList
            v-model="selectedStk"
            :options="stkOptions"
            :disabled="!isSpinnerStkEnabled"
            label="STK"
          />
        </div>
      </div>
    </section>

    <section
      v-for="port in ports"
      :key="port.id"
      class="ds-screen__card remote-imp-batch__port-card"
      :aria-labelledby="`remote-imp-batch-port-title-${port.id}`"
    >
      <h2
        :id="`remote-imp-batch-port-title-${port.id}`"
        class="ds-screen__card-title"
      >
        진행 LOT 정보
      </h2>

      <div class="ds-screen__card-row">
        <BaseInput
          :ref="
            (el: unknown) => {
              if (port.id === 2) editLot2Ref = el as { focus?: () => void } | null;
            }
          "
          :model-value="port.lotId"
          :readonly="port.isReadonlyInput"
          :label="port.label"
          placeholder="Search"
          @update:model-value="(val: unknown) => onLotInputUpdate(port.id, String(val ?? ''))"
          @keyup.enter="port.id === 2 ? editorActionListener() : undefined"
        >
          <template #suffix><QIcon name="sym_o_search" size="16px" aria-hidden="true" /></template>
        </BaseInput>

        <BaseButton
          label="조회"
          variant="secondary"
          size="small"
          :aria-label="`${port.label} 조회`"
          :disabled="port.isSearchDisabled"
          @click="onSingleClick(port.id === 1 ? 'btn_search_port1' : 'btn_search_port2')"
        />
      </div>

      <div class="ds-screen__card-row">
        <BaseInput label="제품명" :model-value="port.product" readonly />
        <BaseInput :model-value="port.jobCode" :aria-label="`${port.label} JOBCODE`" readonly />
      </div>

      <div class="ds-screen__card-row">
        <BaseInput label="공정명" :model-value="port.operation" readonly />
        <BaseInput :model-value="port.qty" :aria-label="`${port.label} 수량`" readonly />

        <BaseButton
          label="EEN"
          variant="secondary"
          size="small"
          :aria-label="`${port.label} EEN`"
          :disabled="!port.isCommentEnabled"
          @click="onSingleClick(port.id === 1 ? 'btn_comment_read1' : 'btn_comment_read2')"
        />
      </div>
    </section>

    <template #footer>
      <BaseButton
        label="START"
        variant="primary"
        size="medium"
        aria-label="START"
        :disabled="!isBtnStartEnabled"
        @click="onSingleClick('btn_start')"
      />
      <BaseButton
        label="취소"
        variant="tertiary"
        size="medium"
        aria-label="취소"
        @click="onSingleClick('btn_cancel')"
      />
    </template>

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
  </BaseScreen>
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
