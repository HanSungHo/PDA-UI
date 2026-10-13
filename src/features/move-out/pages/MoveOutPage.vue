<template>
  <main class="move-out-page">
    <header class="move-out-page__header">
      <h1 class="move-out-page__title">MOVE OUT</h1>
    </header>

    <form class="move-out-page__content" @submit.prevent="handleOk">
      <section class="move-out-card move-out-card--main">
        <div class="move-out-lot-grid">
          <BaseInput label="LOT No." :model-value="display.lotNo" readonly />
          <BaseInput aria-label="BAT ID value" :model-value="display.batchId" readonly />
          <BaseButton
            data-testid="move-out-input-scope"
            variant="secondary"
            :disabled="!store.canInputScope"
            @click="handleInputScope"
          >
            입력 SCOPE
          </BaseButton>
          <BaseButton variant="secondary" :disabled="!store.canOpenBatch" @click="handleBatchLot">
            BAT ID
          </BaseButton>
        </div>

        <BaseInput label="RECIPE" :model-value="display.recipe" readonly />
        <BaseInput label="장비" :model-value="display.machine" readonly />
        <BaseInput label="MASK TAG" :model-value="display.maskTag" readonly />
        <BaseInput v-model="store.form.comment" label="COMMENT" />
        <BaseInput v-model="store.form.maskLogo" label="MASK LOGO" />

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

        <BaseInput label="제품명" :model-value="display.product" readonly />
        <BaseInput label="현재공정" :model-value="display.currentOperation" readonly />
        <BaseInput label="다음공정" :model-value="display.nextOperation" readonly />
        <div class="move-out-two-column">
          <BaseInput label="수량" :model-value="display.quantity" readonly />
          <BaseInput label="Good Chips" :model-value="display.goodChips" readonly />
        </div>
      </section>

      <section class="move-out-card move-out-card--actions">
        <BaseCheckbox v-model="store.form.nextProcessSkip" label="다음공정 SKIP" disabled />
        <BaseCheckbox
          v-model="store.form.wfInterlockCancel"
          label="W/F Interlock해제"
          :disabled="store.wfInterlockDisabled"
        />
        <div class="move-out-comment-row">
          <BaseInput label="Comment" :model-value="display.commentQty" readonly />
          <BaseButton
            data-testid="move-out-read"
            variant="secondary"
            :disabled="!store.canReadComment"
            @click="handleReadComment"
          >
            읽기
          </BaseButton>
        </div>
        <BaseButton block data-testid="move-out-para" variant="tertiary" @click="handlePara">
          계측 PARA
        </BaseButton>
      </section>

      <footer class="move-out-page__footer">
        <BaseButton
          class="move-out-page__action"
          html-type="submit"
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
      </footer>
    </form>

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
  </main>
</template>

<script setup lang="ts">
import BaseButton from 'src/components/base/button/BaseButton.vue';
import BaseCheckbox from 'src/components/base/checkbox/BaseCheckbox.vue';
import BaseDropdownList from 'src/components/base/dropdown-list/BaseDropdownList.vue';
import BaseInput from 'src/components/base/input/BaseInput.vue';
import BaseModal from 'src/components/base/modal/BaseModal.vue';
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
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  flex-direction: column;
  background: linear-gradient(180deg, #1c493a 0%, #96b1a8 53.85%, #ecf8f1 100%);
  color: var(--text-text-primary, #030712);
}

.move-out-page__header,
.move-out-page__content,
.move-out-page__footer {
  box-sizing: border-box;
}

.move-out-page__header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: #f9fafb;
}

.move-out-page__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
}

.move-out-page__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 12px;
}

.move-out-card {
  box-sizing: border-box;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-self: center;
  gap: 8px;
  border: 1px solid var(--border-border-primary, #d1d5dc);
  border-radius: 8px;
  background: var(--background-background-secondary, #f9fafb);
  box-shadow: 0 8px 24px rgb(13 20 31 / 6%);
  padding: 12px;
}

.move-out-card--main {
  min-height: 900px;
}

.move-out-lot-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}

.move-out-transfer-row,
.move-out-two-column,
.move-out-comment-row,
.move-out-page__footer {
  display: grid;
  width: 100%;
  align-self: center;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  align-items: end;
}

.move-out-card--main :deep(.ds-field) {
  gap: 8px;
}

.move-out-card--main :deep(.ds-field__label) {
  color: var(--text-text-primary, #030712);
  font-family: var(--font-family-default, 'Noto Sans KR', sans-serif);
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.move-out-card--main :deep(.ds-input__control),
.move-out-card--main
  :deep(.ant-select-single:not(.ant-select-customize-input) .ant-select-selector) {
  height: 40px;
  min-height: 40px;
  padding: 8px 12px;
  border-color: var(--border-border-primary, #d1d5dc);
  border-radius: 8px;
  background: var(--background-background-primary, #ffffff);
  color: var(--text-text-secondary, #364153);
  font-family: var(--font-family-default, 'Noto Sans KR', sans-serif);
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
}

.move-out-card--main :deep(.ds-input__native) {
  color: inherit;
}

.move-out-card--main :deep(.ds-input--readonly .ds-input__native),
.move-out-card--main :deep(.ds-input--readonly .q-field__label) {
  color: var(--text-text-secondary, #364153);
}

.move-out-page :deep(.ds-input--readonly:focus-within .ds-input__control) {
  border-color: var(--border-border-primary, #d1d5dc);
  box-shadow: none;
}

.move-out-lot-grid :deep(.ds-btn) {
  height: 40px;
  border-radius: 8px;
  font-family: var(--font-family-default, 'Noto Sans KR', sans-serif);
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
}

.move-out-lot-grid :deep(.ds-btn:not(.ds-btn--disabled)) {
  border-color: var(--border-border-brand, #00b3a6);
  color: var(--text-text-brand, #00b3a6);
}

.move-out-two-column {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.move-out-transfer-row {
  grid-template-columns: minmax(0, 1fr) 94px 94px;
}

.move-out-transfer-row :deep(.ds-dropdown-list .ds-field__header) {
  justify-content: center;
}

.move-out-transfer-row :deep(.ds-checkbox__row) {
  min-height: 40px;
  align-items: center;
}

.move-out-transfer-row :deep(.ds-checkbox__label) {
  color: var(--text-text-primary, #030712);
  font-family: var(--font-family-default, 'Noto Sans KR', sans-serif);
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.move-out-comment-row {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.move-out-page__footer {
  margin-top: auto;
}

.move-out-page__action {
  min-width: 0;
}
</style>
