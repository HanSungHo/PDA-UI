<template>
  <main class="batch-move-out-page">
    <section class="batch-move-out-shell" aria-labelledby="batch-move-out-title">
      <header class="batch-move-out-titlebar">
        <BaseButton
          class="batch-move-out-back"
          variant="tertiary"
          icon-only
          aria-label="Back"
          @click="handleCancel"
        >
          <span aria-hidden="true" />
        </BaseButton>
        <h1 id="batch-move-out-title">BATCH MVOUT</h1>
      </header>

      <div class="batch-move-out-content">
        <section class="batch-move-out-card batch-move-out-summary" aria-label="Batch summary">
          <div class="batch-move-out-search-row">
            <BaseInput
              v-model="batchSearch"
              class="batch-move-out-field batch-move-out-field--search batch-move-out-search"
              label="Batch ID"
              type="search"
              placeholder="Search"
            >
              <template #suffix>
                <span class="batch-move-out-search-icon" aria-hidden="true" />
              </template>
            </BaseInput>
            <BaseButton class="batch-move-out-search-button" variant="secondary">
              Search
            </BaseButton>
          </div>

          <div class="batch-move-out-row">
            <BaseInput
              class="batch-move-out-field batch-move-out-readonly-field"
              label="장비"
              :model-value="formatField(context.eqpId)"
              readonly
            />
            <BaseInput
              class="batch-move-out-field batch-move-out-readonly-field"
              label="RECIPE"
              :model-value="formatField(context.recipe)"
              readonly
            />
          </div>
        </section>

        <section class="batch-move-out-card batch-move-out-grid-card" aria-label="Batch lot grid">
          <div v-if="isLoading" class="batch-move-out-loading">Loading batch lots...</div>
          <div v-else class="batch-move-out-grid-wrap">
            <table class="batch-move-out-grid">
              <thead>
                <tr>
                  <th scope="col"><BaseTableCell value="LOTNO" variant="heading" truncate /></th>
                  <th scope="col"><BaseTableCell value="C" variant="heading" align="center" /></th>
                  <th scope="col"><BaseTableCell value="상태" variant="heading" truncate /></th>
                  <th scope="col"><BaseTableCell value="공정명" variant="heading" truncate /></th>
                  <th scope="col"><BaseTableCell value="제품명" variant="heading" truncate /></th>
                  <th scope="col"><BaseTableCell value="수량" variant="heading" truncate /></th>
                  <th scope="col">
                    <BaseTableCell value="에러메시지" variant="heading" truncate />
                  </th>
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
                  <td><BaseTableCell :value="item.lotId" truncate /></td>
                  <td><BaseTableCell :value="item.commentQty || ''" align="center" /></td>
                  <td>
                    <BaseTableCell>
                      <BaseBadge
                        class="batch-move-out-status-chip"
                        :color="statusBadgeColor(item.status)"
                        :aria-label="item.status"
                      >
                        {{ item.status }}
                      </BaseBadge>
                    </BaseTableCell>
                  </td>
                  <td><BaseTableCell :value="item.processStep" truncate /></td>
                  <td><BaseTableCell :value="item.product" truncate /></td>
                  <td><BaseTableCell :value="item.quantity" truncate /></td>
                  <td><BaseTableCell :value="item.errorMessage" truncate /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div class="batch-move-out-actions">
          <BaseButton
            class="batch-move-out-action-button"
            variant="tertiary"
            :disabled="!canMoveSelected"
            @click="handleIndividualMoveOut"
          >
            개별 MOVE OUT
          </BaseButton>
          <BaseButton
            class="batch-move-out-action-button"
            variant="tertiary"
            :disabled="!canReadComment"
            @click="handleReadComment"
          >
            COMMENT 읽기
          </BaseButton>
        </div>
      </div>

      <footer class="batch-move-out-footer">
        <BaseButton class="batch-move-out-ok" :disabled="isProcessing" @click="handleOk">
          확인
        </BaseButton>
        <BaseButton class="batch-move-out-cancel" variant="tertiary" @click="handleCancel">
          취소
        </BaseButton>
      </footer>
    </section>

    <div v-if="dialogMessage" class="batch-move-out-scrim" role="presentation">
      <section
        class="batch-move-out-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-move-out-dialog-title"
      >
        <header>
          <h2 id="batch-move-out-dialog-title">{{ dialogTitle }}</h2>
        </header>
        <div class="batch-move-out-dialog-body">
          <p v-for="line in dialogLines" :key="line">{{ line }}</p>
        </div>
        <footer :class="{ 'is-confirm': dialogKind === 'confirm' }">
          <BaseButton
            v-if="dialogKind === 'confirm'"
            class="batch-move-out-dialog-secondary"
            variant="tertiary"
            @click="resolveConfirm(false)"
          >
            아니오
          </BaseButton>
          <BaseButton @click="resolveDialogPrimary">
            {{ dialogKind === 'confirm' ? '예' : '확인' }}
          </BaseButton>
        </footer>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { BaseBadge, BaseButton, BaseInput, BaseTableCell } from '../../../components/base';
