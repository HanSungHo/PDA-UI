<template>
  <BaseScreen class="move-out-page" title="MOVE OUT">
    <form id="move-out-form" class="move-out-page__fields" @submit.prevent="handleOk">
      <section class="move-out-card move-out-card--main">
        <div class="move-out-lot-grid">
          <BaseInput
            label="LOT No."
            layout="horizontal"
            :model-value="display.lotNo"
            placeholder="LOT No"
            readonly
          />
          <BaseInput
            placeholder="BAT ID"
            layout="horizontal"
            aria-label="BAT ID value"
            :model-value="display.batchId"
            readonly
          />
          <BaseButton
            data-testid="move-out-input-scope"
            size="small"
            variant="secondary"
            :disabled="!store.canInputScope"
            @click="handleInputScope"
          >
            {{ 'SCOPE  입력' }}
          </BaseButton>
          <BaseButton
            size="small"
            variant="secondary"
            :disabled="!store.canOpenBatch"
            @click="handleBatchLot"
          >
            BAT ID
          </BaseButton>
        </div>

        <BaseInput label="RECIPE" layout="horizontal" :model-value="display.recipe" readonly />
        <BaseInput label="장비" layout="horizontal" :model-value="display.machine" readonly />
        <BaseInput label="MASK TAG" layout="horizontal" :model-value="display.maskTag" readonly />
        <BaseInput v-model="store.form.comment" label="COMMENT" layout="horizontal" />
        <BaseInput v-model="store.form.maskLogo" label="MASK LOGO" layout="horizontal" />

        <div class="move-out-transfer-row">
          <BaseCheckbox
            v-model="store.form.carry"
            label="반송"
            @update:model-value="(checked: boolean) => void store.enableTransfer(checked)"
          />
          <BaseDropdownList
            v-model="store.form.selectedBay"
            label="BAY"
            :disabled="!store.form.carry"
            :options="store.bayOptions"
            @update:model-value="(bay: string) => void store.loadStockers(bay)"
          />
          <BaseDropdownList
            v-model="store.form.selectedStocker"
            label="STK"
            :disabled="!store.form.carry"
            :options="store.stockerOptions"
          />
        </div>

        <BaseInput label="제품명" layout="horizontal" :model-value="display.product" readonly />
        <BaseInput
          label="현재공정"
          layout="horizontal"
          :model-value="display.currentOperation"
          readonly
        />
        <BaseInput
          label="다음공정"
          layout="horizontal"
          :model-value="display.nextOperation"
          readonly
        />
        <div class="move-out-two-column">
          <BaseInput label="수량" layout="horizontal" :model-value="display.quantity" readonly />
          <BaseInput
            label="Good Chips"
            layout="horizontal"
            :model-value="display.goodChips"
            readonly
          />
        </div>
      </section>

      <section class="move-out-card move-out-card--actions">
        <div class="move-out-options">
          <BaseCheckbox v-model="store.form.nextProcessSkip" label="다음공정 SKIP" disabled />
          <BaseCheckbox
            v-model="store.form.wfInterlockCancel"
            label="W/F Interlock해제"
            :disabled="store.wfInterlockDisabled"
          />
        </div>
        <div class="move-out-comment-actions">
          <div class="move-out-comment-row">
            <BaseInput
              label="COMMENT"
              layout="horizontal"
              :model-value="display.commentQty"
              readonly
            />
            <span class="move-out-comment-unit">개</span>
            <BaseButton
              data-testid="move-out-read"
              size="small"
              variant="secondary"
              :disabled="!store.canReadComment"
              @click="handleReadComment"
            >
              읽기
            </BaseButton>
          </div>
          <BaseButton
            block
            size="small"
            data-testid="move-out-para"
            variant="tertiary"
            @click="handlePara"
          >
            계측 PARA
          </BaseButton>
        </div>
      </section>
    </form>

    <template #footer>
      <BaseButton
        class="move-out-page__action"
        html-type="submit"
        form="move-out-form"
        :disabled="!store.okEnabled || store.isProcessing"
      >
        확인
      </BaseButton>
      <BaseButton
        class="move-out-page__action"
        variant="primary"
        html-type="button"
        @click="handleWafer"
      >
        {{ store.whButtonText }}
      </BaseButton>
      <BaseButton
        class="move-out-page__action"
        variant="tertiary"
        html-type="button"
        @click="handleCancel"
      >
        취소
      </BaseButton>
    </template>
  </BaseScreen>

  <MoveOutEqpDownDialog
    v-model="isEqpDownOpen"
    :machine="store.lot?.display.machine ?? ''"
    :chamber-list="parsedChamberList"
    :facility="DeviceInfo.FACILITY"
    :operator-id="DeviceInfo.OPERATOR_ID"
    :operator-name="DeviceInfo.OPERATOR_NAME"
    @resolve="handleEqpDownResolved"
  />

  <BaseModal
    v-model:open="dialogOpen"
    class="move-out-page__dialog"
    :title="activeDialog?.title"
    :overlay-closable="false"
    @cancel="resolveDialogCancel"
  >
    <p v-for="line in dialogLines" :key="line">{{ line }}</p>
    <template #footer>
      <BaseButton
        v-if="activeDialog?.kind === 'confirm'"
        data-testid="move-out-dialog-cancel"
        variant="tertiary"
        @click="resolveDialogCancel"
      >
        아니오
      </BaseButton>
      <BaseButton data-testid="move-out-dialog-ok" @click="resolveDialogPrimary">
        {{ activeDialog?.kind === 'confirm' ? '예' : '확인' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseButton from 'src/components/base/button/BaseButton.vue';
import BaseCheckbox from 'src/components/base/checkbox/BaseCheckbox.vue';
import BaseDropdownList from 'src/components/base/dropdown-list/BaseDropdownList.vue';
import BaseInput from 'src/components/base/input/BaseInput.vue';
import BaseModal from 'src/components/base/modal/BaseModal.vue';
import { BaseScreen } from 'src/components/base/screen';
import { DeviceInfo } from 'src/constants/deviceinfo';
import { ROUTE } from 'src/constants/routes';
import { useBatchLotListStore } from 'src/features/batch-lot-list/stores/batch-lot-list.store';
import { useBatchMoveOutStore } from 'src/features/batch-move-out/stores/batch-move-out.store';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import MoveOutEqpDownDialog from '../components/MoveOutEqpDownDialog.vue';
import { type MoveOutMessage, useMoveOutStore } from '../stores/move-out.store';
import { useWaferSelectStore } from '../stores/wafer-select.store';
import { useWaferSkipStore } from '../stores/wafer-skip.store';
import type { MoveOutEqpDownResolveResult, RawChamberInput } from '../types/moveout-eqp-down.types';
import { queryString } from '../utils/route-query';

defineOptions({ name: 'MoveOutPage' });

const route = useRoute();
const router = useRouter();
const store = useMoveOutStore();
const batchLotListStore = useBatchLotListStore();
const batchMoveOutStore = useBatchMoveOutStore();
const waferSelectStore = useWaferSelectStore();
const waferSkipStore = useWaferSkipStore();

const isEqpDownOpen = ref(false);
const dialogOpen = ref(false);
const activeDialog = ref<MoveOutMessage>();
const activeDialogFlow = ref<'message' | 'skip-confirm'>('message');
const hasWaferSkipResultOnEntry = ref(Boolean(waferSkipStore.result));
const shouldFinishAfterDialogs = ref(false);
let skipConfirmResolver: ((confirmed: boolean) => void) | undefined;

const emptyDisplay = {
  lotNo: '',
  batchId: '',
  recipe: '',
  machine: '',
  maskTag: '',
  product: '',
  currentOperation: '',
  nextOperation: '',
  quantity: '',
  goodChips: '',
  commentQty: '',
};

const display = computed(() => store.lot?.display ?? emptyDisplay);
const dialogLines = computed(() => activeDialog.value?.message.split('\n').filter(Boolean) ?? []);
const parsedChamberList = computed<RawChamberInput[]>(() =>
  parseChamberList(store.lot?.chamberList),
);

onMounted(async () => {
  const batchResultLotId = consumeBatchMoveOutResult();
  if (batchResultLotId) {
    finishWithResult(batchResultLotId);
    return;
  }

  const lotId = resolveInitialLotId();
  if (!lotId) return;
  await store.loadLotInfo(lotId);
  applyPendingInputScopeResult();
  showNextDialog();

  if (store.lot?.checkSkipWafer === 'N' && !hasWaferSkipResultOnEntry.value) {
    waferSkipStore.start({
      lotId: store.lot.lotId,
      waferQty: store.lot.checkSkipWaferQty,
      machineQty: store.lot.checkSkipMachineQty,
      reasonList: store.lot.checkSkipReasonList,
    });
    await router.push({ path: `/${ROUTE.waferSkip}` });
  }
});

function resolveInitialLotId(): string {
  const batchLotListResult = batchLotListStore.result;
  if (batchLotListResult?.lotId) {
    batchLotListStore.clearResult();
    return batchLotListResult.lotId;
  }

  return queryString(route, 'lotId');
}

function consumeBatchMoveOutResult(): string {
  const batchMoveOutResult = batchMoveOutStore.result;
  if (!batchMoveOutResult?.ok) return '';

  batchMoveOutStore.clearResult();
  return batchMoveOutResult.lotId || queryString(route, 'lotId');
}

watch(
  () => waferSelectStore.result,
  (result) => {
    if (!result) return;
    store.applyWaferSelectResult(result);
    waferSelectStore.clearResult();
    showNextDialog();
  },
  { immediate: true },
);

watch(
  () => waferSkipStore.result,
  (result) => {
    if (!result) return;
    hasWaferSkipResultOnEntry.value = true;
    void store.updateSkipWaferResult(result).finally(() => {
      waferSkipStore.clearResult();
      showNextDialog();
    });
  },
  { immediate: true },
);

function applyPendingInputScopeResult(): void {
  const result = store.consumePendingInputScopeResult();
  if (!result) return;
  store.applyInputScopeResult(result);
}

function parseChamberList(value: string | undefined): RawChamberInput[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as RawChamberInput[]) : [];
  } catch {
    return [];
  }
}

