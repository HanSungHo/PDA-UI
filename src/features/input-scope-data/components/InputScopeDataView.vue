<template>
  <div class="isd">
    <!-- Header -->
    <header class="isd__header">
      <h1 class="isd__title">Scope 측정 Data 입력</h1>
    </header>

    <!-- Scrollable body -->
    <div class="isd__body">
      <!-- Card: Product Info -->
      <section class="isd__card" aria-label="Product Info">
        <!-- Row: LOT ID input + 조회 button -->
        <div class="isd__row">
          <div class="isd__field">
            <label for="isd_lot_id" class="isd__field-label">LOT ID</label>
            <BaseInput
              id="isd_lot_id"
              ref="lotInputRef"
              v-model="lotId"
              autocapitalize="characters"
              :disabled="isLotLocked || isLoading"
              class="isd__input"
              @keydown.enter.prevent="handleLotEnter"
            />
          </div>
          <BaseButton
            type="button"
            variant="secondary"
            class="isd__btn--secondary"
            :disabled="isLotLocked || isLoading"
            label="조회"
            @click="handleSearchClick"
          />
        </div>

        <!-- Side Rinse -->
        <div class="isd__field">
          <label for="isd_side_rinse" class="isd__field-label">Side Rinse</label>
          <BaseInput
            id="isd_side_rinse"
            v-model="sideRinse"
            :disabled="isLoading"
            class="isd__input"
          />
        </div>

        <!-- WEE폭 -->
        <div class="isd__field">
          <label for="isd_wee_width" class="isd__field-label">WEE폭</label>
          <BaseInput
            id="isd_wee_width"
            v-model="weeWidth"
            :disabled="isLoading"
            class="isd__input"
          />
        </div>

        <!-- LOGO -->
        <div class="isd__field">
          <label for="isd_logo" class="isd__field-label">LOGO</label>
          <BaseInput id="isd_logo" v-model="logo" :disabled="isLoading" class="isd__input" />
        </div>

        <!-- 불량 항목 -->
        <div class="isd__field">
          <label for="isd_fault_category" class="isd__field-label">불량 항목</label>
          <BaseDropdownList
            id="isd_fault_category"
            v-model="selectedFaultCategory"
            :options="faultDropdownOptions"
            placeholder="선택"
            :disabled="isLoading"
            class="isd__input"
          />
        </div>
      </section>

      <!-- Card: Wafer 25-Slot Process Table -->
      <section class="isd__card" aria-label="Wafer Slot Grid">
        <div class="isd__wafer-grid">
          <button
            v-for="slot in slots"
            :key="slot.slotNumber"
            type="button"
            class="isd__slot"
            :class="{
              'isd__slot--selected': slot.isSelected,
              'isd__slot--empty': !slot.isPresent,
            }"
            :disabled="!slot.isPresent || isLoading"
            @click="store.toggleSlot(slot.slotNumber)"
          >
            {{ slot.slotNumber }}
          </button>
        </div>
      </section>

      <!-- Card: Wafer Selection display + 정정 button -->
      <section class="isd__card">
        <div class="isd__row">
          <div class="isd__wafer-list-box" tabindex="0" aria-label="Selected Wafers">
            {{ selectedWaferString }}
          </div>
          <BaseButton
            type="button"
            variant="secondary"
            class="isd__btn--secondary"
            :disabled="isLoading"
            label="정정"
            @click="store.resetWaferSelection()"
          />
        </div>
      </section>
    </div>

    <!-- Footer -->
    <footer class="isd__footer">
      <div class="isd__footer-inner">
        <BaseButton
          type="button"
          variant="primary"
          size="large"
          block
          class="isd__footer-btn isd__btn--primary"
          :disabled="isLoading || isSaving"
          label="확인"
          @click="handleOk"
        />
        <BaseButton
          type="button"
          variant="tertiary"
          size="large"
          block
          class="isd__footer-btn isd__btn--tertiary"
          :disabled="isSaving"
          label="취소"
          @click="handleCancel"
        />
      </div>
    </footer>

    <!-- Alert Modal -->
    <BaseModal
      :open="alertState.visible"
      :title="alertState.title"
      :closable="false"
      :overlay-closable="false"
      class="action-dialog"
      @cancel="store.closeAlert()"
    >
      <p class="action-dialog-message">{{ alertState.message }}</p>
      <template #footer>
        <div class="action-dialog-actions">
          <BaseButton
            class="action-dialog-confirm"
            :label="COMMON_FIELD.BTNOKSTR"
            @click="handleAlertClose"
          />
        </div>
      </template>
    </BaseModal>

    <!-- Confirm Modal -->
    <BaseModal
      :open="confirmState.visible"
      :title="confirmState.title"
      :closable="false"
      :overlay-closable="false"
      class="action-dialog"
      @cancel="confirmState.onCancel()"
    >
      <p class="action-dialog-message">{{ confirmState.message }}</p>
      <template #footer>
        <div class="action-dialog-actions">
          <BaseButton
            class="action-dialog-cancel"
            :label="COMMON_FIELD.NEGATIVEBTNSTR"
            @click="confirmState.onCancel()"
          />
          <BaseButton
            class="action-dialog-confirm"
            :label="COMMON_FIELD.BTNOKSTR"
            @click="confirmState.onConfirm()"
          />
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import {
  BaseButton,
  BaseDropdownList,
  BaseInput,
  BaseModal,
  type BaseOption,
} from 'src/components/base';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { computed, onMounted, ref } from 'vue';

import type { ScopeDataResult } from '~/features/input-scope-data/types/input-scope-data.types';

