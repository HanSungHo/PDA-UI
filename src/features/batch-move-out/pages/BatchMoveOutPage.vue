<template>
  <BaseScreen class="batch-move-out-page" title="BATCH MVOUT">
    <section class="ds-screen__card" aria-label="Batch summary">
      <div class="ds-screen__card-row">
        <BaseInput
          v-model="batchSearch"
          class="batch-move-out-field batch-move-out-field--search batch-move-out-search"
          label="BATCH ID"
          type="search"
          placeholder="Search"
          @keyup.enter="handleSearch"
        >
          <template #suffix>
            <q-icon name="sym_o_search" size="16px" aria-hidden="true" />
          </template>
        </BaseInput>
        <BaseButton
          class="batch-move-out-search-button"
          variant="secondary"
          size="small"
          :disabled="isLoading || isProcessing"
          @click="handleSearch"
        >
          조회
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

    <section class="ds-screen__card batch-move-out-grid-card" aria-label="Batch lot grid">
      <div v-if="isLoading" class="batch-move-out-loading">
        <BaseLoading size="small" />
        <span>Loading batch lots...</span>
      </div>
      <BaseRevoGrid
        v-else
        class="batch-move-out-grid"
        :rows="gridRows"
        :columns="gridColumns"
        :style="{ '--bmo-table-height': `${(items.length + 1) * 40}px` }"
        row-key="lotId"
        :selected-row-key="selectedLotId"
        selected-row-class="batch-move-out-row--selected"
        :row-size="40"
        :resize="false"
        aria-label="Batch lot grid"
        @row-select="selectItem(String($event))"
      />
      <div class="ds-screen__actions">
        <BaseButton
          class="batch-move-out-action-button"
          variant="tertiary"
          size="medium"
          :disabled="!canMoveSelected"
          @click="handleIndividualMoveOut"
        >
          개별 MOVE OUT
        </BaseButton>
        <BaseButton
          class="batch-move-out-action-button"
          variant="tertiary"
          size="medium"
          :disabled="!canReadComment"
          @click="handleReadComment"
        >
          COMMENT 읽기
        </BaseButton>
      </div>
    </section>
    <template #footer>
      <BaseButton
        class="batch-move-out-ok"
        size="medium"
        :disabled="isProcessing"
        @click="handleOk"
      >
        확인
      </BaseButton>
      <BaseButton
        class="batch-move-out-cancel"
        variant="tertiary"
        size="medium"
        @click="handleCancel"
      >
        취소
      </BaseButton>
    </template>

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
            size="medium"
            @click="resolveConfirm(false)"
          >
            아니오
          </BaseButton>
          <BaseButton size="medium" @click="resolveDialogPrimary">
            {{ dialogKind === 'confirm' ? '예' : '확인' }}
          </BaseButton>
        </footer>
      </section>
    </div>
  </BaseScreen>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue';
import { routeLocationKey } from 'vue-router';

import { BaseButton } from '../../../components/base/button';
import { BaseInput } from '../../../components/base/input';
import { BaseLoading } from '../../../components/base/loading';
import type { BaseRevoGridColumn } from '../../../components/base/revo-grid';
import { BaseRevoGrid } from '../../../components/base/revo-grid';
import { BaseScreen } from '../../../components/base/screen';
import { DeviceInfo } from '../../../constants/deviceinfo';
import { queryString } from '../../move-out/utils/route-query';
import {
  checkPreviewBatchMoveOutBatchCount,
  executePreviewBatchMoveOut,
  fetchPreviewBatchMoveOutFqcSampling,
  fetchPreviewBatchMoveOutList,
  previewBatchMoveOutId,
} from '../mocks/batch-move-out.preview';
import {
  checkBatchMoveOutBatchCount,
  executeBatchMoveOut,
  fetchBatchMoveOutFqcSampling,
  fetchBatchMoveOutList,
} from '../services/batch-move-out.service';
import { useBatchMoveOutStore } from '../stores/batch-move-out.store';
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
const route = inject(routeLocationKey, null);
const isDemoPreview =
  import.meta.env.DEV &&
  (queryString(route, 'demo') === '1' || queryString(route, 'batchId') === previewBatchMoveOutId);
const batchMoveOutStore = useBatchMoveOutStore();
const context = ref<BatchMoveOutContext>({
  batchId: queryString(route, 'batchId') || emptyContext.batchId,
  lotId: queryString(route, 'lotId') || emptyContext.lotId,
  eqpId: queryString(route, 'eqpId') || emptyContext.eqpId,
  recipe: queryString(route, 'recipe') || emptyContext.recipe,
  comment: queryString(route, 'comment') || emptyContext.comment,
  transport: queryString(route, 'transport') === 'Y' ? 'Y' : emptyContext.transport,
  facility: queryString(route, 'facility') || emptyContext.facility,
});
const items = ref<BatchMoveOutItem[]>([]);
const selectedLotId = ref('');
const batchSearch = ref(context.value.batchId);
const thickComment = ref('');
const dialogMessage = ref('');
const dialogKind = ref<'error' | 'info' | 'confirm'>('error');
const dialogTitleOverride = ref('');
let confirmResolver: ((value: boolean) => void) | undefined;
let dialogCloseHandler: (() => void) | undefined;

