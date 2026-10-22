<template>
  <BaseScreen class="batch" title="BATCH" :aria-busy="busy">
    <section :inert="busy" class="batch__body" aria-label="BATCH">
      <div class="ds-screen__card">
        <div class="batch__mode-row">
          <BaseRadioGroup
            :model-value="radioType"
            :options="batchTypeOptions"
            layout="horizontal"
            name="batch-type"
            aria-label="Batch type"
            @update:model-value="checkedRadioButton"
          />
          <BaseDropdownList
            v-model="monitorWaferCount"
            :options="monitorCountOptions"
            :disabled="monitorWaferCountDisabled"
            aria-label="Monitor wafer count"
          />
          <BaseCheckbox v-model="checkBoxChildBatch" label="子" aria-label="Child batch" />
        </div>
        <BaseInput
          ref="machineInputRef"
          :model-value="editMachine"
          @update:model-value="editMachine = String($event ?? '').toUpperCase()"
          data-testid="batch-machine-input"
          label="장비"
          @keydown.enter.prevent="perform(scanMachine)"
        />
      </div>

      <div class="ds-screen__card">
        <div class="batch__two-col">
          <BaseInput :model-value="txtBatId" data-testid="batch-id-input" label="ID" readonly />
          <BaseInput :model-value="txtProductName" aria-label="Product" readonly />
        </div>
        <div class="batch__two-col">
          <BaseInput
            ref="lotInputRef"
            :model-value="editLotNo"
            data-testid="batch-lot-input"
            label="LOT"
            @update:model-value="editLotNo = String($event ?? '').toUpperCase()"
            @keydown.enter.prevent="perform(scanLot)"
          />
          <BaseInput :model-value="txtStep" aria-label="Process step" readonly />
        </div>
      </div>

      <div class="ds-screen__card">
        <div class="batch__child-row">
          <BaseCheckbox
            :model-value="checkBoxChild"
            label="子"
            aria-label="Child"
            :disabled="childCheckDisabled"
            @update:model-value="(checked) => perform(() => onChildCheck(checked))"
          />
          <BaseDropdownList
            v-model="selectedParentBatchId"
            :options="parentBatchOptions"
            aria-label="Parent batch id"
            :disabled="parentBatchDisabled"
            @change="perform(onParentBatchChange)"
          />
          <BaseDropdownList
            v-model="selectedChildZone"
            :options="childZones"
            aria-label="Child zone"
            :disabled="childZoneDisabled"
          />
          <BaseButton
            variant="secondary"
            icon-only
            v-bind="{ ariaLabel: 'Delete selected row' }"
            :disabled="!rowDeleteEnabled"
            @click="singleClick('row-delete', () => batchStore.btnDeleteBatch())"
          >
            <DeleteOutlined aria-hidden="true" />
          </BaseButton>
        </div>
        <div class="batch__search-row">
          <BaseInput
            :model-value="txtCount"
            data-testid="batch-count-input"
            aria-label="Count"
            readonly
          />
          <BaseButton
            data-testid="batch-search-button"
            variant="secondary"
            @click="singleClick('lot-search', getLotInfo)"
            >조회</BaseButton
          >
          <BaseButton
            data-testid="batch-child-search"
            variant="secondary"
            :disabled="!relatedBatchEnabled"
            @click="singleClick('related', openRelatedBatch)"
            >{{ relatedBatchLabel }}</BaseButton
          >
          <BaseButton
            data-testid="batch-initialize"
            variant="secondary"
            @click="singleClick('initialize', () => batchStore.btnInitialize())"
            >취소</BaseButton
          >
        </div>
      </div>

      <div class="ds-screen__card batch__grid-panel">
        <BaseRevoGrid
          class="batch__grid"
          :rows="gridRows"
          :columns="columns"
          row-key="gridRowKey"
          :selected-row-key="
            selectedGridRowIndex === undefined ? undefined : String(selectedGridRowIndex)
          "
          :readonly="true"
          :resize="false"
          :row-size="38"
          aria-label="BATCH LOT LIST"
          @row-select="selectBatchRow"
          @cell-activate="activateBatchCell"
        />
        <div v-if="busy && !dialog.open" class="batch__loading" aria-label="Loading" role="status">
          <BaseLoading />
        </div>
      </div>
    </section>

    <template #footer>
      <div :inert="busy" class="batch__footer">
        <BaseButton
          data-testid="batch-footer-action"
          size="large"
          @click="singleClick('submit', btnBatchInput)"
          >{{ footerActionText }}</BaseButton
        >
        <BaseButton
          data-testid="batch-delete-button"
          variant="secondary"
          size="large"
          :disabled="!btnDeleteBatchEnabled"
          @click="singleClick('delete', deleteBatch)"
          >삭제</BaseButton
        >
        <BaseButton
          class="batch__count-button"
          variant="secondary"
          size="large"
          @click="singleClick('count', getBatchCount)"
          >B/C조회</BaseButton
        >
        <BaseButton
          data-testid="batch-cancel"
          variant="tertiary"
          size="large"
          @click="singleClick('cancel', closeBatchScreen)"
          >취소</BaseButton
        >
      </div>
    </template>

    <BaseModal
      :open="dialog.open"
      :title="dialog.title"
      :closable="false"
      :overlay-closable="false"
      :width="320"
    >
      <p class="batch__dialog-message">{{ dialog.message }}</p>
      <template #footer>
        <BaseButton
          v-if="dialog.mode === 'confirm'"
          variant="tertiary"
          @click="resolveDialog(false)"
          >아니오</BaseButton
        >
        <BaseButton variant="primary" @click="resolveDialog(true)">{{
          dialog.mode === 'confirm' ? '예' : '확인'
        }}</BaseButton>
      </template>
    </BaseModal>
  </BaseScreen>
