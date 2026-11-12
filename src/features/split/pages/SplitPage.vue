<script setup lang="ts">
import { computed } from 'vue';

import { BaseButton, BaseScreen } from '~/components/base';
import BaseCheckbox from '~/components/base/checkbox/BaseCheckbox.vue';
import BaseDropdownList from '~/components/base/dropdown-list/BaseDropdownList.vue';
import type { BaseRevoGridColumn, BaseRevoGridKey } from '~/components/base/index.ts';
import BaseInput from '~/components/base/input/BaseInput.vue';
import BaseRevoGrid from '~/components/base/revo-grid/BaseRevoGrid.vue';

import SplitWaferSelectDialog from '../components/splitWaferSelectDialog.vue';
import { useSplitPage } from '../composables/useSplitPage.ts';
const {
  product,
  originalQtyText,
  currentOperation,
  comment,
  rows,
  selectedRowId,
  selectRow,
  isEtch,
  childCount,
  canChangeCount,
  canSplit,
  canOk,
  canWafer,
  remainQtyText,
  busy,
  lotInputWrapper,
  lotNoModel,
  childCountOptions,
  waferDialogOpen,
  waferDialogPayload,
  onLotSubmit,
  onSplitClick,
  onWaferClick,
  onRowDoubleClick,
  onWaferConfirm,
  onWaferCancel,
  onOkClick,
  onCancel,
} = useSplitPage();

interface GridRow {
  id: number;
  lotNo: string;
  n: string;
  waferText: string;
  product: string;
}

// RevoGrid chỉ nhận field phẳng nên map từ rows gốc
const gridSource = computed<GridRow[]>(() =>
  rows.value.map((r) => ({
    id: r.id,
    lotNo: r.lotNo,
    n: String(r.wafers.length),
    waferText: r.wafers.join(','),
    product: r.product,
  })),
);

// Figma Table List widths at 432px; the last column stretches to fill the grid.
const columns: BaseRevoGridColumn[] = [
  { prop: 'lotNo', name: 'LOT No.', size: 110 },
  { prop: 'n', name: 'N', size: 50, readonly: true },
  {
    prop: 'waferText',
    name: 'WAFER',
    size: 110,
    readonly: true,

    cellTemplate: (createElement, { model }) =>
      createElement(
        'div',
        { class: 'cell-text', onDblClick: () => onRowDoubleClick((model as GridRow).id) },
        (model as GridRow).waferText,
      ),
  },
  { prop: 'product', name: '제품명', size: 120, readonly: true },
];

function onCellEdit({
  rowKey,
  prop,
  value,
}: {
  rowKey: BaseRevoGridKey;
  prop: string;
  value: unknown;
}): void {
  if (prop !== 'lotNo') return;
  const row = rows.value.find((r) => r.id === Number(rowKey));
  if (!row) return;
  const text = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  row.lotNo = text.toUpperCase();
}
function onRowSelect(rowKey: BaseRevoGridKey): void {
  selectRow(Number(rowKey));
}
</script>

<template>
  <BaseScreen class="split-page" title="SPLIT">
    <div class="ds-screen__card">
      <!-- edit_lot_no: manual entry / barcode scan (Enter) -->
      <div ref="lotInputWrapper" class="ds-screen__card-row">
        <BaseInput v-model="lotNoModel" label="LOT No." @keyup.enter="onLotSubmit" />
      </div>

      <div class="ds-screen__card-row">
        <BaseInput :model-value="product" label="제품명" readonly />
        <BaseInput :model-value="originalQtyText" label="수량" readonly />
      </div>

      <BaseInput :model-value="currentOperation" label="현공정" readonly />

      <BaseInput v-model="comment" label="COMMENT" />
    </div>

    <div class="ds-screen__card split-page__grid">
      <BaseRevoGrid
        :rows="gridSource"
        :columns="columns"
        :selected-row-key="selectedRowId ?? undefined"
        :readonly="false"
        :resize="false"
        :filter="false"
        stretch
        accessible-label="SPLIT LOT"
        @row-select="onRowSelect"
        @cell-edit="onCellEdit"
      />
    </div>

    <div class="ds-screen__card">
      <BaseCheckbox v-model="isEtch" label="ETCH 선행 LOT" />

      <div class="ds-screen__card-row">
        <BaseDropdownList
          v-model="childCount"
          aria-label="Split count"
          :options="childCountOptions"
          :disabled="!canChangeCount"
        />
        <BaseButton
          label="SPLIT"
          variant="secondary"
          size="small"
          :disabled="!canSplit || busy"
          @click="onSplitClick"
        />
      </div>

      <div class="ds-screen__card-row">
        <BaseInput :model-value="remainQtyText" label="잔여" readonly />
        <BaseButton
          label="W/F"
          variant="secondary"
          size="small"
          :disabled="!canWafer || busy"
          @click="onWaferClick"
        />
      </div>
    </div>

    <template #footer>
      <BaseButton
        label="확인"
        variant="primary"
        size="medium"
        :disabled="!canOk || busy"
        @click="onOkClick"
      />
      <BaseButton label="취소" variant="tertiary" size="medium" @click="onCancel" />
    </template>

    <SplitWaferSelectDialog
      :open="waferDialogOpen"
      :payload="waferDialogPayload"
      @confirm="onWaferConfirm"
      @cancel="onWaferCancel"
    />
  </BaseScreen>
</template>

<style scoped src="../styles/split.css"></style>
