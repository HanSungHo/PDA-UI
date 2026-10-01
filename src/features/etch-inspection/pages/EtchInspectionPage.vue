<template>
  <main class="etch-inspection-main">
    <BaseScreen
      title="ETCH INSPECTION"
      :ok-disabled="!canExecute"
      :ok-loading="loading"
      :cancel-disabled="loading"
      @back="close"
      @ok="execution"
      @cancel="close"
    >
      <section class="ds-screen__card etch-inspection-search-card" aria-label="LOT 조회">
        <div class="ds-screen__card-row etch-inspection-search-row">
          <BaseInput
            :ref="etchInspection.setLotInputRef"
            :model-value="LOTID"
            label="LOT Name"
            :disabled="loading"
            @update:model-value="updateLotInput"
            @keyup.enter="handleLotEnter"
          >
            <template #suffix>
              <SearchOutlined class="etch-inspection-search-icon" aria-hidden="true" />
            </template>
          </BaseInput>
          <BaseButton
            class="etch-inspection-search-button"
            variant="secondary"
            :loading="loading"
            @click="searchData()"
          >
            조회
          </BaseButton>
        </div>
      </section>

      <section class="ds-screen__card" aria-labelledby="etch-scope-title">
        <h2 id="etch-scope-title">ETCH SCOPE 검사 정보</h2>
        <div class="etch-inspection-field-group">
          <BaseInput :model-value="txtViewLotname" label="LOT Name" readonly />
          <BaseInput :model-value="sproduct" label="제품명" readonly />
        </div>

        <h3>이전 공정 정보</h3>
        <div class="etch-inspection-field-group">
          <BaseInput :model-value="OldOperation" label="공정번호" readonly />
          <BaseInput :model-value="OldOperationDesc" label="공정명" readonly />
          <BaseInput :model-value="oldMachine" label="MOVE IN 장비" readonly />
        </div>

        <h3>현재 공정 정보</h3>
        <div class="etch-inspection-field-group">
          <BaseInput :model-value="NowOperation" label="공정번호" readonly />
          <BaseInput :model-value="NowOperationDesc" label="공정명" readonly />
        </div>
      </section>

      <section class="ds-screen__card" aria-labelledby="etch-result-title">
        <h2 id="etch-result-title">완성 검사 입력 정보</h2>
        <BaseInput :model-value="sInspDate" label="검사 일시" readonly />
        <BaseInput
          :model-value="txtInspectionComment"
          label="COMMENT"
          :disabled="loading"
          @update:model-value="txtInspectionComment = String($event ?? '')"
        />
      </section>
    </BaseScreen>

    <BaseModal
      class="etch-inspection-dialog"
      :open="dialogMode !== ''"
      :width="340"
      :title="dialogTitle"
      :closable="false"
      :overlay-closable="false"
      @update:open="cancelDialog"
    >
      <p class="etch-inspection-dialog-message" role="alert">{{ dialogMessage }}</p>
      <template #footer>
        <div class="etch-inspection-dialog-actions">
          <BaseButton
            v-if="dialogMode === 'confirm'"
            class="etch-inspection-dialog-cancel"
            variant="tertiary"
            @click="cancelDialog"
          >
            아니오
          </BaseButton>
          <BaseButton
            v-if="dialogMode === 'confirm'"
            class="etch-inspection-dialog-confirm"
            @click="confirmExecution"
          >
            예
          </BaseButton>
          <BaseButton v-else class="etch-inspection-dialog-confirm" @click="closeDialog">
            확인
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </main>
</template>

<script setup lang="ts">
import { SearchOutlined } from '@ant-design/icons-vue';
import { BaseButton, BaseInput, BaseModal, BaseScreen } from 'src/components/base';

import { useEtchInspection } from '../composables/use-etch-inspection';

const etchInspection = useEtchInspection();
const {
  LOTID,
  txtViewLotname,
  OldOperation,
  OldOperationDesc,
  oldMachine,
  NowOperation,
  NowOperationDesc,
  sInspDate,
  sproduct,
  txtInspectionComment,
  loading,
  canExecute,
  dialogTitle,
  dialogMessage,
  dialogMode,
  updateLotInput,
  searchData,
  handleLotEnter,
  execution,
  confirmExecution,
  close,
  closeDialog,
  cancelDialog,
} = etchInspection;
</script>

<style scoped src="../styles/etch-inspection.css"></style>
