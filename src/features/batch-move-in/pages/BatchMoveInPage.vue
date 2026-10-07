<template>
  <main class="batch-move-in-page">
    <section class="batch-move-in-shell" aria-labelledby="batch-move-in-title">
      <header class="batch-move-in-titlebar">
        <q-btn
          class="batch-move-in-back"
          flat
          round
          dense
          icon="sym_o_arrow_back"
          aria-label="Back"
          @click="handleCancel"
        />
        <h1 id="batch-move-in-title">BATCH MVIN</h1>
      </header>

      <div class="batch-move-in-content">
        <section class="batch-move-in-card batch-move-in-summary" aria-label="Batch summary">
          <div class="batch-move-in-search-row">
            <q-input
              v-model="batchSearch"
              class="batch-move-in-field batch-move-in-field--search batch-move-in-search"
              label="Batch ID"
              type="search"
              placeholder="Search"
              filled
              stack-label
            >
              <template #append>
                <q-icon name="sym_o_search" />
              </template>
            </q-input>
            <q-btn
              class="batch-move-in-search-button"
              outline
              color="teal-7"
              no-caps
              @click="handleSearch"
            >
              Search
            </q-btn>
          </div>

          <div class="batch-move-in-row">
            <q-input
              class="batch-move-in-field batch-move-in-readonly-field"
              label="장비"
              :model-value="formatField(context.eqpId)"
              readonly
              outlined
            />
            <q-input
              class="batch-move-in-field batch-move-in-readonly-field"
              label="RECIPE"
              :model-value="formatField(context.recipe)"
              readonly
              outlined
            />
          </div>
        </section>

        <section class="batch-move-in-card batch-move-in-grid-card" aria-label="Batch lot grid">
          <div v-if="isLoading" class="batch-move-in-loading">
            <q-spinner-dots color="teal-7" size="24px" />
            <span>Loading batch lots...</span>
          </div>
          <div v-else class="batch-move-in-grid-wrap">
            <q-markup-table class="batch-move-in-grid" flat dense separator="none">
              <thead>
                <tr>
                  <th scope="col">LOTNO</th>
                  <th scope="col">C</th>
                  <th scope="col">상태</th>
                  <th scope="col">공정명</th>
                  <th scope="col">제품명</th>
                  <th scope="col">수량</th>
                  <th scope="col">에러메시지</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in items"
                  :key="item.lotId"
                  :class="[
                    statusClass(item.status),
                    { 'is-selected': selectedLotId === item.lotId },
                  ]"
                  tabindex="0"
                  @click="selectItem(item.lotId)"
                  @keyup.enter="selectItem(item.lotId)"
                >
                  <td :title="item.lotId">{{ item.lotId }}</td>
                  <td>{{ item.commentQty || '' }}</td>
                  <td>
                    <q-badge
                      class="batch-move-in-status-chip"
                      :color="statusBadgeColor(item.status)"
                      :text-color="statusTextColor(item.status)"
                      :aria-label="item.status"
                    >
                      {{ item.status }}
                    </q-badge>
                  </td>
                  <td :title="item.processStep">{{ item.processStep }}</td>
                  <td :title="item.product">{{ item.product }}</td>
                  <td :title="String(item.quantity)">{{ item.quantity }}</td>
                  <td :title="item.errorMessage">{{ item.errorMessage }}</td>
                </tr>
              </tbody>
            </q-markup-table>
          </div>
        </section>

        <div class="batch-move-in-actions">
          <q-btn
            class="batch-move-in-action-button"
            flat
            no-caps
            :disabled="!canMoveSelected"
            @click="handleIndividualMoveIn"
          >
            개별 MOVE IN
          </q-btn>
          <q-btn
            class="batch-move-in-action-button"
            flat
            no-caps
            :disabled="!canReadComment"
            @click="handleReadComment"
          >
            COMMENT 읽기
          </q-btn>
        </div>
      </div>

      <footer class="batch-move-in-footer">
        <q-btn
          class="batch-move-in-ok"
          unelevated
          no-caps
          :disabled="isProcessing"
          @click="handleOk"
        >
          확인
        </q-btn>
        <q-btn class="batch-move-in-cancel" flat no-caps @click="handleCancel"> 취소 </q-btn>
      </footer>
    </section>

    <div v-if="dialogMessage" class="batch-move-in-scrim" role="presentation">
      <section
        class="batch-move-in-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-move-in-dialog-title"
      >
        <header>
          <h2 id="batch-move-in-dialog-title">{{ dialogTitle }}</h2>
        </header>
        <div class="batch-move-in-dialog-body">
          <p v-for="line in dialogLines" :key="line">{{ line }}</p>
        </div>
        <footer :class="{ 'is-confirm': dialogKind === 'confirm' }">
          <q-btn
            v-if="dialogKind === 'confirm'"
            class="batch-move-in-dialog-secondary"
            flat
            no-caps
            @click="resolveConfirm(false)"
          >
            NO
          </q-btn>
          <q-btn unelevated no-caps @click="resolveDialogPrimary">
            {{ dialogKind === 'confirm' ? 'YES' : 'OK' }}
          </q-btn>
        </footer>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { executeBatchMoveIn, fetchBatchMoveInList } from '../services/batch-move-in.service';
