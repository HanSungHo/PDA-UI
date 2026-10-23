<template>
  <main class="dispatching">
    <header class="dispatching__header"><h1>DISPATCHING</h1></header>
    <div class="dispatching__content">
      <section class="dispatching__card dispatching__search-card" aria-label="검색">
        <form class="dispatching__search-row" @submit.prevent="getDispatch">
          <BaseInput
            ref="machineInput"
            v-model="machineName"
            class="dispatching__machine"
            aria-label="Machine"
            placeholder="Search"
            autocomplete="off"
            autocapitalize="characters"
            :disabled="isLoading"
            @update:model-value="toUppercase"
            @keydown.enter.prevent="handleMachineEnter"
          >
            <template #suffix>
              <QIcon
                class="dispatching__search-icon"
                name="sym_o_search"
                size="16px"
                aria-hidden="true"
              />
            </template>
          </BaseInput>
          <BaseButton
            class="dispatching__button dispatching__search-button"
            variant="secondary"
            html-type="submit"
            :disabled="isLoading"
            >조회</BaseButton
          >
        </form>
        <BaseCheckbox
          v-model="reserved"
          class="dispatching__reserved"
          label="예약표기"
          :disabled="isLoading"
        />
      </section>
      <section class="dispatching__card dispatching__wet-card">
        <label class="dispatching__label" for="dispatching-wet">WET 제한순위←</label>
        <BaseInput
          id="dispatching-wet"
          :model-value="wet"
          class="dispatching__wet"
          type="text"
          inputmode="numeric"
          placeholder="Null"
          aria-label="WET 제한순위"
          :disabled="isLoading"
          @update:model-value="setWet"
        />
      </section>
      <section class="dispatching__card dispatching__grid-card" aria-label="검색 결과">
        <div v-if="isLoading" class="dispatching__empty" role="status">
          <BaseLoading size="small" />
        </div>
        <div v-else-if="rows.length === 0" class="dispatching__empty">
          <div class="dispatching__empty-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32" focusable="false">
              <path
                transform="translate(2.666667 2.666667)"
                d="M13.333333 0C5.973333 0 0 5.973333 0 13.333333C0 20.693333 5.973333 26.666666 13.333333 26.666666C20.693333 26.666666 26.666666 20.693333 26.666666 13.333333C26.666666 5.973333 20.693333 0 13.333333 0ZM14.666666 20H12V12H14.666666V20ZM14.666666 9.333333H12V6.666667H14.666666V9.333333Z"
              />
            </svg>
          </div>
          <strong>EMPTY</strong><span>해당 결과가 없습니다</span>
        </div>
        <BaseRevoGrid
          v-else
          class="dispatching__grid"
          :rows="gridRows"
          :columns="gridColumns"
          row-key="gridId"
          :row-size="40"
          :filter="false"
          :resize="false"
          @pointerdown.capture="armPointerRowSelection"
          @keydown.capture="handleGridKeydown"
          @row-select="handleRowFocus"
          @cell-double-click="handleCellDoubleClick"
        />
      </section>
    </div>
    <footer class="dispatching__footer">
      <BaseButton class="dispatching__button" :disabled="isLoading" @click="setDispatch(true)"
        >예약등록</BaseButton
      ><BaseButton
        class="dispatching__button"
        variant="secondary"
        :disabled="isLoading"
        @click="setDispatch(false)"
        >예약해제</BaseButton
      ><BaseButton
        class="dispatching__button dispatching__close-button"
        variant="tertiary"
        :disabled="isLoading"
        @click="close"
        >닫기</BaseButton
      >
    </footer>
    <BaseModal
      :open="Boolean(errorMessage)"
      title="에  러"
      :closable="false"
      :overlay-closable="false"
      ><p class="dispatching__error" role="alert">{{ errorMessage }}</p>
      <template #footer
        ><BaseButton class="dispatching__button" @click="errorMessage = ''"
          >확인</BaseButton
        ></template
      ></BaseModal
    >
  </main>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  BaseButton,
  BaseCheckbox,
  BaseInput,
  BaseLoading,
  BaseModal,
  BaseRevoGrid,
} from '../../../components/base';
import type { BaseRevoGridColumn, BaseRevoGridKey } from '../../../components/base/revo-grid';
import { normalizeApiError } from '../../../services/api-error';
import { barcodeStyleEqpId } from '../../../utils/barcode-style';
import { useMainStore } from '../../main/stores/main.store';
import {
  getDispatch as fetchDispatch,
  setDispatch as saveDispatch,
} from '../services/dispatching.service';
import { useDispatchingStore } from '../stores/dispatching.store';
import type { DispatchingRow } from '../types/dispatching.types';

