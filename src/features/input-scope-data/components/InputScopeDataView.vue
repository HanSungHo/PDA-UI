<template>
  <div class="isd">
    <!-- Header -->
    <header class="isd__header">
      <button type="button" class="isd__back-btn" aria-label="Back" @click="handleCancel">
        <svg
          class="isd__back-icon"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15 18L9 12L15 6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
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
            <input
              id="isd_lot_id"
              ref="lotInputRef"
              v-model="lotId"
              type="text"
              autocapitalize="characters"
              :disabled="isLotLocked || isLoading"
              class="isd__input"
              @keydown.enter.prevent="handleLotEnter"
            />
          </div>
          <button
            type="button"
            class="isd__btn isd__btn--secondary"
            :disabled="isLotLocked || isLoading"
            @click="handleSearchClick"
          >
            조회
          </button>
        </div>

        <!-- Side Rinse -->
        <div class="isd__field">
          <label for="isd_side_rinse" class="isd__field-label">Side Rinse</label>
          <input
            id="isd_side_rinse"
            v-model="sideRinse"
            type="text"
            :disabled="isLoading"
            class="isd__input"
          />
        </div>

        <!-- WEE폭 -->
        <div class="isd__field">
          <label for="isd_wee_width" class="isd__field-label">WEE폭</label>
          <input
            id="isd_wee_width"
            v-model="weeWidth"
            type="text"
            :disabled="isLoading"
            class="isd__input"
          />
        </div>

        <!-- LOGO -->
        <div class="isd__field">
          <label for="isd_logo" class="isd__field-label">LOGO</label>
          <input
            id="isd_logo"
            v-model="logo"
            type="text"
            :disabled="isLoading"
            class="isd__input"
          />
        </div>

        <!-- 불량 항목 -->
        <div class="isd__field">
          <label for="isd_fault_category" class="isd__field-label">불량 항목</label>
          <div class="isd__select-wrap">
            <select
              id="isd_fault_category"
              v-model="selectedFaultCategory"
              :disabled="isLoading"
              class="isd__select"
            >
              <option value="" disabled>선택</option>
              <option v-for="fault in faultCategoryOptions" :key="fault" :value="fault">
                {{ fault }}
              </option>
            </select>
            <svg
              class="isd__select-chevron"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      </section>

      <!-- Card: Wafer 25-Slot Process Table -->
      <section class="isd__card isd__card--grid" aria-label="Wafer Slot Grid">
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
          <button
            type="button"
            class="isd__btn isd__btn--secondary"
            :disabled="isLoading"
            @click="store.resetWaferSelection()"
          >
            정정
          </button>
        </div>
      </section>
    </div>

    <!-- Footer -->
    <footer class="isd__footer">
      <div class="isd__footer-inner">
        <button
          type="button"
          class="isd__btn isd__btn--primary"
          :disabled="isLoading || isSaving"
          @click="handleOk"
        >
          확인
        </button>
        <button
          type="button"
          class="isd__btn isd__btn--tertiary"
          :disabled="isSaving"
          @click="handleCancel"
        >
          취소
        </button>
      </div>
    </footer>

    <!-- Alert Modal -->
    <BaseModal
      :open="alertState.visible"
      :title="alertState.title"
      :closable="false"
      :overlay-closable="false"
      @cancel="store.closeAlert()"
    >
      <div class="isd-modal__body">
        <p class="isd-modal__msg">{{ alertState.message }}</p>
      </div>
      <template #footer>
        <button
          type="button"
          class="isd__btn isd__btn--primary isd__btn--full"
          @click="handleAlertClose"
        >
          확인
        </button>
      </template>
    </BaseModal>

    <!-- Confirm Modal -->
    <BaseModal
      :open="confirmState.visible"
      :title="confirmState.title"
      :closable="false"
      :overlay-closable="false"
      @cancel="confirmState.onCancel()"
    >
      <div class="isd-modal__body">
        <p class="isd-modal__msg">{{ confirmState.message }}</p>
      </div>
      <template #footer>
        <div class="isd-modal__actions">
          <button
            type="button"
            class="isd__btn isd__btn--tertiary"
            @click="confirmState.onCancel()"
          >
            취소
          </button>
          <button
            type="button"
            class="isd__btn isd__btn--primary"
            @click="confirmState.onConfirm()"
          >
            확인
          </button>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { BaseModal } from 'src/components/base';
import { onMounted, ref } from 'vue';

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

const lotInputRef = ref<HTMLInputElement | null>(null);
const pendingCompleteResult = ref<ScopeDataResult | null>(null);