</template>

<script setup lang="ts">
import { DeleteOutlined } from '@ant-design/icons-vue';
import { storeToRefs } from 'pinia';
import { BaseButton } from 'src/components/base/button';
import { BaseCheckbox } from 'src/components/base/checkbox';
import { BaseDropdownList } from 'src/components/base/dropdown-list';
import { BaseInput } from 'src/components/base/input';
import { BaseLoading } from 'src/components/base/loading';
import { BaseModal } from 'src/components/base/modal';
import { BaseRadioGroup } from 'src/components/base/radio';
import {
  BaseRevoGrid,
  type BaseRevoGridColumn,
  type BaseRevoGridKey,
} from 'src/components/base/revo-grid';
import { BaseScreen } from 'src/components/base/screen';
import { COMMON_FIELD as TEXT } from 'src/constants/common-strings';
import { ROUTE } from 'src/constants/routes';
import { normalizeApiError } from 'src/services/api-error';
import { barcodeStyleEqpId } from 'src/utils/barcode-style';
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';

import { useBatchsubStore } from '../../batchsub/stores/batchsub.store';
import { useBatchStore } from '../stores/batch.store';

type DialogMode = 'alert' | 'confirm';
const router = useRouter();
const batchStore = useBatchStore();
const batchsubStore = useBatchsubStore();
// Result or a pending Batchsub navigation identifies a suspended Android activity.
// System Back has no result; it must still preserve the parent's form.
if (!batchsubStore.result && !batchStore.awaitingBatchsub) batchStore.initializeBatchForm();
batchStore.awaitingBatchsub = false;
const busy = ref(false);
let navigationAllowed = false;
onBeforeRouteLeave(() => !busy.value || navigationAllowed);
let requestedFocus: 'lot' | 'machine' | undefined;
const {
  batchItemList,
  btnDeleteBatchEnabled,
  rowDeleteEnabled,
  checkBoxChild,
  checkBoxChildBatch,
  childCheckDisabled,
  parentBatchDisabled,
  childZoneDisabled,
  editLotNo,
  editMachine,
  footerActionText,
  monitorWaferCount,
  monitorWaferCountDisabled,
  parentBatchIds,
  radioType,
  selectedChildZone,
  selectedParentBatchId,
  selectedGridRowIndex,
  txtBatId,
  txtProductName,
  txtStep,
  txtCount,
  zoneColumnVisible,
  relatedBatchEnabled,
  relatedBatchLabel,
} = storeToRefs(batchStore);
const batchTypeOptions = [
  { label: 'RUN', value: 'RUN' },
  { label: 'M', value: 'M' },
];
const monitorCountOptions = [
  { label: '', value: '', disabled: true },
  ...['1', '2', '3', '4', '5', '6'].map((value) => ({ label: value, value })),
];
const childZones = [
  { label: '', value: '', disabled: true },
  ...['P01', 'P02', 'P03', 'P04', 'P05', 'P06'].map((value) => ({ label: value, value })),
];
const parentBatchOptions = computed(() => [
  { label: '', value: '', disabled: true },
  ...parentBatchIds.value.map(({ BATCHID }) => ({ label: BATCHID, value: BATCHID })),
]);
const machineInputRef = ref<InstanceType<typeof BaseInput>>();
const lotInputRef = ref<InstanceType<typeof BaseInput>>();
// Display keys remain unique even when the source preserves duplicate NUM after filtering.
const gridRows = computed(() =>
  batchItemList.value.map((row, index) => ({ ...row, gridRowKey: String(index) })),
);
const columns = computed<BaseRevoGridColumn[]>(() => [
  ...(zoneColumnVisible.value ? [{ prop: 'ISDCOL', name: 'Z', size: 60 }] : []),
  {
    prop: 'LOTID',
    name: 'Lot No',
    size: 175,
    cellTemplate: (h, { model }) =>
      h('span', { class: { 'batch__status-run': model.STATUS === 'RUN' } }, model.LOTID ?? ''),
  },
  { prop: 'QUANTITY', name: '수량', size: 65 },
  { prop: 'RECIPE', name: 'RECIPE', size: 222 },
  { prop: 'THIN', name: 'TH(UV)', size: 110 },
  { prop: 'PTIN', name: 'PT', size: 80 },
]);
function checkedRadioButton(value: string | number): void {
  if (busy.value) return;
  if (value === 'RUN' || value === 'M') batchStore.checkedRadioButton(value);
}
async function perform(action: () => void | Promise<void>): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  try {
    await action();
  } finally {
    busy.value = false;
    await flushFocus();
  }
}
function selectBatchRow(key: BaseRevoGridKey): void {
  if (!busy.value) batchStore.selectBatchLot(key);
}
const lastClicks = new Map<string, number>();
function singleClick(key: string, action: () => void | Promise<void>): void {
  if (busy.value) return;
  const now = Date.now();
  const last = lastClicks.get(key);
  if (last !== undefined && now - last <= 1000) return;
  lastClicks.set(key, now);
  void perform(action);
}
function activateBatchCell(detail: { rowKey: BaseRevoGridKey; prop?: string }): void {
  if (detail.prop)
    singleClick(`cell:${detail.rowKey}:${detail.prop}`, () =>
      batchStore.toggleBatchCell(detail.rowKey, detail.prop!),
    );
}
const dialog = reactive<{
  open: boolean;
  title: string;
  message: string;
  mode: DialogMode;
  resolve?: (value: boolean) => void;
}>({ open: false, title: '', message: '', mode: 'alert' });
function openDialog(
  message: string,
  title: string = TEXT.TXTDIALOGTITLE_OK,
  mode: DialogMode = 'alert',
): Promise<boolean> {
  dialog.open = true;
  dialog.title = title;
  dialog.message = message;
  dialog.mode = mode;
  return new Promise((resolve) => {
    dialog.resolve = resolve;
  });
}
function resolveDialog(value: boolean): void {
  dialog.open = false;
  dialog.resolve?.(value);
  dialog.resolve = undefined;
}
async function alert(message: string, title: string): Promise<void> {
  await openDialog(message, title);
}
async function confirm(
  message: string,
  title: string = TEXT.TXTDIALOGTITLE_INFORM,
): Promise<boolean> {
  return openDialog(message, title, 'confirm');
}
const hooks = { alert, confirm };
async function flushFocus(): Promise<void> {
  if (busy.value || !requestedFocus) return;
  await nextTick();
  const target = requestedFocus;
  requestedFocus = undefined;
  if (target === 'machine') machineInputRef.value?.focus();
  else lotInputRef.value?.focus();
}
async function focusMachineInput(): Promise<void> {
  requestedFocus = 'machine';
  await flushFocus();
}
async function focusLotInput(): Promise<void> {
  requestedFocus = 'lot';
  await flushFocus();
}
async function showResult(result: {
  ok: boolean;
  message?: string;
  title?: string;
  focus?: 'lot' | 'machine';
}): Promise<void> {
  if (result.message) await openDialog(result.message, result.title);
  if (result.focus === 'lot') await focusLotInput();
  else if (result.focus === 'machine') await focusMachineInput();
}
async function showError(cause: unknown): Promise<void> {
  await openDialog(normalizeApiError(cause).message, TEXT.TXTDIALOGTITLE_ERROR);
}
async function scanMachine(): Promise<void> {
  const { isValid, parsedId } = barcodeStyleEqpId(editMachine.value);
  editMachine.value = parsedId;
  if (!isValid) return;
  await getMachineInfo();
}
async function scanLot(): Promise<void> {
  const value = editLotNo.value;
  if (!value.startsWith(' ')) {
    editLotNo.value = '';
    await openDialog('LOT#를 읽어주세요.', 'READING ERROR');
    return;
  }
  let parsed = value.slice(1);
  if (parsed.startsWith('$')) parsed = value.replace('$', '').trimStart();
  editLotNo.value = parsed ? parsed.slice(0, -1) : '';
  if (editLotNo.value) await getLotInfo();
}
async function getMachineInfo(): Promise<void> {
  try {
    await showResult(await batchStore.getMachineInfo());
  } catch (cause) {
    await showError(cause);
    await focusMachineInput();
  }
}
async function getLotInfo(): Promise<void> {
  try {
    await showResult(await batchStore.getLotInfo(hooks));
  } catch (cause) {
    await showError(cause);
    await focusLotInput();
  }
}
async function onChildCheck(checked: boolean): Promise<void> {
  checkBoxChild.value = checked;
  await nextTick();
  try {
    await showResult(await batchStore.checkBoxChildChanged(checked));
  } catch (cause) {
    await showError(cause);
  }
}
async function onParentBatchChange(): Promise<void> {
  try {
    await batchStore.parentBatchChanged(selectedParentBatchId.value);
  } catch (cause) {
    await showError(cause);
  }
}
function closeBatchScreen(): void {
  navigationAllowed = true;
  router.back();
}
async function btnBatchInput(): Promise<void> {
  try {
    const result = await batchStore.btnBatchInput(hooks);
    await showResult(result);
    if (result.ok) closeBatchScreen();
  } catch (cause) {
    await showError(cause);
  }
}
async function deleteBatch(): Promise<void> {
  try {
    const result = await batchStore.deleteBatch(hooks);
    await showResult(result);
    if (result.ok) closeBatchScreen();
  } catch (cause) {
    await showError(cause);
  }
}
async function getBatchCount(): Promise<void> {
  try {
    await showResult(await batchStore.getBatchCount());
  } catch (cause) {
    await showError(cause);
  }
}
async function openRelatedBatch(): Promise<void> {
  try {
    const result = await batchStore.searchRelatedBatch(hooks);
    await showResult(result);
    if (result.openBatchsub) {
      batchStore.awaitingBatchsub = true;
      navigationAllowed = true;
      await router.push({ name: ROUTE.batchsub, query: { MOBATCHID: result.openBatchsub } });
    }
  } catch (cause) {
    navigationAllowed = false;
    batchStore.awaitingBatchsub = false;
    await showError(cause);
    await focusLotInput();
  }
}
async function applyBatchsubResult(): Promise<void> {
  const result = batchsubStore.result;
  if (!result) return;
  // Consume before awaiting dialogs/API, so a remount cannot execute the same result twice.
  batchsubStore.clearResult();
  try {
    await showResult(await batchStore.applyBatchsubResult(result, hooks));
  } catch (cause) {
    await showError(cause);
    await focusLotInput();
  }
}
watch(
  () => batchsubStore.result,
  () => {
    void perform(applyBatchsubResult);
  },
  { immediate: true },
);
onMounted(() => {
  void focusMachineInput();
});
</script>