function showNextDialog(): void {
  if (dialogOpen.value) return;

  const next = store.shiftMessage();
  if (!next) {
    finishAfterDialogsIfNeeded();
    return;
  }

  activeDialog.value = next;
  activeDialogFlow.value = 'message';
  dialogOpen.value = true;
}

function closeDialog(): void {
  dialogOpen.value = false;
  activeDialog.value = undefined;
  activeDialogFlow.value = 'message';
  showNextDialog();
}

function finishAfterDialogsIfNeeded(): void {
  if (!shouldFinishAfterDialogs.value || dialogOpen.value || store.messages.length > 0) return;
  shouldFinishAfterDialogs.value = false;
  finishWithResult(store.lot?.lotId ?? '');
}

function resolveDialogPrimary(): void {
  if (activeDialogFlow.value === 'skip-confirm') {
    skipConfirmResolver?.(true);
    skipConfirmResolver = undefined;
  }
  closeDialog();
}

function resolveDialogCancel(): void {
  if (activeDialogFlow.value === 'skip-confirm') {
    skipConfirmResolver?.(false);
    skipConfirmResolver = undefined;
  } else if (activeDialog.value?.kind === 'confirm') {
    store.okEnabled = false;
  }

  closeDialog();
}

function showSkipConfirm(nextOperation: string): Promise<boolean> {
  activeDialog.value = {
    kind: 'confirm',
    title: '확  인',
    message: `아래와 같이 다음공정을 SKIP하시겠습니까?\n${nextOperation}`,
  };
  activeDialogFlow.value = 'skip-confirm';
  dialogOpen.value = true;

  return new Promise((resolve) => {
    skipConfirmResolver = resolve;
  });
}