import type { BatchMoveInContext, BatchMoveInItem } from '../types/batch-move-in.types';

const emptyContext: BatchMoveInContext = {
  batchId: '',
  lotId: '',
  eqpId: '',
  recipe: '',
  isSkip: 'N',
  facility: '',
};

const returnStateKey = 'batchMoveIn:returnState';

interface BatchMoveInReturnState {
  context: BatchMoveInContext;
  items: BatchMoveInItem[];
  selectedLotId: string;
  batchSearch: string;
}

const isLoading = ref(true);
const isProcessing = ref(false);
const context = ref<BatchMoveInContext>({ ...emptyContext });
const items = ref<BatchMoveInItem[]>([]);
const selectedLotId = ref('');
const batchSearch = ref('');
const dialogMessage = ref('');
const dialogKind = ref<'error' | 'info' | 'confirm'>('error');
let confirmResolver: ((value: boolean) => void) | undefined;

const selectedItem = computed(() => items.value.find((item) => item.lotId === selectedLotId.value));
const canMoveSelected = computed(
  () => !!selectedItem.value && selectedItem.value.status !== 'RUN' && !isProcessing.value,
);
const canReadComment = computed(() => !!selectedItem.value && selectedItem.value.commentQty > 0);
const dialogLines = computed(() => dialogMessage.value.split('\n').filter(Boolean));
const dialogTitle = computed(() => {
  if (dialogKind.value === 'info') {
    return 'Info';
  }

  if (dialogKind.value === 'confirm') {
    return 'OK';
  }

  return 'Error';
});

onMounted(() => {
  if (restoreReturnState()) {
    return;
  }

  void loadBatchList();
});

async function loadBatchList() {
  isLoading.value = true;
  selectedLotId.value = '';

  try {
    const response = await fetchBatchMoveInList();
    context.value = response.context;
    batchSearch.value = response.context.batchId;
    items.value = response.items.filter(
      (item) => item.lotId.trim() && item.processName !== 'MW_TEST',
    );

    if (items.value.length === 0) {
      showError('There is no Lot to MOVE IN.');
      return;
    }

    if (response.unreadWorkCommentQty > 0) {
      showInfo('Work Comment exists.\nPlease read it before proceeding.');
      return;
    }

    await moveInAll();
  } catch {
    showError('Unable to load batch move in list.');
  } finally {
    isLoading.value = false;
  }
}

function selectItem(lotId: string) {
  selectedLotId.value = lotId;
}

function handleSearch() {
  // Legacy BatchMoveInActivity has this button in the layout but no click listener.
}

async function handleIndividualMoveIn() {
  if (!selectedItem.value) {
    showError('Please select Lot.');
    return;
  }

  const validation = validateIndividualMoveIn(selectedItem.value);
  if (validation) {
    showError(validation);
    return;
  }

  const confirmed = await showConfirm(
    `[${selectedItem.value.lotId}] LOT will be individually MOVED IN.\nDo you want to continue?`,
  );
  if (!confirmed) {
    return;
  }

  await moveInItem(selectedItem.value, true);
}

