<template>
  <BaseScreen class="lot-status-by-bay" title="BAY별 LOT 현황">
    <section class="ds-screen__card" aria-label="조회 조건">
      <div class="ds-screen__card-row">
        <BaseDropdownList
          class="lot-status-by-bay__field"
          label="BAY"
          :model-value="spinnerBaySelectedItem ?? undefined"
          :options="toOptions(spinnerBayItems)"
          :disabled="loading"
          @update:model-value="onBaySelected(String($event ?? ''))"
        />
        <BaseDropdownList
          class="lot-status-by-bay__field"
          label="STK"
          :model-value="spinnerStkSelectedItem ?? undefined"
          :options="toOptions(spinnerSTKItems)"
          :disabled="loading"
          @update:model-value="spinnerStkSelectedItem = String($event ?? '')"
        />
      </div>
      <div class="ds-screen__card-row">
        <BaseInput
          ref="jobInput"
          v-model="editJob"
          class="lot-status-by-bay__field"
          layout="horizontal"
          label="JOB"
          autocomplete="off"
          uppercase
          :disabled="loading"
          @keydown.enter.prevent="onSearchLot"
        >
          <template #suffix><QIcon name="sym_o_search" size="16px" aria-hidden="true" /></template>
        </BaseInput>
        <!-- btn_search_lot is an icon-only button in Android; the caption follows the design. -->
        <BaseButton size="small" variant="secondary" :disabled="loading" @click="onSearchLot"
          >조회</BaseButton
        >
      </div>
    </section>

    <section
      class="ds-screen__card lot-status-by-bay__list"
      aria-label="LOT 목록"
      :aria-busy="loading"
    >
      <div class="lot-status-by-bay__list-body">
        <BaseRevoGrid
          v-if="gridRows.length"
          :rows="gridRows"
          :columns="columnData"
          :auto-size-column="wrapContent"
          row-key="gridIndex"
          :row-size="40"
          :resize="false"
          :filter="false"
          :readonly="true"
          accessible-label="LOT 목록"
          @cell-click="onSingleTapUp(Number($event.rowKey))"
          @row-select="focusedRowIndex = Number($event)"
          @keydown="onGridKeydown"
        />
        <BaseEmptyState v-else icon-variant="filled" />
      </div>
    </section>

    <section class="ds-screen__card" aria-label="출고">
      <BaseRadioGroup
        class="lot-status-by-bay__port"
        aria-label="출고 PORT"
        name="lot-status-by-bay-port"
        layout="horizontal"
        :model-value="checkedPort"
        :options="portOptions"
        :disabled="!radioPortEnabled || loading"
        @update:model-value="checkedPort = $event === '2OUT' ? '2OUT' : 'OUT'"
      />
      <div class="ds-screen__actions">
        <BaseButton
          variant="tertiary"
          size="medium"
          :disabled="!btnStockerOutEnabled || loading"
          @click="executeSTKout"
          >출고</BaseButton
        >
        <BaseButton variant="tertiary" size="medium" :disabled="loading" @click="selectedCancel"
          >선택취소</BaseButton
        >
      </div>
    </section>

    <OkDialog
      :open="dialog !== null"
      :title="dialog?.title ?? ''"
      :message="dialog?.message ?? ''"
      @update:open="onDialogOpenChange"
    />
    <template #footer>
      <BaseButton size="medium" :disabled="!btnEsheetEnabled || loading" @click="executeEsheet"
        >eSheet</BaseButton
      >
      <BaseButton
        variant="secondary"
        size="medium"
        :disabled="!btnCarryEnabled || loading"
        @click="executeCarry"
        >반송</BaseButton
      >
      <BaseButton variant="tertiary" size="medium" @click="finish">닫기</BaseButton>
    </template>
  </BaseScreen>
</template>

<script setup lang="ts">
import { type AutoSizeColumnConfig, ColumnAutoSizeMode } from '@revolist/revogrid';
import { QIcon } from 'quasar';
import {
  BaseButton,
  BaseDropdownList,
  BaseEmptyState,
  BaseInput,
  type BaseOption,
  BaseRadioGroup,
  BaseRevoGrid,
  BaseScreen,
} from 'src/components/base';
import type { BaseRevoGridColumn } from 'src/components/base/revo-grid';
import OkDialog from 'src/components/OkDialog.vue';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { useLotStatusByBay } from '../composables/useLotStatusByBay';

const {
  spinnerBayItems,
  spinnerBaySelectedItem,
  spinnerSTKItems,
  spinnerStkSelectedItem,
  editJob,
  gridList,
  selectedRowList,
  checkedPort,
  btnEsheetEnabled,
  btnStockerOutEnabled,
  btnCarryEnabled,
  radioPortEnabled,
  loading,
  dialog,
  selectAllRequest,
  closeOkDialog,
  setSpinnerBay,
  onSingleTapUp,
  selectedCancel,
  executeEsheet,
  executeSTKout,
  executeCarry,
  onBaySelected,
  onSearchLot,
  finish,
} = useLotStatusByBay();

const jobInput = ref<InstanceType<typeof BaseInput>>();
const focusedRowIndex = ref<number>();

const portOptions = [
  { label: 'OUT', value: 'OUT' },
  { label: '2OUT', value: '2OUT' },
];

const centerCell = () => ({ class: 'lot-status-by-bay__cell--center' });

// searchLotList columnData: keys, captions and gravity (공정명 START, the rest CENTER).
const columnData: BaseRevoGridColumn[] = [
  { prop: 'JOBCODE', name: 'JOB', cellProperties: centerCell },
  { prop: 'PROCESSSTEP', name: '공정명' },
  { prop: 'LOTID', name: 'LOT ID', cellProperties: centerCell },
  { prop: 'LOCATION', name: '상태', cellProperties: centerCell },
  { prop: 'QUANTITY', name: '수량', cellProperties: centerCell },
  { prop: 'LOC_TYPE', name: '위치구분', cellProperties: centerCell },
];

const wrapContent: AutoSizeColumnConfig = {
  mode: ColumnAutoSizeMode.autoSizeAll,
  allColumns: true,
  preciseSize: true,
};

// legacy setSelectRowColor: selected_grid_row marks every selected row.
const gridRows = computed(() =>
  (gridList.value ?? []).map((row, gridIndex) => ({
    ...row,
    gridIndex,
    rowClass: selectedRowList.value.includes(gridIndex) ? 'lot-status-by-bay__row--selected' : '',
  })),
);

function toOptions(values: readonly string[]): BaseOption[] {
  return values.map((value) => ({ label: value, value }));
}

/** Keyboard equivalent of the row tap: Enter or Space toggles the focused row. */
function onGridKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (focusedRowIndex.value === undefined) return;
  event.preventDefault();
  onSingleTapUp(focusedRowIndex.value);
}

// EditText.selectAll() only shows a selection while the JOB field has focus.
watch(selectAllRequest, async () => {
  await nextTick();
  const input = jobInput.value?.$el instanceof HTMLElement ? jobInput.value.$el : undefined;
  if (input?.contains(document.activeElement)) jobInput.value?.select();
});

function onDialogOpenChange(open: boolean): void {
  if (!open) closeOkDialog();
}

onMounted(() => {
  void setSpinnerBay();
});
</script>

<style scoped src="../styles/lot-status-by-bay.css"></style>