<style scoped>
.batch {
  width: 100%;
}

.batch :deep(.ds-screen__content) {
  flex: 1 1 auto;
  min-width: 0;
}

.batch :deep(.ds-screen__header) {
  flex: 0 0 60px;
  height: 60px;
}

.batch :deep(.ds-screen__title) {
  text-align: center;
}

.batch__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--spacing-space-3, 16px);
  min-width: 0;
}

.batch__mode-row,
.batch__two-col,
.batch__child-row,
.batch__search-row,
.batch__footer {
  display: grid;
  align-items: center;
  gap: var(--spacing-space-1, 8px);
  width: 100%;
  min-width: 0;
}

.batch__mode-row {
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.batch__two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: end;
}

.batch__child-row {
  grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr) auto;
}

.batch__search-row {
  grid-template-columns: minmax(0, 1fr) repeat(3, auto);
}

.batch__grid-panel {
  position: relative;
  flex: 1 1 auto;
  overflow: visible;
}

.batch__grid {
  height: 320px;
  min-width: 0;
}

.batch__grid :deep(revo-grid) {
  height: 100%;
  background: var(--background-background-primary, #fff);
}

.batch__grid :deep(.rgHeaderCell),
.batch__grid :deep(.rgCell) {
  text-align: center;
}

.batch__grid :deep(.rgHeaderCell) {
  background: var(--background-background-brand, #02b0a5);
  color: var(--text-text-white, #f9fafb);
}

.batch__grid :deep(.base-revo-grid__row--selected .rgCell) {
  background: var(--background-background-brand-opacity-20, #eefbf8);
}

.batch__grid :deep(.batch__status-run) {
  color: var(--text-text-success, #00a84f);
  font-weight: var(--weight-font-bold, 700);
}

.batch__footer {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.batch__count-button {
  --ds-btn-padding-x: 0;
}

.batch__loading {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 20%);
}

.batch__dialog-message {
  margin: 0;
  white-space: pre-line;
}
</style>