async function moveInAll() {
  isProcessing.value = true;

  try {
    const candidates = items.value.filter((item) => item.lotId !== 'D/W' && item.lotId.trim());

    if (candidates.length === 0) {
      showError('There is no Lot to MOVE IN.');
      return;
    }

    for (const item of candidates) {
      const validation = validateAutoMoveIn(item);
      if (validation) {
        showError(validation);
        return;
      }
    }

    let errorCount = 0;
    for (const item of candidates) {
      const ok = await moveInItem(item, false);
      if (!ok) {
        errorCount += 1;
      }
    }

    if (errorCount > 0) {
      showError(`${errorCount} Lot(s) failed MOVE IN.`);
      return;
    }

    finishWithSuccess();
  } finally {
    isProcessing.value = false;
  }
}

async function moveInItem(item: BatchMoveInItem, showFailureDialog: boolean): Promise<boolean> {
  const result = await executeBatchMoveIn({
    lotId: item.lotId,
    facility: context.value.facility,
    recipe: context.value.recipe,
    eqpId: context.value.eqpId,
    operation: item.operation,
    subOperation: item.subOperation,
    isSkip: context.value.isSkip,
    quantity: item.quantity,
  });

  if (result.ok) {
    item.status = 'RUN';
    item.errorMessage = '';
    return true;
  }

  item.status = 'FAIL';
  item.errorMessage = result.message || 'MOVE IN failed.';
  if (showFailureDialog) {
    showError(item.errorMessage);
  }
  return false;
}

function validateAutoMoveIn(item: BatchMoveInItem): string {
  if (item.lotState !== 'WIP') {
    return `[${item.lotId}] is in [${item.lotState || 'Null'}] State\nMOVE IN is not allowed.`;
  }

  if (item.status !== 'WAIT') {
    return `[${item.lotId}] is not WAIT Status\nMOVE IN is not allowed.`;
  }

  return '';
}

function validateIndividualMoveIn(item: BatchMoveInItem): string {
  if (item.lotId === 'D/W') {
    return 'Dummy Lot cannot MOVE IN.';
  }

  if (!item.lotId.trim()) {
    return 'Empty Lot cannot MOVE IN.';
  }

  if (item.lotState !== 'WIP') {
    return `[${item.lotId}] is in [${item.lotState || 'Null'}] State\nMOVE IN is not allowed.`;
  }

  if (item.status !== 'WAIT' && item.status !== 'FAIL') {
    return `[${item.lotId}] is not WAIT Status\nMOVE IN is not allowed.`;
  }

  return '';
}

function handleReadComment() {
  if (!selectedItem.value || selectedItem.value.commentQty <= 0) {
    return;
  }

  const payload = {
    lotId: selectedItem.value.lotId,
    operation: selectedItem.value.operation,
    subOperation: selectedItem.value.subOperation,
    processStep: selectedItem.value.processStep,
    operSequence: selectedItem.value.operSequence,
  };

  saveReturnState();

  const androidBridge = (
    window as Window & {
      Android?: { openCommentList?: (payload: string) => void };
    }
  ).Android;

  if (typeof androidBridge?.openCommentList === 'function') {
    androidBridge.openCommentList(JSON.stringify(payload));
    return;
  }

  window.location.hash = `/comment-list?lotId=${encodeURIComponent(payload.lotId)}`;
}

function handleOk() {
  const notRun = items.value.find(
    (item) => item.lotId !== 'D/W' && item.lotId.trim() && item.status !== 'RUN',
  );

  if (notRun) {
    showError(`[${notRun.lotId}] is [${notRun.status || 'Null'}] Status.`);
    return;
  }

  finishWithSuccess();
}

function finishWithSuccess() {
  clearReturnState();

  const androidBridge = (
    window as Window & {
      Android?: {
        finishWithResult?: (result: string) => void;
        finish?: () => void;
      };
    }
  ).Android;

  if (typeof androidBridge?.finishWithResult === 'function') {
    androidBridge.finishWithResult('OK');
    return;
  }

  if (typeof androidBridge?.finish === 'function') {
    androidBridge.finish();
  }
}