import {
  checkBatchMoveOutBatchCount,
  executeBatchMoveOut,
  fetchBatchMoveOutFqcSampling,
  fetchBatchMoveOutList,
} from '../services/batch-move-out.service';
import type { BatchMoveOutContext, BatchMoveOutItem } from '../types/batch-move-out.types';

const emptyContext: BatchMoveOutContext = {
  batchId: '',
  lotId: '',
  eqpId: '',
  recipe: '',
  comment: '',
  transport: 'N',
  facility: '',
};

const isLoading = ref(true);
const isProcessing = ref(false);
const context = ref<BatchMoveOutContext>({ ...emptyContext });
const items = ref<BatchMoveOutItem[]>([]);
const selectedLotId = ref('');
const batchSearch = ref('');
const thickComment = ref('');
const dialogMessage = ref('');
const dialogKind = ref<'error' | 'info' | 'confirm'>('error');
const dialogTitleOverride = ref('');
let confirmResolver: ((value: boolean) => void) | undefined;
let dialogCloseHandler: (() => void) | undefined;

const selectedItem = computed(() => items.value.find((item) => item.lotId === selectedLotId.value));
const canMoveSelected = computed(
  () => !!selectedItem.value && selectedItem.value.status !== 'WAIT' && !isProcessing.value,
);
const canReadComment = computed(() => !!selectedItem.value && selectedItem.value.commentQty > 0);
const dialogLines = computed(() => dialogMessage.value.split('\n').filter(Boolean));
const dialogTitle = computed(() => {
  if (dialogTitleOverride.value) {
    return dialogTitleOverride.value;
  }

  if (dialogKind.value === 'info') {
    return '정보';
  }

  if (dialogKind.value === 'confirm') {
    return '확  인';
  }

  return '에  러';
});

onMounted(() => {
  void getBatchListByLot(context.value.lotId);
});

async function getBatchListByLot(lotId: string) {
  isLoading.value = true;
  selectedLotId.value = '';

  try {
    const result = await fetchBatchMoveOutList({
      lotId,
      batchId: batchSearch.value,
      eqpId: context.value.eqpId,
      facility: context.value.facility,
      state: 'MVOU',
    });

    if (result.ok) {
      const response = result.data!;
      context.value = response.context;
      batchSearch.value = response.context.batchId;
      thickComment.value = '';

      if (response.checkParameter === 'N') {
        showError(
          '해당 Batch에 입력된 계측 \nParameter값이 없습니다.\n계측 Parameter 입력 후,\n다시 수행 하시기 바랍니다.',
          finishWithoutResult,
        );
        return;
      }

      let nwCommentQty = response.unreadWorkCommentQty ?? 0;
      const batchItemList: BatchMoveOutItem[] = [];

      for (const item of response.items) {
        if (response.unreadWorkCommentQty === undefined) {
          nwCommentQty += item.nwCommentQty || 0;
        }

        const sthick = item.thickArea || '';
        if (thickComment.value) {
          thickComment.value = `${thickComment.value}\n${sthick}`;
        } else {
          thickComment.value = sthick;
        }

        if (item.lotId.trim() && item.processName !== 'MW_TEST') {
          batchItemList.push(item);
        }
      }

      items.value = batchItemList;

      if (items.value.length > 0) {
        if (nwCommentQty > 0) {
          showInfo('작업성 COMMENT가 있습니다.\n읽은후 진행하세요');
          return;
        }

        await moveOutAll();
      }
    } else {
      showError(result.message || '');
      return;
    }
  } catch {
    // Legacy MessageSender returns failed responses for server errors; unexpected exceptions do not
    // have a dedicated BatchMoveOutActivity popup.
  } finally {
    isLoading.value = false;
  }
}

