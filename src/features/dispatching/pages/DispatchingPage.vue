<template>
  <BaseScreen title="DISPATCHING">
    <section class="ds-screen__card" aria-label="검색">
      <form class="ds-screen__card-row" @submit.prevent="getDispatch">
        <BaseInput
          ref="machineInput"
          v-model="machineName"
          size="small"
          aria-label="Machine"
          autocomplete="off"
          autocapitalize="characters"
          uppercase
          @keydown.enter.prevent="handleMachineEnter"
        >
          <template #suffix>
            <QIcon name="sym_o_search" size="16px" aria-hidden="true" />
          </template>
        </BaseInput>
        <BaseButton variant="secondary" size="small" html-type="submit" :disabled="isLoading"
          >조회</BaseButton
        >
      </form>
      <BaseCheckbox v-model="reserved" label="예약표기" />
    </section>
    <section class="ds-screen__card dispatching__wet-card">
      <BaseInput
        id="dispatching-wet"
        :model-value="wet"
        label="WET 제한순위←"
        size="small"
        type="text"
        inputmode="numeric"
        aria-label="WET 제한순위"
        @update:model-value="setWet"
      />
    </section>
    <section class="ds-screen__card dispatching__grid-card" aria-label="검색 결과">
      <div v-if="isLoading" class="dispatching__status" role="status">
        <BaseLoading size="small" />
      </div>
      <BaseRevoGrid
        v-else-if="rows.length > 0"
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
    <template #footer>
      <BaseButton size="medium" :disabled="isLoading" @click="setDispatch(true)"
        >예약등록</BaseButton
      >
      <BaseButton
        size="medium"
        variant="secondary"
        :disabled="isLoading"
        @click="setDispatch(false)"
        >예약해제</BaseButton
      >
      <BaseButton size="medium" variant="tertiary" :disabled="isLoading" @click="close"
        >닫기</BaseButton
      >
    </template>
    <BaseModal :open="isErrorOpen" title="에  러" :closable="false" :overlay-closable="false">
      <p class="dispatching__error" role="alert">{{ errorMessage }}</p>
      <template #footer
        ><BaseButton size="medium" @click="isErrorOpen = false">확인</BaseButton></template
      >
    </BaseModal>
  </BaseScreen>
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
  BaseScreen,
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
const isErrorOpen = ref(false);
function showError(message: string): void {
  errorMessage.value = message;
  isErrorOpen.value = true;
}
const isPointerRowSelection = ref(false);
const focusedRowKey = ref<number>();
const visibleColumns = computed(() =>
  COLUMNS.filter((column) => !hiddenColumns.value.includes(column.key)),
);
const gridRows = computed(() =>
  rows.value.map((row, index) => ({
    ...row,
    gridId: index,
    rowClass: getRowClass(index),
  })),
);
const gridColumns = computed<BaseRevoGridColumn[]>(() =>
  visibleColumns.value.map((column) => ({
    prop: column.key,
    name: column.label,
    size: column.key === 'NUMBER' || column.key === 'RESERVE' ? 64 : 140,
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
    showError('Machine을 입력해주세요');
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
    showError(normalizeApiError(cause).message);
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
function getRowClass(index: number): string {
  const classes = ['dispatching__row'];
  if (selectedRows.value.has(index)) classes.push('dispatching__row--selected');
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
    showError('장비명이 확인 되지 않습니다.');
    return;
  }
  const items = [...selectedRows.value]
    .map((index) => rows.value[index])
    .filter((row) => row && row.RESERVE === (register ? 'N' : 'Y'));
  if (!items.length) {
    showError('선택된 예약 해제 LOT이 없습니다.');
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
    showError(normalizeApiError(cause).message);
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
/* Figma: "WET 제한순위←" stays on one line; the label column hugs it. */
.dispatching__wet-card > * {
  --ds-field-label-width: max-content;
}
.dispatching__grid-card {
  flex: 1 1 auto;
  min-height: 0;
}
.dispatching__status {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
}
.dispatching__error {
  margin: 0;
}
.dispatching__grid {
  width: 100%;
  height: 100%;
  min-height: 0;
}
.dispatching__grid :deep(.rgCell),
.dispatching__grid :deep(.rgHeaderCell) {
  text-align: center;
}
.dispatching__grid :deep(.dispatching__row--selected .rgCell) {
  background: var(--teal-50, #f0fdfc);
}
</style>