function handleCancel() {
  clearReturnState();

  const androidBridge = (
    window as Window & {
      Android?: {
        close?: () => void;
        finish?: () => void;
      };
    }
  ).Android;

  if (typeof androidBridge?.close === 'function') {
    androidBridge.close();
    return;
  }

  if (typeof androidBridge?.finish === 'function') {
    androidBridge.finish();
    return;
  }

  window.history.back();
}

function showError(message: string) {
  dialogKind.value = 'error';
  dialogMessage.value = message;
}

function saveReturnState() {
  const state: BatchMoveInReturnState = {
    context: context.value,
    items: items.value,
    selectedLotId: selectedLotId.value,
    batchSearch: batchSearch.value,
  };

  sessionStorage.setItem(returnStateKey, JSON.stringify(state));
}

function restoreReturnState(): boolean {
  const rawState = sessionStorage.getItem(returnStateKey);
  if (!rawState) {
    return false;
  }

  try {
    const state = JSON.parse(rawState) as BatchMoveInReturnState;
    context.value = state.context;
    items.value = state.items;
    selectedLotId.value = state.selectedLotId;
    batchSearch.value = state.batchSearch;
    dialogMessage.value = '';
    isLoading.value = false;
    isProcessing.value = false;
    return true;
  } catch {
    clearReturnState();
    return false;
  }
}

function clearReturnState() {
  sessionStorage.removeItem(returnStateKey);
}

function showInfo(message: string) {
  dialogKind.value = 'info';
  dialogMessage.value = message;
}

function showConfirm(message: string): Promise<boolean> {
  dialogKind.value = 'confirm';
  dialogMessage.value = message;

  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

function resolveDialogPrimary() {
  if (dialogKind.value === 'confirm') {
    resolveConfirm(true);
    return;
  }

  dialogMessage.value = '';
}

function resolveConfirm(value: boolean) {
  confirmResolver?.(value);
  confirmResolver = undefined;
  dialogMessage.value = '';
}

function formatField(value: string): string {
  return value.trim() || 'Placeholder';
}

function statusClass(status: string): string {
  const normalizedStatus = status.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  return `is-${normalizedStatus || 'unknown'}`;
}

function statusBadgeColor(status: string): string {
  if (status === 'WAIT') {
    return 'amber-2';
  }

  if (status === 'RUN' || status === 'FAIL') {
    return 'white';
  }

  if (status === 'READY') {
    return 'blue-2';
  }

  return 'grey-3';
}

function statusTextColor(status: string): string {
  if (status === 'WAIT') {
    return 'amber-10';
  }

  if (status === 'RUN') {
    return 'positive';
  }

  if (status === 'FAIL') {
    return 'negative';
  }

  if (status === 'READY') {
    return 'blue-10';
  }

  return 'grey-9';
}
</script>

<style scoped>
.batch-move-in-page {
  --bmi-shell-width: min(100vw, 360px);
  --bmi-content-padding: 12px;
  --bmi-content-gap: 16px;
  --bmi-summary-height: 168px;
  --bmi-table-min-width: 760px;
  --bmi-bg: linear-gradient(180deg, #1c493a 0%, #96b1a8 54%, #ecf8f1 100%);
  --bmi-accent: #02b0a5;
  --bmi-card: #f9fafb;
  --bmi-border: #d1d5dc;
  --bmi-text: #101828;

  box-sizing: border-box;
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  width: 100vw;
  max-width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--bmi-bg);
  color: var(--bmi-text);
  font-family: var(--family-font-family-default, 'Noto Sans KR', sans-serif);
}

.batch-move-in-shell {
  display: flex;
  width: var(--bmi-shell-width);
  height: 100%;
  margin: 0 auto;
  flex-direction: column;
  overflow: hidden;
  background: var(--bmi-bg);
}

.batch-move-in-titlebar {
  display: flex;
  height: 60px;
  flex: none;
  align-items: center;
  gap: 16px;
  padding: 16px;
  color: #f9fafb;
}

.batch-move-in-back {
  width: 24px;
  height: 24px;
  color: inherit;
}

.batch-move-in-titlebar h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
  letter-spacing: 0;
}