onMounted(async () => {
  if (props.initialLotId) {
    await store.initLot(props.initialLotId);
  } else {
    store.resetForm();
    lotInputRef.value?.focus();
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
  gap: 16px;
  padding: 16px;
  background: transparent;
  flex-shrink: 0;
}

.isd__back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--gray-50, #f9fafb);
  cursor: pointer;
  flex-shrink: 0;
}

.isd__back-icon {
  width: 24px;
  height: 24px;
}

.isd__title {
  flex: 1;
  margin: 0;
  font-size: var(--size-18px, 18px);
  font-weight: var(--weight-font-bold, 700);
  line-height: 1.556;
  color: var(--gray-50, #f9fafb);
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
  background-color: var(--gray-50, #f9fafb);
  border: 1px solid var(--gray-300, #d1d5dc);
  border-radius: var(--radius-8, 8px);
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

.isd__field-label {
  font-size: var(--size-12px, 12px);
  font-weight: var(--weight-font-medium, 500);
  color: var(--gray-700, #374151);
  line-height: 1.2;
}

/* ─── Input ──────────────────────────────────────────────────────────── */
.isd__input {
  width: 100%;
  height: 40px;
  padding: 8px 12px;
  background-color: var(--gray-50, #f9fafb);
  border: 1px solid var(--gray-300, #d1d5dc);
  border-radius: var(--radius-8, 8px);
  font-size: var(--size-14px, 14px);
  font-family: inherit;
  color: var(--gray-950, #030712);
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s;
}

.isd__input:focus {
  border-color: var(--primary-teal-500, #02b0a5);
}

.isd__input:disabled {
  background-color: var(--gray-100, #f3f4f6);
  color: var(--gray-400, #9ca3af);
  cursor: not-allowed;
}

/* ─── Select ─────────────────────────────────────────────────────────── */
.isd__select-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.isd__select {
  width: 100%;
  height: 40px;
  padding: 8px 32px 8px 12px;
  background-color: var(--gray-50, #f9fafb);
  border: 1px solid var(--gray-300, #d1d5dc);
  border-radius: var(--radius-8, 8px);
  font-size: var(--size-14px, 14px);
  font-family: inherit;
  color: var(--gray-950, #030712);
  appearance: none;
  cursor: pointer;
  box-sizing: border-box;
  outline: none;
}

.isd__select:focus {
  border-color: var(--primary-teal-500, #02b0a5);
}

.isd__select-chevron {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--gray-500, #6b7280);
  pointer-events: none;
}

/* ─── Buttons ────────────────────────────────────────────────────────── */
.isd__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: none;
  border-radius: var(--radius-8, 8px);
  font-size: var(--size-14px, 14px);
  font-weight: var(--weight-font-bold, 700);
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}

.isd__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Primary — teal fill (Figma: fill_ICRDHR=#02B0A5, text fill_O1JKII=#F0FDFC) */
.isd__btn--primary {
  height: 44px;
  padding: 0 16px;
  background-color: var(--primary-teal-500, #02b0a5);
  color: var(--primary-teal-50, #f0fdfc);
  flex: 1;
}

/* Secondary — teal stroke, transparent fill (Figma: fill_TT4GB0=[], stroke fill_ICRDHR=#02B0A5) */
.isd__btn--secondary {
  height: 40px;
  padding: 0 12px;
  background-color: transparent;
  border: 1px solid var(--primary-teal-500, #02b0a5);
  color: var(--primary-teal-500, #02b0a5);
}

/* Tertiary — white fill, gray border (Figma: fill_A7OSOR=#FFFFFF, stroke fill_VB1WL3=#D1D5DC, text fill_AEZ1D6=#101828) */
.isd__btn--tertiary {
  height: 44px;
  padding: 0 16px;
  background-color: #ffffff;
  border: 1px solid var(--gray-300, #d1d5dc);
  color: #101828;
  flex: 1;
}

.isd__btn--full {
  width: 100%;
  flex: none;
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
  background-color: var(--gray-50, #f9fafb);
  border: 1px solid var(--gray-300, #d1d5dc);
  border-radius: var(--radius-8, 8px);
  font-size: var(--size-14px, 14px);
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

/* ─── Modal ───────────────────────────────────────────────────────────── */
.isd-modal__body {
  padding: 16px 8px;
  text-align: center;
}

.isd-modal__msg {
  margin: 0;
  font-size: var(--size-14px, 14px);
  line-height: 1.5;
  color: var(--gray-950, #030712);
  white-space: pre-line;
}

.isd-modal__actions {
  display: flex;
  gap: 8px;
  width: 100%;
}
</style>