interface DialogRequest {
  kind: 'error' | 'info';
  message: string;
  title?: string;
  onClose?: () => void;
}

const dialogQueue: DialogRequest[] = [];
const dialogAfterQueue: Array<() => void> = [];

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
    const request = {
      lotId,
      batchId: batchSearch.value,
      eqpId: context.value.eqpId,
      facility: context.value.facility,
      state: 'MVOU',
    };
    const result = isDemoPreview
      ? fetchPreviewBatchMoveOutList(request)
      : await fetchBatchMoveOutList(request);

    if (result.ok) {
      const response = result.data!;
      context.value = preserveIntentContext(context.value, response.context);
      if (!isDemoPreview) batchSearch.value = context.value.batchId;
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

function preserveIntentContext(
  currentContext: BatchMoveOutContext,
  responseContext: BatchMoveOutContext,
): BatchMoveOutContext {
  return {
    batchId: responseContext.batchId || currentContext.batchId,
    lotId: responseContext.lotId || currentContext.lotId,
    eqpId: responseContext.eqpId || currentContext.eqpId,
    recipe: responseContext.recipe || currentContext.recipe,
    comment: responseContext.comment || currentContext.comment,
    transport: responseContext.transport || currentContext.transport,
    facility: responseContext.facility || currentContext.facility,
  };
}

function selectItem(lotId: string) {
  selectedLotId.value = lotId;
}

function handleSearch() {
  if (isLoading.value || isProcessing.value) return;
  void getBatchListByLot('');
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
  const request = {
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
    operatorId: DeviceInfo.OPERATOR_ID,
    inputMaskLogo: '',
    wfInterlock: '',
  };
  const result = isDemoPreview ? executePreviewBatchMoveOut() : await executeBatchMoveOut(request);

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
  const request = {
    lotId: item.lotId,
    opType: item.opType,
    eqpId: context.value.eqpId,
    operation: item.operation,
    subOperation: item.subOperation,
  };
  const result = isDemoPreview
    ? fetchPreviewBatchMoveOutFqcSampling()
    : await fetchBatchMoveOutFqcSampling(request);

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
  for (const message of messages) {
    showInfo(message, title);
  }
}

async function checkBatchCount() {
  const request = {
    facility: context.value.facility,
    eqpId: context.value.eqpId,
    operatorId: DeviceInfo.OPERATOR_ID,
  };
  const result = isDemoPreview
    ? checkPreviewBatchMoveOutBatchCount()
    : await checkBatchMoveOutBatchCount(request);

  if (result.ok) {
    if (result.batchDown) {
      showInfo(result.downMessage || '', '확  인', finishWithSuccess);
      return;
    }
  } else {
    showError(result.message || '', finishWithSuccess);
    return;
  }

  runAfterDialogs(finishWithSuccess);
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

  const query = new URLSearchParams({
    lotId: payload.lotId,
    operation: payload.operation,
    subOperation: payload.subOperation,
    processStep: payload.processStep,
    operSequence: payload.operSequence,
  });
  window.location.hash = `/comment-list?${query.toString()}`;
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
  batchMoveOutStore.complete({ ok: true, lotId: context.value.lotId });
  window.history.back();
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
  showDialog({ kind: 'error', message, onClose });
}

function showInfo(message: string, title?: string, onClose?: () => void) {
  showDialog({ kind: 'info', message, title, onClose });
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
  if (!dialogMessage.value) {
    showNextDialog();
  }
}

function resolveConfirm(value: boolean) {
  confirmResolver?.(value);
  confirmResolver = undefined;
  dialogMessage.value = '';
  dialogTitleOverride.value = '';
  dialogCloseHandler = undefined;
  showNextDialog();
}

function showDialog(request: DialogRequest) {
  if (dialogMessage.value) {
    dialogQueue.push(request);
    return;
  }

  presentDialog(request);
}

function showNextDialog() {
  const request = dialogQueue.shift();
  if (!request) {
    runDialogAfterQueue();
    return;
  }

  presentDialog(request);
}

function presentDialog(request: DialogRequest) {
  dialogKind.value = request.kind;
  dialogTitleOverride.value = request.title || '';
  dialogMessage.value = request.message;
  dialogCloseHandler = request.onClose;
}

function runAfterDialogs(callback: () => void) {
  if (dialogMessage.value || dialogQueue.length > 0) {
    dialogAfterQueue.push(callback);
    return;
  }

  callback();
}

function runDialogAfterQueue() {
  const callbacks = dialogAfterQueue.splice(0);
  for (const callback of callbacks) {
    callback();
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

<style scoped>
.batch-move-out-page {
  --bmi-shell-width: 100%;
}

/* Figma: content padding 4px 12px and 8px gap (BaseScreen defaults are 12px / 16px) */
.batch-move-out-page :deep(.ds-screen__content) {
  gap: 8px;
  padding: 4px 12px;
}

/* Quasar .q-btn min-height (2.572em) makes the small button 33.4px; the design is 32px */
.batch-move-out-search-button {
  min-height: 32px;
}

.batch-move-out-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

/* BaseInput customisation through its own variables / design tokens */
.batch-move-out-page .batch-move-out-field {
  --ds-field-label-width: 65px;

  min-width: 0;
}

.batch-move-out-page .batch-move-out-readonly-field {
  --ds-input-control-color: var(--text-text-secondary);
}

.batch-move-out-grid-card {
  min-height: 0;
  flex: 1 1 0;
  overflow: hidden;
}

.batch-move-out-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px;
}

.batch-move-out-grid {
  --base-revo-grid-border-width: 1px;
  --base-revo-grid-radius: 4px;

  min-height: 0;
  flex: 1;
}

.batch-move-out-grid :deep(.base-revo-grid__viewport::after) {
  bottom: auto;
  height: min(var(--bmo-table-height), 100%);
}

.batch-move-out-grid :deep(.base-revo-grid__scroll-indicator--horizontal) {
  display: none;
}

.batch-move-out-grid :deep(revo-grid) {
  --revo-grid-header-height: 40px;
  --revo-grid-font-family: var(--font-family-default, 'Noto Sans KR', sans-serif);
  --revo-grid-font-size: 13px;
  --revo-grid-header-bg: var(--background-background-brand);
  --revo-grid-header-padding: 0 8px;

  background: transparent;
}

.batch-move-out-grid :deep(.rgHeaderCell) {
  box-sizing: border-box;
  align-items: center;
  border-inline-end: 1px solid var(--gray-50);
  background: var(--background-background-brand);
  color: var(--text-text-reversed);
  font-size: 13px;
  font-weight: 700;
  text-align: left;
}

.batch-move-out-grid :deep(.rgHeaderCell .header-content) {
  text-align: left;
  text-transform: none;
}

.batch-move-out-grid :deep(.rgHeaderCell .header-controls) {
  display: none;
}

.batch-move-out-grid :deep(.rgHeaderCell[data-rgcol='1'] .header-content) {
  text-align: center;
}

.batch-move-out-grid :deep(.rgCell[aria-colindex='2']) {
  text-align: center;
}

.batch-move-out-grid :deep(.rgCell) {
  box-sizing: border-box;
  overflow: hidden;
  padding: 9px 8px;
  border-inline-end: 1px solid var(--border-border-primary);
  border-block-end: 1px solid var(--border-border-primary);
  background: var(--background-background-primary);
  color: var(--utility-gray-gray-text);
  font-size: 13px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-move-out-grid :deep(.rgCell:focus-visible) {
  outline: 2px solid var(--component-grid-focus-ring);
  outline-offset: -2px;
}

.batch-move-out-grid :deep(.batch-move-out-row--selected .rgCell) {
  background: var(--component-grid-row-selected-bg);
}

.batch-move-out-grid :deep(.is-run .rgCell) {
  background: var(--component-grid-row-run-bg);
  color: var(--white-opacity-100);
}

.batch-move-out-grid :deep(.is-fail .rgCell) {
  background: var(--semantic-red-600);
  color: var(--white-opacity-100);
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
  background: var(--component-dialog-scrim-bg);
  backdrop-filter: blur(5px);
  transform: translateX(-50%);
}

.batch-move-out-dialog {
  width: min(340px, calc(var(--bmi-shell-width) - 20px));
  min-height: 220px;
  overflow: hidden;
  border: 0;
  border-radius: 4px;
  background: var(--background-background-primary);
  box-shadow: var(--component-dialog-shadow);
}

.batch-move-out-dialog header {
  box-sizing: border-box;
  height: 44px;
  padding: 8px 12px;
  background: var(--background-background-primary);
}

.batch-move-out-dialog h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
}

.batch-move-out-dialog-body {
  box-sizing: border-box;
  display: flex;
  min-height: 96px;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  background: var(--gray-50);
  color: var(--text-text-error);
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  text-align: center;
}

.batch-move-out-dialog-body p {
  margin: 0;
}

.batch-move-out-dialog footer {
  box-sizing: border-box;
  display: flex;
  min-height: 80px;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px;
}

.batch-move-out-dialog footer.is-confirm {
  justify-content: flex-end;
}
</style>