function finishWithResult(lotId: string): void {
  const result = { LOTID: lotId, resultCode: 'OK' };
  const androidBridge = (
    window as Window & {
      Android?: { finishWithResult?: (result: string) => void };
    }
  ).Android;

  if (typeof androidBridge?.finishWithResult === 'function') {
    androidBridge.finishWithResult(JSON.stringify(result));
    return;
  }

  window.history.replaceState(
    {
      ...window.history.state,
      moveOutResult: result,
    },
    '',
  );
  router.back();
}

function handleCancel(): void {
  router.back();
}

function handleInputScope(): void {
  if (!store.lot) return;
  void router.push({ path: `/${ROUTE.inputScopeData}`, query: { lotId: store.lot.lotId } });
}

function handleBatchLot(): void {
  if (!store.lot?.batchId) return;
  void router.push({ path: `/${ROUTE.batchLotList}`, query: { batId: store.lot.batchId } });
}

function handlePara(): void {
  if (!store.lot) return;
  void router.push({ path: `/${ROUTE.diffParam}`, query: { lotId: store.lot.lotId } });
}

function handleReadComment(): void {
  if (!store.lot) return;
  void router.push({
    path: '/comment-list',
    query: {
      lotId: store.lot.lotId,
      operation: store.lot.operation,
      subOperation: store.lot.subOperation,
      processStep: store.lot.processStep,
      operSequence: store.lot.operSequence,
    },
  });
}

