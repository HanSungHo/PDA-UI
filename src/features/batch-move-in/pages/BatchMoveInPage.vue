<template>
  <main class="batch-move-in-page">
    <section class="batch-move-in-shell" aria-labelledby="batch-move-in-title">
      <header class="batch-move-in-titlebar">
        <h1 id="batch-move-in-title">BATCH MVIN</h1>
      </header>

      <div class="batch-move-in-content">
        <section class="batch-move-in-card batch-move-in-summary" aria-label="Batch summary">
          <div class="batch-move-in-search-row">
            <BaseInput
              v-model="batchSearch"
              class="batch-move-in-field batch-move-in-search"
              label="Batch ID"
              type="search"
              placeholder="Search"
              stack-label
            >
              <template #suffix>
                <span class="batch-move-in-search-icon" aria-hidden="true" />
              </template>
            </BaseInput>
            <BaseButton
              class="batch-move-in-search-button"
              variant="secondary"
              @click="handleSearch"
            >
              조회
            </BaseButton>
          </div>

          <div class="batch-move-in-row">
            <BaseInput
              class="batch-move-in-field batch-move-in-readonly-field"
              label="장비"
              :model-value="formatField(context.eqpId)"
              readonly
            />
            <BaseInput
              class="batch-move-in-field batch-move-in-readonly-field"
              label="RECIPE"
              :model-value="formatField(context.recipe)"
              readonly
            />
          </div>
        </section>

        <section class="batch-move-in-card batch-move-in-grid-card" aria-label="Batch lot grid">
          <div v-if="isLoading" class="batch-move-in-loading">
            <BaseLoading size="small" />
            <span>Loading batch lots...</span>
          </div>
          <BaseRevoGrid
            v-else
            class="batch-move-in-grid"
            :rows="gridRows"
            :columns="gridColumns"
            :style="{ '--bmi-table-height': `${(items.length + 1) * 40}px` }"
            row-key="lotId"
            :selected-row-key="selectedLotId"
            selected-row-class="batch-move-in-row--selected"
            :row-size="40"
            :resize="false"
            aria-label="Batch lot grid"
            @row-select="selectItem(String($event))"
          />
        </section>

        <div class="batch-move-in-actions">
          <BaseButton
            class="batch-move-in-action-button"
            variant="tertiary"
            :disabled="!canMoveSelected"
            @click="handleIndividualMoveIn"
          >
            개별 MOVE IN
          </BaseButton>
          <BaseButton
            class="batch-move-in-action-button"
            variant="tertiary"
            :disabled="!canReadComment"
            @click="handleReadComment"
          >
            COMMENT 읽기
          </BaseButton>
        </div>
      </div>

      <footer class="batch-move-in-footer">
        <BaseButton class="batch-move-in-ok" :disabled="isProcessing" @click="handleOk">
          확인
        </BaseButton>
        <BaseButton class="batch-move-in-cancel" variant="tertiary" @click="handleCancel">
          취소
        </BaseButton>
      </footer>
    </section>

    <q-dialog
      class="batch-move-in-overlay"
      :model-value="!!dialogMessage"
      persistent
      @hide="handleDialogHide"
    >
      <q-card
        class="batch-move-in-dialog"
        role="dialog"
        aria-labelledby="batch-move-in-dialog-title"
      >
        <q-card-section class="batch-move-in-dialog-header">
          <div id="batch-move-in-dialog-title" class="batch-move-in-dialog-title">
            {{ dialogTitle }}
          </div>
        </q-card-section>
        <q-card-section class="batch-move-in-dialog-body">
          <p v-for="line in dialogLines" :key="line">{{ line }}</p>
        </q-card-section>
        <q-card-actions align="right" class="batch-move-in-dialog-actions">
          <BaseButton
            v-if="dialogKind === 'confirm'"
            class="batch-move-in-dialog-secondary"
            variant="tertiary"
            @click="resolveConfirm(false)"
          >
            NO
          </BaseButton>
          <BaseButton
            class="batch-move-in-dialog-primary"
            variant="tertiary"
            @click="resolveDialogPrimary"
          >
            {{ dialogKind === 'confirm' ? 'YES' : 'OK' }}
          </BaseButton>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </main>
</template>

<script setup lang="ts">
import { BaseButton } from 'src/components/base/button';
import { BaseInput } from 'src/components/base/input';
import { BaseLoading } from 'src/components/base/loading';
import type { BaseRevoGridColumn } from 'src/components/base/revo-grid';
import { BaseRevoGrid } from 'src/components/base/revo-grid';
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
const gridRows = computed(() =>
  items.value.map((item) => ({
    ...item,
    commentDisplay: item.commentQty || '',
    rowClass: statusClass(item.status),
  })),
);
const gridColumns: BaseRevoGridColumn[] = [
  { prop: 'lotId', name: 'LOTNO', size: 140 },
  { prop: 'commentDisplay', name: 'C', size: 36 },
  { prop: 'status', name: '상태', size: 88 },
  { prop: 'processStep', name: '공정명', size: 130 },
  { prop: 'product', name: '제품명', size: 130 },
  { prop: 'quantity', name: '수량', size: 70 },
  { prop: 'errorMessage', name: '에러메시지', size: 200 },
];
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
  // The original Batch Move In screen displays a search button without a search action.
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

function handleDialogHide() {
  if (dialogKind.value === 'confirm' && confirmResolver) {
    resolveConfirm(false);
  }
}

function formatField(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function statusClass(status: string): string {
  const normalizedStatus = status.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  return `is-${normalizedStatus || 'unknown'}`;
}
</script>

<style lang="scss" src="../styles/batch-move-in.scss"></style>