.batch-move-in-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--bmi-content-gap);
  padding: var(--bmi-content-padding);
}

.batch-move-in-card {
  box-sizing: border-box;
  border: 1px solid var(--bmi-border);
  border-radius: 8px;
  background: var(--bmi-card);
  box-shadow: 0 8px 24px rgb(13 20 31 / 6%);
}

.batch-move-in-summary {
  display: flex;
  height: var(--bmi-summary-height);
  flex: none;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.batch-move-in-search-row,
.batch-move-in-row,
.batch-move-in-actions,
.batch-move-in-footer {
  display: flex;
  gap: 8px;
}

.batch-move-in-search-row {
  align-items: flex-end;
}

.batch-move-in-field {
  min-width: 0;
  flex: 1;
  color: #030712;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.batch-move-in-search :deep(.q-field__label),
.batch-move-in-readonly-field :deep(.q-field__label) {
  max-width: 100%;
  color: #030712;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.batch-move-in-search :deep(.q-field__control),
.batch-move-in-readonly-field :deep(.q-field__control) {
  height: 40px;
  min-height: 40px;
  border-radius: 8px;
  background: #ffffff;
}

.batch-move-in-search :deep(.q-field__control:before),
.batch-move-in-readonly-field :deep(.q-field__control:before) {
  border-color: var(--bmi-border);
}

.batch-move-in-search :deep(.q-field__native),
.batch-move-in-readonly-field :deep(.q-field__native) {
  color: #364153;
  font-weight: 400;
}

.batch-move-in-search :deep(.q-field__append) {
  color: #030712;
}

.batch-move-in-search-button,
.batch-move-in-action-button,
.batch-move-in-ok,
.batch-move-in-cancel,
.batch-move-in-dialog button {
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.batch-move-in-search-button {
  --ds-btn-padding-x: 0;

  width: 72px;
  height: 40px;
  border: 1px solid var(--bmi-accent);
  background: #ffffff;
  color: var(--bmi-accent);
  font-size: 14px;
}

.batch-move-in-grid-card {
  min-height: 0;
  flex: 1;
  padding: 12px 10px;
  overflow: hidden;
}

.batch-move-in-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px;
}

.batch-move-in-grid-wrap {
  height: 100%;
  overflow: auto;
  scrollbar-color: var(--bmi-accent) transparent;
  scrollbar-width: thin;
}

.batch-move-in-grid-wrap::-webkit-scrollbar {
  width: 3px;
  height: 3px;
}

.batch-move-in-grid-wrap::-webkit-scrollbar-thumb {
  border-radius: 6px;
  background: var(--bmi-accent);
}

.batch-move-in-grid :deep(table) {
  width: 100%;
  min-width: var(--bmi-table-min-width);
  border: 1px solid var(--bmi-accent);
  border-radius: 6px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  background: #ffffff;
  font-size: 14px;
}

.batch-move-in-grid :deep(th),
.batch-move-in-grid :deep(td) {
  overflow: hidden;
  height: 40px;
  box-sizing: border-box;
  padding: 8px 10px;
  border-right: 1px solid var(--bmi-border);
  border-bottom: 1px solid var(--bmi-border);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-move-in-grid :deep(th) {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--bmi-accent);
  color: #f9fafb;
  font-weight: 600;
}

.batch-move-in-grid :deep(th:nth-child(1)),
.batch-move-in-grid :deep(td:nth-child(1)) {
  width: 132px;
}

.batch-move-in-grid :deep(th:nth-child(2)),
.batch-move-in-grid :deep(td:nth-child(2)) {
  width: 36px;
  text-align: center;
}

.batch-move-in-grid :deep(th:nth-child(3)),
.batch-move-in-grid :deep(td:nth-child(3)) {
  width: 88px;
}

.batch-move-in-grid :deep(tr.is-selected) {
  background: #d8fbf6;
}

.batch-move-in-grid :deep(tr.is-run) {
  background: #059669;
  color: #ffffff;
}

.batch-move-in-grid :deep(tr.is-fail) {
  background: #dc2627;
  color: #ffffff;
}

.batch-move-in-status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 58px;
  height: 23px;
  min-height: 23px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 12px;
}

.batch-move-in-actions {
  flex: none;
}

.batch-move-in-action-button {
  min-width: 0;
  height: 36px;
  flex: 1;
  border: 1px solid var(--bmi-border);
  background: #ffffff;
  color: #101828;
  font-size: 14px;
}

.batch-move-in-action-button:disabled,
.batch-move-in-ok:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.batch-move-in-footer {
  height: 68px;
  flex: none;
  padding: 12px;
}

.batch-move-in-ok,
.batch-move-in-cancel {
  height: 44px;
  flex: 1;
  border: 1px solid var(--bmi-border);
  font-size: 16px;
}

.batch-move-in-ok {
  border-color: var(--bmi-accent);
  background: var(--bmi-accent);
  color: #f0fdfc;
}

.batch-move-in-cancel {
  background: #ffffff;
  color: #101828;
}

.batch-move-in-scrim {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 50%;
  z-index: 20;
  display: flex;
  width: var(--bmi-shell-width);
  align-items: center;
  justify-content: center;
  background: rgb(22 22 26 / 50%);
  backdrop-filter: blur(5px);
  transform: translateX(-50%);
}

.batch-move-in-dialog {
  width: min(340px, calc(var(--bmi-shell-width) - 20px));
  overflow: hidden;
  border: 1px solid #f3f4f6;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 1px 2px 10px rgb(113 164 244 / 30%);
}

.batch-move-in-dialog header {
  height: 44px;
  padding: 8px 12px;
  background: rgb(2 176 165 / 20%);
}

.batch-move-in-dialog h2 {
  margin: 0;
  font-size: 18px;
  line-height: 28px;
}

.batch-move-in-dialog-body {
  display: flex;
  min-height: 104px;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  background: #f9fafb;
  color: #dc2627;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
}

.batch-move-in-dialog-body p {
  margin: 0;
}

.batch-move-in-dialog footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px;
}

.batch-move-in-dialog footer.is-confirm {
  justify-content: flex-end;
}

.batch-move-in-dialog :deep(button) {
  width: 70px;
  height: 40px;
  border: 0;
  background: var(--bmi-accent);
  color: #f0fdfc;
}

.batch-move-in-dialog .batch-move-in-dialog-secondary {
  border: 1px solid var(--bmi-border);
  background: #ffffff;
  color: #101828;
}

@media (min-width: 600px) {
  .batch-move-in-page {
    --bmi-shell-width: min(100vw, 560px);
    --bmi-content-padding: 16px;
    --bmi-summary-height: 168px;
    --bmi-table-min-width: 760px;
  }

  .batch-move-in-grid-card {
    padding: 12px;
  }

  .batch-move-in-dialog {
    width: min(420px, calc(var(--bmi-shell-width) - 32px));
  }
}

@media (min-width: 900px) {
  .batch-move-in-page {
    --bmi-shell-width: min(100vw, 720px);
    --bmi-content-padding: 20px;
    --bmi-table-min-width: 100%;
  }

  .batch-move-in-titlebar {
    padding-inline: 20px;
  }

  .batch-move-in-summary {
    height: 112px;
    flex-direction: row;
    align-items: flex-end;
  }

  .batch-move-in-search-row {
    flex: 1.35;
  }

  .batch-move-in-row {
    flex: 1;
  }

  .batch-move-in-footer {
    padding-inline: 20px;
  }
}

@media (min-width: 1200px) {
  .batch-move-in-page {
    --bmi-shell-width: min(100vw, 920px);
    --bmi-content-padding: 24px;
  }

  .batch-move-in-summary {
    height: 112px;
  }

  .batch-move-in-grid th:nth-child(1),
  .batch-move-in-grid td:nth-child(1) {
    width: 180px;
  }

  .batch-move-in-grid th:nth-child(4),
  .batch-move-in-grid td:nth-child(4),
  .batch-move-in-grid th:nth-child(5),
  .batch-move-in-grid td:nth-child(5) {
    width: 140px;
  }
}
</style>