const COLUMNS = [
  { key: 'NUMBER', label: 'NUM' },
  { key: 'RESERVE', label: 'R' },
  { key: 'JOBCODE', label: 'JOB' },
  { key: 'LOTNAME', label: 'LOT' },
  { key: 'OPREATIONNAME', label: '공정번호' },
  { key: 'OPREATIONDESC', label: '공정명' },
  { key: 'QTY', label: 'QTY' },
  { key: 'DOPANT', label: 'GAS' },
  { key: 'RECIPE', label: 'RECIPE' },
  { key: 'BOXSTATUS', label: 'BOXSTATUS' },
  { key: 'TRANSPORTLOCATION', label: '반송위치' },
  { key: 'HOLDCODE', label: 'H-CODE' },
  { key: 'HOLDCOMMENT', label: 'HOLD COMMENTS' },
  { key: 'QTIME', label: 'QT' },
  { key: 'LOTCLASS', label: 'LOTCLASS' },
  { key: 'SDD', label: 'SDD' },
  { key: 'PRODUCTSPECNAME', label: '제품명' },
  { key: 'CUSTOMERNAME', label: '고객명' },
  { key: 'PROCESSINTIME', label: '공정 도착시각' },
  { key: 'REWORKSTATUS', label: 'RW' },
  { key: 'MAVEINMACHINE1', label: 'MOVEIN장비' },
  { key: 'RETILCEKEY', label: 'RETICLE KEY' },
  { key: 'MASKLOCATION', label: 'MASK 위치' },
  { key: 'PRNAME', label: 'PRNAME' },
  { key: 'BATCHID', label: 'BATCHID' },
  { key: 'SUBSTN_REPLY', label: '가능 HEAD' },
  { key: 'RUNINGMODE', label: '진행 MODE' },
  { key: 'LOTPROCESSSTATE', label: 'LOT 상태' },
  { key: 'STARTPOTIME', label: '시작 가능 시간' },
  { key: 'BATCHLOT', label: 'BATCHLOT' },
  { key: 'NEXTMACHINE', label: '다음 진행장비' },
  { key: 'OPTIMALSTARTTIME', label: '최적 START 시간' },
  { key: 'PSTARTTIME', label: '예상 시작 시각' },
  { key: 'MAINTITEM', label: 'MAINTITEM' },
] as const;
const router = useRouter();
const mainStore = useMainStore();
const dispatchingStore = useDispatchingStore();
const machineInput = ref<{ focus: () => void } | null>(null);
const machineName = ref('');
const wet = ref('');
const reserved = ref(false);
const rows = ref<DispatchingRow[]>([]);
const hiddenColumns = ref<string[]>(['MAINTITEM']);
const selectedRows = ref(new Set<number>());
const isLoading = ref(false);
const errorMessage = ref('');
const isPointerRowSelection = ref(false);
const focusedRowKey = ref<number>();
const visibleColumns = computed(() =>
  COLUMNS.filter((column) => !hiddenColumns.value.includes(column.key)),
);
const gridRows = computed(() =>
  rows.value.map((row, index) => ({
    ...row,
    gridId: index,
    rowClass: getRowClass(row, index),
  })),
);
const gridColumns = computed<BaseRevoGridColumn[]>(() =>
  visibleColumns.value.map((column) => ({
    prop: column.key,
    name: column.label,
    size: column.key === 'NUMBER' || column.key === 'RESERVE' ? 52 : 140,
  })),
);
onMounted(() => {
  void nextTick(() => machineInput.value?.focus());
});
const restoredState = dispatchingStore.state;
if (restoredState) {
  machineName.value = restoredState.machineName;
  wet.value = restoredState.wet;
  reserved.value = restoredState.reserved;
  rows.value = [...restoredState.rows];
  hiddenColumns.value = [...restoredState.hiddenColumns];
  selectedRows.value = new Set(restoredState.selectedRowIndexes);
}
watch(
  [machineName, wet, reserved, rows, hiddenColumns, selectedRows],
  () => {
    dispatchingStore.save({
      machineName: machineName.value,
      wet: wet.value,
      reserved: reserved.value,
      rows: rows.value,
      hiddenColumns: hiddenColumns.value,
      selectedRowIndexes: [...selectedRows.value],
    });
  },
  { deep: true },
);
function toUppercase(value: string | number | undefined): void {
  machineName.value = String(value ?? '').toUpperCase();
}
function setWet(value: string | number | undefined): void {
  wet.value = String(value ?? '').replace(/\D/g, '');
}
async function handleMachineEnter(): Promise<void> {
  const parsed = barcodeStyleEqpId(machineName.value);
  machineName.value = parsed.parsedId;
  if (parsed.isValid) await getDispatch();
}
async function getDispatch(): Promise<void> {
  selectedRows.value = new Set();
  rows.value = [];
  if (!machineName.value) {
    errorMessage.value = 'Machine을 입력해주세요';
    return;
  }
  setWet(wet.value);
  isLoading.value = true;
  try {
    const result = await fetchDispatch({
      reserve: reserved.value ? 'T' : 'F',
      machineName: machineName.value,
      wet: wet.value,
    });
    rows.value = result.rows;
    hiddenColumns.value = [...new Set(['MAINTITEM', ...result.hiddenColumns])];
  } catch (cause) {
    errorMessage.value = normalizeApiError(cause).message;
  } finally {
    isLoading.value = false;
  }
}
function toggleRow(index: number): void {
  const next = new Set(selectedRows.value);
  if (next.has(index)) next.delete(index);
  else next.add(index);
  selectedRows.value = next;
}
function armPointerRowSelection(event: PointerEvent): void {
  const isGridCell = event
    .composedPath()
    .some((target) => target instanceof HTMLElement && target.classList.contains('rgCell'));
  if (!isGridCell) return;

  isPointerRowSelection.value = true;
  window.setTimeout(() => {
    isPointerRowSelection.value = false;
  });
}
function getRowClass(row: DispatchingRow, index: number): string {
  const classes = ['dispatching__row'];
  if (selectedRows.value.has(index)) classes.push('dispatching__row--selected');
  if (row.MAINTITEM === '긴급') classes.push('dispatching__row--urgent');
  if (row.MAINTITEM === '매출') classes.push('dispatching__row--sales');
  return classes.join(' ');
}
function handleRowFocus(rowKey: BaseRevoGridKey): void {
  if (typeof rowKey !== 'number') return;
  focusedRowKey.value = rowKey;
  if (isPointerRowSelection.value) {
    isPointerRowSelection.value = false;
    toggleRow(rowKey);
  }
}
function handleGridKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (focusedRowKey.value === undefined) return;
  event.preventDefault();
  toggleRow(focusedRowKey.value);
}
function handleCellDoubleClick(detail: {
  rowKey: BaseRevoGridKey;
  row: Record<string, unknown>;
  prop?: string;
}): void {
  const lotName = detail.row.LOTNAME;
  if (detail.prop === 'LOTNAME' && typeof lotName === 'string') openESheet(lotName);
}
async function setDispatch(register: boolean): Promise<void> {
  if (!selectedRows.value.size) return;
  if (!machineName.value) {
    errorMessage.value = '장비명이 확인 되지 않습니다.';
    return;
  }
  const items = [...selectedRows.value]
    .map((index) => rows.value[index])
    .filter((row) => row && row.RESERVE === (register ? 'N' : 'Y'));
  if (!items.length) {
    errorMessage.value = '선택된 예약 해제 LOT이 없습니다.';
    return;
  }
  isLoading.value = true;
  try {
    await saveDispatch({
      machineName: machineName.value,
      operatorId: mainStore.operatorId,
      operatorName: mainStore.operatorName,
      reserve: register ? 'Y' : 'N',
      items,
    });
    await getDispatch();
  } catch (cause) {
    errorMessage.value = normalizeApiError(cause).message;
  } finally {
    isLoading.value = false;
  }
}
function openESheet(lotName: string): void {
  if (lotName) void router.push({ path: '/esheet', query: { lotId: lotName } });
}
function close(): void {
  dispatchingStore.clear();
  router.back();
}
</script>