async function handleWafer(): Promise<void> {
  if (!store.lot) return;

  const slot = await store.prepareWaferSelect();
  if (!slot) {
    showNextDialog();
    return;
  }

  waferSelectStore.start({
    LOTID: store.lot.lotId,
    EXISTWAFERLIST: slot.waferList,
    FIXEDCOUNT: slot.waferList ? String(slot.waferList.split(',').length) : '0',
    CATEGORY: store.lot.createCategory,
    AREA: store.lot.area,
    SELECTWAFERLIST: store.createCategoryComment,
  });
  await router.push({ path: `/${ROUTE.waferSelect}` });
}

async function handleOk(): Promise<void> {
  if (!store.okEnabled || store.isProcessing) return;

  if (store.lot?.bibuhaDown === 'Y') {
    isEqpDownOpen.value = true;
    return;
  }

  await executeOk();
}

async function handleEqpDownResolved(result: MoveOutEqpDownResolveResult): Promise<void> {
  if (result.action === 'OK' && result.success) {
    await executeOk();
  }
}

async function executeOk(): Promise<void> {
  const result = await store.executeOk();
  showNextDialog();

  if (!result || !store.lot) return;

  if (result.branch === 'skip-confirm') {
    const confirmed = await showSkipConfirm(result.nextOperation ?? '');
    if (confirmed) {
      await executeOkAfterSkipConfirmed();
    }
    return;
  }

  if (result.branch === 'batch') {
    await router.push({
      path: `/${ROUTE.batchMoveOut}`,
      query: {
        batchId: store.lot.batchId,
        lotId: store.lot.lotId,
        eqpId: store.lot.display.machine,
        recipe: store.lot.display.recipe,
        comment: store.form.comment,
        transport: store.form.carry ? 'Y' : 'N',
        facility: DeviceInfo.FACILITY,
      },
    });
    return;
  }

  shouldFinishAfterDialogs.value = true;
  finishAfterDialogsIfNeeded();
}

async function executeOkAfterSkipConfirmed(): Promise<void> {
  const result = await store.executeOk({ skipConfirmed: true });
  showNextDialog();

  if (!result || !store.lot) return;

  if (result.branch === 'batch') {
    await router.push({
      path: `/${ROUTE.batchMoveOut}`,
      query: {
        batchId: store.lot.batchId,
        lotId: store.lot.lotId,
        eqpId: store.lot.display.machine,
        recipe: store.lot.display.recipe,
        comment: store.form.comment,
        transport: store.form.carry ? 'Y' : 'N',
        facility: DeviceInfo.FACILITY,
      },
    });
    return;
  }

  shouldFinishAfterDialogs.value = true;
  finishAfterDialogsIfNeeded();
}
</script>

<style scoped>
.move-out-page {
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  color: var(--text-text-primary);
}

.move-out-page :deep(.ds-screen__header) {
  flex: none;
  min-height: 0;
  padding: 4px 16px;
}

.move-out-page :deep(.ds-screen__title) {
  font-size: var(--font-size-16px);
}

.move-out-page :deep(.ds-screen__content) {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  padding: 4px 12px 8px;
}

.move-out-page__fields {
  display: flex;
  min-height: 640px;
  flex-direction: column;
  gap: 8px;
}