import { useInputScopeDataStore } from '../stores/input-scope-data.store';

defineOptions({ name: 'InputScopeDataView' });

const props = withDefaults(
  defineProps<{
    initialLotId?: string;
  }>(),
  {
    initialLotId: '',
  },
);

const emit = defineEmits<{
  (e: 'complete', result: ScopeDataResult): void;
  (e: 'cancel'): void;
}>();

const store = useInputScopeDataStore();
const {
  alertState,
  confirmState,
  faultCategoryOptions,
  isLoading,
  isLotLocked,
  isSaving,
  logo,
  lotId,
  selectedFaultCategory,
  selectedWaferString,
  sideRinse,
  slots,
  weeWidth,
} = storeToRefs(store);

const lotInputRef = ref<{ focus?: () => void; select?: () => void } | null>(null);
const pendingCompleteResult = ref<ScopeDataResult | null>(null);

const faultDropdownOptions = computed<BaseOption[]>(() =>
  faultCategoryOptions.value.map((fault) => ({
    label: fault,
    value: fault,
  })),
);

onMounted(async () => {
  if (props.initialLotId) {
    await store.initLot(props.initialLotId);
  } else {
    store.resetForm();
    lotInputRef.value?.focus?.();
  }
});

async function handleLotEnter() {
  await store.handleLotBarcodeEnter(lotId.value);
}

async function handleSearchClick() {
  await store.handleLotSearch(lotId.value);
}

async function handleOk() {
  const result = await store.submitScopeData();
  if (result) {
    pendingCompleteResult.value = result;
    store.showAlert('확  인', '데이터가 저장 되었습니다.');
  }
}

function handleAlertClose() {
  store.closeAlert();
  if (pendingCompleteResult.value) {
    const res = pendingCompleteResult.value;
    pendingCompleteResult.value = null;
    emit('complete', res);
  }
}

function handleCancel() {
  store.resetForm();
  emit('cancel');
}

defineExpose({
  handleAlertClose,
});
</script>

<style scoped>
/* ─── Root ─────────────────────────────────────────────────────────── */
.isd {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  /* Figma gradient: #1C493A 0% → #96B1A8 54% → #ECF8F1 100% */
  background: linear-gradient(180deg, var(--teal-800, #1c493a) 0%, #96b1a8 54%, #ecf8f1 100%);
  font-family: 'Noto Sans KR', sans-serif;
  color: var(--gray-950, #030712);
  box-sizing: border-box;
}

/* ─── Header ─────────────────────────────────────────────────────────── */
.isd__header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: transparent;
  flex-shrink: 0;
}

.isd__title {
  margin: 0;
  font-size: var(--size-18px, 18px);
  font-weight: var(--weight-font-bold, 700);
  line-height: 1.556;
  color: var(--gray-50, #f9fafb);
  text-align: center;
}

/* ─── Scrollable body ────────────────────────────────────────────────── */
.isd__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px;
  overflow-y: auto;
}

/* ─── Cards ──────────────────────────────────────────────────────────── */
.isd__card {
  background-color: var(--gray-100, #f3f4f6);
  border: 1px solid var(--gray-300, #d1d5dc);
  border-radius: var(--radius-4, 4px);
  box-shadow: 0px 8px 24px 0px rgba(13, 20, 31, 0.06);
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

/* ─── Row (horizontal flex) ──────────────────────────────────────────── */
.isd__row {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 8px;
}

/* ─── Field (label + input stacked) ─────────────────────────────────── */
.isd__field {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  flex: 1;
}

/* ─── Wafer 25-slot grid ─────────────────────────────────────────────── */
.isd__wafer-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.isd__slot {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-8, 8px);
  font-size: var(--size-12px, 12px);
  font-weight: var(--weight-font-medium, 500);
  font-family: inherit;
  cursor: pointer;
  transition:
    background-color 0.12s,
    color 0.12s;
  /* Default: State=Default fill_A7OSOR=#FFFFFF, text fill_SWGTB0=#030712, border fill_VB1WL3=#D1D5DC */
  background-color: #ffffff;
  border: 1px solid var(--gray-300, #d1d5dc);
  color: var(--gray-950, #030712);
}

/* Selected: State=Selected fill_ICRDHR=#02B0A5, text fill_KOZZLH=#F9FAFB */
.isd__slot--selected {
  background-color: var(--primary-teal-500, #02b0a5);
  border-color: var(--primary-teal-500, #02b0a5);
  color: var(--gray-50, #f9fafb);
}

/* Empty (no wafer in this slot) */
.isd__slot--empty {
  background-color: var(--gray-50, #f9fafb);
  border-color: var(--gray-200, #e5e7eb);
  color: var(--gray-300, #d1d5dc);
  cursor: not-allowed;
}

/* ─── Wafer list display box ──────────────────────────────────────────── */
.isd__wafer-list-box {
  flex: 1;
  height: 40px;
  padding: 8px 12px;
  background-color: var(--white-opacity-100, #ffffff);
  border: 1px solid var(--gray-300, #d1d5dc);
  border-radius: var(--radius-4, 4px);
  font-size: var(--typography-size-14px, 14px);
  color: var(--gray-950, #030712);
  display: flex;
  align-items: center;
  overflow-x: auto;
  white-space: nowrap;
  box-sizing: border-box;
}

/* ─── Footer ─────────────────────────────────────────────────────────── */
.isd__footer {
  flex-shrink: 0;
  padding: 12px;
}

.isd__footer-inner {
  display: flex;
  flex-direction: row;
  gap: 8px;
}
</style>

<style src="../../../components/base/modal/action-dialog.css"></style>