<style scoped>
.dispatching {
  --dispatching-accent: #02b0a5;
  --dispatching-surface: #f2f4f6;
  --dispatching-border: #d1d5dc;
  --dispatching-text: #030712;
  --dispatching-muted: #364152;
  --dispatching-white: #fff;
  --dispatching-space: 12px;
  --dispatching-radius: 4px;
  --dispatching-card-height: 92px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  background: linear-gradient(180deg, #1c493a 0%, #96b1a8 53.85%, #ecf8f1 100%);
  color: var(--dispatching-text);
  font-family: var(--family-font-family-default, var(--font-family-default));
}
.dispatching__header {
  display: flex;
  flex: 0 0 60px;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: #f9fafb;
}
.dispatching__header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
}
.dispatching__content {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  gap: 16px;
  padding: var(--dispatching-space);
}
.dispatching__card {
  box-sizing: border-box;
  border: 1px solid var(--dispatching-border);
  border-radius: var(--dispatching-radius);
  background: var(--dispatching-surface);
  box-shadow: 0 8px 24px rgb(13 20 31 / 6%);
  padding: var(--dispatching-space);
}
.dispatching__search-card,
.dispatching__wet-card {
  flex: none;
  height: var(--dispatching-card-height);
}
.dispatching__search-card {
  display: grid;
  grid-template-rows: 40px 20px;
  gap: 8px;
}
.dispatching__search-row {
  display: flex;
  gap: 8px;
}
.dispatching__machine,
.dispatching__wet {
  flex: 1 1 auto;
  min-width: 0;
}
.dispatching__search-icon {
  color: var(--dispatching-text);
}
.dispatching__reserved :deep(.q-checkbox__inner) {
  margin-inline-start: calc(-1 * var(--ds-spacing-2));
}
.dispatching__label {
  display: block;
  margin-block-end: 8px;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}