.move-out-card {
  box-sizing: border-box;
  display: flex;
  flex: none;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--border-border-primary);
  border-radius: var(--radius-4);
  background: var(--background-background-disabled);
  box-shadow: 0 8px 24px rgb(13 20 31 / 6%);
  /* The design's 8px inset includes its inside border. */
  padding: 7px;
}

.move-out-card :deep(.ds-input) {
  --ds-text-field-height: 32px;
  --ds-input-control-height: 32px;
}

.move-out-card :deep(.ds-dropdown-list) {
  --ds-dropdown-list-height: 32px;
}

.move-out-card :deep(.ds-input.ds-field--horizontal .ds-field__label),
.move-out-card :deep(.ds-dropdown-list .ds-field__label) {
  display: block;
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
  -webkit-line-clamp: unset;
}

.move-out-card--main > .ds-input,
.move-out-lot-grid > .ds-input:first-child,
.move-out-two-column > .ds-input:first-child {
  grid-template-columns: minmax(74px, max-content) minmax(0, 1fr);
  column-gap: 4px;
}

.move-out-lot-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 71px;
  align-items: center;
  gap: 8px;
}

.move-out-lot-grid > .ds-btn {
  grid-column: 1 / -1;
  grid-row: 2;
  width: calc((100% - 8px) / 2);
}

.move-out-lot-grid > .ds-btn:last-child {
  justify-self: end;
}

.move-out-transfer-row,
.move-out-two-column {
  display: grid;
  min-width: 0;
  gap: 8px;
  align-items: center;
}

.move-out-transfer-row {
  grid-template-columns: 70px repeat(2, minmax(0, 1fr));
}

.move-out-transfer-row :deep(.ds-dropdown-list) {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  column-gap: 8px;
}

.move-out-transfer-row :deep(.ds-dropdown-list__control) {
  width: 100%;
  min-width: 0;
}

.move-out-two-column {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.move-out-card--actions {
  align-items: stretch;
}

.move-out-options,
.move-out-comment-actions {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

/* Compact controls match this screen's 32px rows and 16px checkboxes. */
.move-out-card :deep(.ds-btn--small) {
  --ds-btn-height: 32px;
  --ds-btn-font-size: 13px;
  min-height: 0;
}

.move-out-card :deep(.ds-checkbox__control) {
  gap: 8px;
}

.move-out-card :deep(.q-checkbox__inner) {
  width: 16px;
  min-width: 16px;
  height: 16px;
}

.move-out-card :deep(.q-checkbox__bg) {
  inset: 0;
  width: 100%;
  height: 100%;
}

.move-out-card :deep(.ds-checkbox__label) {
  font-size: var(--font-size-13px);
  line-height: var(--line-height-20px);
  white-space: nowrap;
}

.move-out-comment-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
}

.move-out-comment-row > .ds-input {
  flex: 1 1 0;
  width: auto;
  grid-template-columns: max-content minmax(0, 1fr);
  column-gap: 8px;
}

.move-out-comment-row > .ds-btn {
  flex: none;
  min-width: max-content;
}

.move-out-comment-unit {
  font-size: var(--font-size-18px);
  line-height: var(--line-height-28px);
}

.move-out-page :deep(.ds-screen__footer) {
  flex: none;
  padding: 4px 12px;
  background: #e9f6ef;
}

.move-out-page :deep(.ds-screen__footer .ds-btn) {
  --ds-btn-height: 36px;
  min-height: 0;
}

.move-out-page__action {
  min-width: 0;
}

.move-out-card :deep(.ds-input--readonly) {
  --ds-input-focus-border-color: var(--ds-input-control-border);
}

@media (max-height: 731px) {
  .move-out-page__fields {
    min-height: 612px;
  }

  .move-out-options {
    flex-direction: row;
    flex-wrap: wrap;
  }

  /* Enabled QCheckbox inserts a focus span between the box and label. */
  .move-out-options :deep(.ds-checkbox__control) {
    gap: 0;
  }

  .move-out-options :deep(.q-checkbox__label) {
    margin-inline-start: 8px;
    padding: 0;
  }
}
</style>