function selectItem(lotId: string) {
  selectedLotId.value = lotId;
}

async function handleIndividualMoveOut() {
  if (!selectedItem.value) {
    return;
  }

  const validation = validateIndividualMoveOut(selectedItem.value);
  if (validation) {
    showError(validation);
    return;
  }

  const confirmed = await showConfirm(
    `[${selectedItem.value.lotId}] LOT을 개별 MOVE OUT하려합니다.\n하시겠습니까?`,
  );
  if (!confirmed) {
    return;
  }

  await moveOutItem(selectedItem.value, true);
}

async function moveOutAll() {
  isProcessing.value = true;

  try {
    const candidates = items.value.filter((item) => item.lotId !== 'D/W' && item.lotId.trim());

    if (candidates.length === 0) {
      showError('MOVE OUT할 LOT이 없습니다.');
      return;
    }

    for (const item of candidates) {
      const validation = validateAutoMoveOut(item);
      if (validation) {
        showError(validation);
        return;
      }
    }

    let errorCount = 0;
    for (const item of candidates) {
      const ok = await moveOutItem(item, false);
      if (!ok) {
        errorCount += 1;
      }
    }

    if (errorCount > 0) {
      showError(`BATCH MOVE OUT처리 도중 [${errorCount}]개의 에러가 발생하였습니다.`);
      return;
    }

    if (thickComment.value) {
      showInfo(
        thickComment.value,
        thickComment.value.includes('UV') ? 'UV검사 대상' : '두께 계측 대상',
        () => {
          void checkBatchCount();
        },
      );
      return;
    }

    await checkBatchCount();
  } finally {
    isProcessing.value = false;
  }
}

async function moveOutItem(item: BatchMoveOutItem, showFailureDialog: boolean): Promise<boolean> {
  const result = await executeBatchMoveOut({
    lotId: item.lotId,
    facility: context.value.facility,
    recipe: context.value.recipe,
    eqpId: context.value.eqpId,
    operation: item.operation,
    subOperation: item.subOperation,
    opType: item.opType,
    comment: context.value.comment,
    isCarry: context.value.transport === 'Y' ? 'Y' : 'N',
    bayName: context.value.transport === 'Y' ? item.bayName : '',
    stockerName: context.value.transport === 'Y' ? item.stockerName : '',
    quantity: item.quantity,
    isSkip: 'N',
    operatorId: '',
    inputMaskLogo: '',
    wfInterlock: '',
  });

  if (result.ok) {
    item.status = 'WAIT';
    item.errorMessage = '';
    await getFqcSamplingInfo(item);
    return true;
  } else {
    item.status = 'FAIL';
    item.errorMessage = result.message || 'MOVE OUT 처리에 실패했습니다.';
    if (showFailureDialog) {
      showError(item.errorMessage);
    }
    return false;
  }
}

async function getFqcSamplingInfo(item: BatchMoveOutItem) {
  const result = await fetchBatchMoveOutFqcSampling({
    lotId: item.lotId,
    opType: item.opType,
    eqpId: context.value.eqpId,
    operation: item.operation,
    subOperation: item.subOperation,
  });

  if (result.ok) {
    const messages = [
      result.cycleComment,
      result.recipeComment,
      result.updateCode,
      result.deleteCode,
    ].filter((message): message is string => !!message);

    showInfoSequential(messages, '확  인');
  } else {
    showError(result.message || '');
  }
}

function showInfoSequential(messages: string[], title?: string) {
  if (messages.length === 0) return;
  const [first, ...rest] = messages;
  showInfo(first, title, rest.length > 0 ? () => showInfoSequential(rest, title) : undefined);
}

async function checkBatchCount() {
  const result = await checkBatchMoveOutBatchCount({
    facility: context.value.facility,
    eqpId: context.value.eqpId,
    operatorId: '',
  });

  if (result.ok) {
    if (result.batchDown) {
      showInfo(result.downMessage || '', '확  인', finishWithSuccess);
      return;
    }
  } else {
    showError(result.message || '', finishWithSuccess);
    return;
  }

  finishWithSuccess();
}

function validateAutoMoveOut(item: BatchMoveOutItem): string {
  if (item.lotState !== 'WIP') {
    return `[${item.lotId}]는 [${item.lotState || 'Null'}]상태로\nMOVE OUT할수 없습니다.`;
  }

  if (item.status !== 'RUN') {
    return `[${item.lotId}]는 RUN상태가 아닙니다.\nMOVE OUT할수 없습니다.`;
  }

  return '';
}