.dispatching__button {
  --ds-btn-accent: var(--dispatching-accent);
  --ds-btn-height: 44px;
  --ds-btn-radius: var(--dispatching-radius);
  --ds-btn-font-size: 16px;
  --ds-btn-line-height: 28px;
  flex: 1 1 0;
}
.dispatching__search-button {
  --ds-btn-height: 40px;
  --ds-btn-font-size: 14px;
  --ds-btn-line-height: 20px;
  flex: 0 0 50px;
}
.dispatching__grid-card {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
}
.dispatching__empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: var(--dispatching-muted);
}
.dispatching__empty strong {
  color: var(--dispatching-text);
  font-size: 18px;
  line-height: 28px;
}
.dispatching__empty > span {
  font-size: 16px;
  line-height: 24px;
}
.dispatching__empty-icon {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 8px;
  background: var(--dispatching-surface);
}
.dispatching__empty-icon svg {
  width: 32px;
  height: 32px;
  fill: currentcolor;
}
.dispatching__grid {
  --base-revo-grid-border-color: var(--dispatching-border);
  --base-revo-grid-scroll-color: var(--dispatching-accent);
  font-family: var(--family-font-family-default, var(--font-family-default));
  flex: 1 1 auto;
  align-self: stretch;
  width: 100%;
  height: auto;
  min-height: 0;
}
.dispatching__grid :deep(.rgCell),
.dispatching__grid :deep(.rgHeaderCell) {
  text-align: center;
}
.dispatching__grid :deep(.rgHeaderCell) {
  background: #e9edef;
}
.dispatching__grid :deep(.dispatching__row--urgent .rgCell) {
  background: #f29661;
}
.dispatching__grid :deep(.dispatching__row--sales .rgCell) {
  background: #86e57f;
}
.dispatching__grid :deep(.dispatching__row--selected .rgCell) {
  background: #d8f3f0;
}
.dispatching__footer {
  display: flex;
  flex: none;
  gap: 8px;
  padding: var(--dispatching-space);
}
.dispatching__close-button {
  --ds-btn-bg: var(--dispatching-white);
  --ds-btn-border-color: var(--dispatching-border);
  --ds-btn-fg: var(--dispatching-text);
}
.dispatching__error {
  margin: 0;
}
</style>