function validateIndividualMoveOut(item: BatchMoveOutItem): string {
  if (item.lotId === 'D/W') {
    return 'DUMMY LOT은 MOVE OUT할 수 없습니다.';
  }

  if (!item.lotId.trim()) {
    return '빈 LOT은 MOVE OUT할 수 없습니다.';
  }

  if (item.lotState !== 'WIP') {
    return `[${item.lotId}]는 [${item.lotState || 'Null'}]상태로\nMOVE OUT할수 없습니다.`;
  }

  if (item.status !== 'RUN' && item.status !== 'FAIL') {
    return `[${item.lotId}]는 RUN상태가 아닙니다.\nMOVE OUT할수 없습니다.`;
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
  const notWait = items.value.find(
    (item) => item.lotId !== 'D/W' && item.lotId.trim() && item.status !== 'WAIT',
  );

  if (notWait) {
    showError(`[${notWait.lotId}]는 ${notWait.status || 'Null'} 상태 입니다.`);
    return;
  }

  finishWithSuccess();
}

function finishWithSuccess() {
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
  finishWithoutResult();
}

function finishWithoutResult() {
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

function showError(message: string, onClose?: () => void) {
  dialogKind.value = 'error';
  dialogTitleOverride.value = '';
  dialogMessage.value = message;
  dialogCloseHandler = onClose;
}

function showInfo(message: string, title?: string, onClose?: () => void) {
  dialogKind.value = 'info';
  dialogTitleOverride.value = title || '';
  dialogMessage.value = message;
  dialogCloseHandler = onClose;
}

function showConfirm(message: string): Promise<boolean> {
  dialogKind.value = 'confirm';
  dialogTitleOverride.value = '';
  dialogMessage.value = message;
  dialogCloseHandler = undefined;

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
  dialogTitleOverride.value = '';
  const onClose = dialogCloseHandler;
  dialogCloseHandler = undefined;
  onClose?.();
}

function resolveConfirm(value: boolean) {
  confirmResolver?.(value);
  confirmResolver = undefined;
  dialogMessage.value = '';
  dialogTitleOverride.value = '';
  dialogCloseHandler = undefined;
}

function formatField(value: string): string {
  return value.trim() || 'Placeholder';
}

function statusClass(status: string): string {
  const normalizedStatus = status.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  return `is-${normalizedStatus || 'unknown'}`;
}

function statusBadgeColor(status: string): 'blue' | 'yellow' | 'green' | 'red' | 'neutral' {
  if (status === 'WAIT') {
    return 'yellow';
  }

  if (status === 'RUN') {
    return 'green';
  }

  if (status === 'FAIL') {
    return 'red';
  }

  if (status === 'READY') {
    return 'blue';
  }

  return 'neutral';
}
</script>

<style scoped>
.batch-move-out-page {
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
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

:global(html),
:global(body),
:global(#app) {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}

.batch-move-out-shell {
  display: flex;
  width: var(--bmi-shell-width);
  height: 100%;
  margin: 0 auto;
  flex-direction: column;
  overflow: hidden;
  background: var(--bmi-bg);
}

.batch-move-out-titlebar {
  display: flex;
  height: 60px;
  flex: none;
  align-items: center;
  gap: 16px;
  padding: 16px;
  color: #f9fafb;
}

.batch-move-out-back {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.batch-move-out-back span {
  width: 13px;
  height: 13px;
  border-bottom: 2px solid currentcolor;
  border-left: 2px solid currentcolor;
  transform: rotate(45deg);
}

.batch-move-out-titlebar h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
  letter-spacing: 0;
}

.batch-move-out-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--bmi-content-gap);
  padding: var(--bmi-content-padding);
}

.batch-move-out-card {
  box-sizing: border-box;
  border: 1px solid var(--bmi-border);
  border-radius: 8px;
  background: var(--bmi-card);
  box-shadow: 0 8px 24px rgb(13 20 31 / 6%);
}

.batch-move-out-summary {
  display: flex;
  height: var(--bmi-summary-height);
  flex: none;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.batch-move-out-search-row,
.batch-move-out-row,
.batch-move-out-actions,
.batch-move-out-footer {
  display: flex;
  gap: 8px;
}

.batch-move-out-search-row {
  align-items: flex-end;
}

.batch-move-out-field {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  color: #030712;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.batch-move-out-search,
.batch-move-out-readonly-field {
  --ds-input-control-height: 40px;
  --ds-input-radius: 8px;
}

.batch-move-out-search :deep(.ds-field-shell__label),
.batch-move-out-readonly-field :deep(.ds-field-shell__label),
.batch-move-out-search :deep(.ds-field__label),
.batch-move-out-readonly-field :deep(.ds-field__label) {
  max-width: 100%;
  color: #030712;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.batch-move-out-search :deep(.ds-input__control),
.batch-move-out-readonly-field :deep(.ds-input__control) {
  height: 40px;
  min-height: 40px;
  padding: 8px 10px;
  border-color: var(--bmi-border);
  border-radius: 8px;
  background: #ffffff;
}

.batch-move-out-search :deep(.ds-input__native),
.batch-move-out-readonly-field :deep(.ds-input__native) {
  color: #364153;
  font-weight: 400;
}

.batch-move-out-search-icon {
  width: 14px;
  height: 14px;
  border: 2px solid #030712;
  border-radius: 50%;
}

.batch-move-out-search-icon::after {
  display: block;
  width: 6px;
  height: 2px;
  margin: 10px 0 0 10px;
  background: #030712;
  content: '';
  transform: rotate(45deg);
}

.batch-move-out-search-button,
.batch-move-out-action-button,
.batch-move-out-ok,
.batch-move-out-cancel,
.batch-move-out-dialog button {
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.batch-move-out-search-button {
  --ds-btn-padding-x: 0;

  width: 72px;
  height: 40px;
  border: 1px solid var(--bmi-accent);
  background: #ffffff;
  color: var(--bmi-accent);
  font-size: 14px;
}

.batch-move-out-search-button :deep(.anticon) {
  font-size: 16px;
}

.batch-move-out-search-button :deep(.ds-btn__label),
.batch-move-out-action-button :deep(.ds-btn__label),
.batch-move-out-ok :deep(.ds-btn__label),
.batch-move-out-cancel :deep(.ds-btn__label),
.batch-move-out-dialog button :deep(.ds-btn__label) {
  min-width: max-content;
  overflow: visible;
  text-overflow: clip;
}

.batch-move-out-grid-card {
  min-height: 0;
  flex: 1;
  padding: 12px 10px;
  overflow: hidden;
}

.batch-move-out-loading {
  padding: 24px;
}

.batch-move-out-grid-wrap {
  height: 100%;
  overflow: auto;
  scrollbar-color: var(--bmi-accent) transparent;
  scrollbar-width: thin;
}

.batch-move-out-grid-wrap::-webkit-scrollbar {
  width: 3px;
  height: 3px;
}

.batch-move-out-grid-wrap::-webkit-scrollbar-thumb {
  border-radius: 6px;
  background: var(--bmi-accent);
}

.batch-move-out-grid {
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

.batch-move-out-grid th,
.batch-move-out-grid td {
  overflow: hidden;
  height: 40px;
  box-sizing: border-box;
  padding: 0;
  border-right: 1px solid var(--bmi-border);
  border-bottom: 1px solid var(--bmi-border);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-move-out-grid th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--bmi-accent);
  color: #f9fafb;
  font-weight: 600;
}

.batch-move-out-grid :deep(.ds-table-cell) {
  height: 40px;
  min-height: 40px;
  padding: 8px 10px;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 14px;
  line-height: 20px;
}

.batch-move-out-grid th :deep(.ds-table-cell) {
  font-weight: 600;
}

.batch-move-out-grid th:nth-child(1),
.batch-move-out-grid td:nth-child(1) {
  width: 132px;
}

.batch-move-out-grid th:nth-child(2),
.batch-move-out-grid td:nth-child(2) {
  width: 36px;
  text-align: center;
}

.batch-move-out-grid th:nth-child(3),
.batch-move-out-grid td:nth-child(3) {
  width: 88px;
}

.batch-move-out-grid tr.is-selected {
  background: #d8fbf6;
}

.batch-move-out-grid tr.is-run {
  background: #059669;
  color: #ffffff;
}

.batch-move-out-grid tr.is-fail {
  background: #dc2627;
  color: #ffffff;
}

.batch-move-out-status-chip {
  min-width: 58px;
  height: 23px;
  min-height: 23px;
  padding: 2px 7px;
  border: 1px solid #93c5fd;
  border-radius: 999px;
  background: #eff6ff;
  color: #2584eb;
  font-size: 12px;
}

.batch-move-out-status-chip :deep(.ds-badge__text) {
  line-height: 1;
}

.batch-move-out-status-chip :deep(.ds-badge__icon) {
  width: auto;
  height: auto;
  font-size: 12px;
  line-height: 1;
}

.is-wait .batch-move-out-status-chip {
  border-color: #fde047;
  background: #fef9c3;
  color: #ca8a03;
}

.is-run .batch-move-out-status-chip,
.is-fail .batch-move-out-status-chip {
  border-color: rgb(255 255 255 / 60%);
  background: rgb(255 255 255 / 20%);
  color: #ffffff;
}

.batch-move-out-actions {
  flex: none;
}

.batch-move-out-action-button {
  min-width: 0;
  height: 36px;
  flex: 1;
  border: 1px solid var(--bmi-border);
  background: #ffffff;
  color: #101828;
  font-size: 14px;
}

.batch-move-out-action-button:disabled,
.batch-move-out-ok:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.batch-move-out-footer {
  height: 68px;
  flex: none;
  padding: 12px;
}

.batch-move-out-ok,
.batch-move-out-cancel {
  height: 44px;
  flex: 1;
  border: 1px solid var(--bmi-border);
  font-size: 16px;
}

.batch-move-out-ok {
  border-color: var(--bmi-accent);
  background: var(--bmi-accent);
  color: #f0fdfc;
}

.batch-move-out-cancel {
  background: #ffffff;
  color: #101828;
}

.batch-move-out-scrim {
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

.batch-move-out-dialog {
  width: min(340px, calc(var(--bmi-shell-width) - 20px));
  overflow: hidden;
  border: 1px solid #f3f4f6;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 1px 2px 10px rgb(113 164 244 / 30%);
}

.batch-move-out-dialog header {
  height: 44px;
  padding: 8px 12px;
  background: rgb(2 176 165 / 20%);
}

.batch-move-out-dialog h2 {
  margin: 0;
  font-size: 18px;
  line-height: 28px;
}

.batch-move-out-dialog-body {
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

.batch-move-out-dialog-body p {
  margin: 0;
}

.batch-move-out-dialog footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px;
}

.batch-move-out-dialog footer.is-confirm {
  justify-content: flex-end;
}

.batch-move-out-dialog button {
  width: 70px;
  height: 40px;
  border: 0;
  background: var(--bmi-accent);
  color: #f0fdfc;
}

.batch-move-out-dialog .batch-move-out-dialog-secondary {
  border: 1px solid var(--bmi-border);
  background: #ffffff;
  color: #101828;
}

@media (min-width: 600px) {
  .batch-move-out-page {
    --bmi-shell-width: min(100vw, 560px);
    --bmi-content-padding: 16px;
    --bmi-summary-height: 168px;
    --bmi-table-min-width: 760px;
  }

  .batch-move-out-grid-card {
    padding: 12px;
  }

  .batch-move-out-dialog {
    width: min(420px, calc(var(--bmi-shell-width) - 32px));
  }
}

@media (min-width: 900px) {
  .batch-move-out-page {
    --bmi-shell-width: min(100vw, 720px);
    --bmi-content-padding: 20px;
    --bmi-table-min-width: 100%;
  }

  .batch-move-out-titlebar {
    padding-inline: 20px;
  }

  .batch-move-out-summary {
    height: 112px;
    flex-direction: row;
    align-items: flex-end;
  }

  .batch-move-out-search-row {
    flex: 1.35;
  }

  .batch-move-out-row {
    flex: 1;
  }

  .batch-move-out-footer {
    padding-inline: 20px;
  }
}

@media (min-width: 1200px) {
  .batch-move-out-page {
    --bmi-shell-width: min(100vw, 920px);
    --bmi-content-padding: 24px;
  }

  .batch-move-out-summary {
    height: 112px;
  }

  .batch-move-out-grid th:nth-child(1),
  .batch-move-out-grid td:nth-child(1) {
    width: 180px;
  }

  .batch-move-out-grid th:nth-child(4),
  .batch-move-out-grid td:nth-child(4),
  .batch-move-out-grid th:nth-child(5),
  .batch-move-out-grid td:nth-child(5) {
    width: 140px;
  }
}
</style>
