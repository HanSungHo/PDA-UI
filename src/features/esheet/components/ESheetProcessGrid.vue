<template>
  <BaseRevoGrid
    class="esheet-process-grid"
    :rows="props.rows"
    :columns="columns"
    row-key="id"
    :selected-row-key="props.selectedProcessId"
    selected-row-class="esheet-process-row--selected"
    :row-size="40"
    data-testid="esheet-process-grid"
    aria-label="공정표"
    @row-select="handleRowSelect"
    @cell-activate="handleCellActivate"
    @cell-double-click="handleCellDoubleClick"
  />
</template>

<script setup lang="ts">
import type { ColumnRegular } from '@revolist/revogrid';

import { BaseRevoGrid } from '@/components/base';

import type { ESheetProcessRow } from '../esheet.types';

interface Props {
  rows: ESheetProcessRow[];
  selectedProcessId?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  select: [processId: string];
  openMenu: [processId: string];
  openEdc: [row: ESheetProcessRow];
}>();

const columns: ColumnRegular[] = [
  {
    prop: 'name',
    name: '공정명',
    size: 140,
    pin: 'colPinStart',
    cellProperties: () => ({ class: 'esheet-process-grid__process-cell' }),
    columnProperties: () => ({ class: 'esheet-process-grid__header--first' }),
  },
  { prop: 'c', name: 'C', size: 35 },
  { prop: 'i', name: 'I', size: 28 },
  { prop: 'o', name: 'O', size: 35 },
  { prop: 'isDcol', name: 'D', size: 35 },
  {
    prop: 'description',
    name: 'DESCRIPTION',
    size: 119,
    cellProperties: () => ({ class: 'esheet-process-grid__description-cell' }),
    columnProperties: () => ({ class: 'esheet-process-grid__header--last' }),
  },
];

function handleRowSelect(processId: string | number): void {
  emit('select', String(processId));
}

function handleCellActivate(detail: {
  rowKey: string | number;
  row: Record<string, unknown>;
  prop?: string;
}): void {
  const processId = String(detail.rowKey);
  if (
    processId === props.selectedProcessId &&
    detail.prop === 'name' &&
    (detail.row.operationType === 'M' || detail.row.operationType === 'P')
  ) {
    emit('openMenu', processId);
  }
}

function handleCellDoubleClick(detail: {
  rowKey: string | number;
  row: Record<string, unknown>;
  prop?: string;
}): void {
  if (detail.prop === 'isDcol' && detail.row.isDcol === 'Y') {
    emit('openEdc', detail.row as unknown as ESheetProcessRow);
  }
}
</script>

<style scoped>
.esheet-process-grid {
  --base-revo-grid-radius: 6px;
  --base-revo-grid-vertical-right: -8px;
  --base-revo-grid-vertical-width: 4px;
  --base-revo-grid-vertical-height: 127px;
  --base-revo-grid-horizontal-bottom: -6px;
  --base-revo-grid-horizontal-left: 8px;
  --base-revo-grid-horizontal-width: 304px;
  --base-revo-grid-horizontal-height: 4px;

  position: relative;
  width: 312px;
  height: 352px;
  overflow: visible;
}

.esheet-process-grid :deep(.base-revo-grid__viewport) {
  border-radius: 6px;
}

.esheet-process-grid :deep(revo-grid) {
  --revo-grid-header-height: 40px;
  --revo-grid-font-family: var(--family-font-family-default, 'Noto Sans KR', sans-serif);
  --revo-grid-font-size: 14px;
  --revo-grid-header-font-size: 14px;
  --revo-grid-header-font-weight: 600;
  --revo-grid-header-text-transform: none;
  --revo-grid-header-text-align: left;
  --revo-grid-header-padding: 0 12px;
  --revo-grid-cell-padding: 12px;
  --revo-grid-text: #030712;
  --revo-grid-header-bg: #02b0a5;

  display: block;
  width: calc(100% + 16px);
  height: calc(100% + 16px);
  border: 0;
}

.esheet-process-grid :deep(.rgHeaderCell) {
  box-sizing: border-box;
  align-items: center;
  border-inline-end: 1px solid #f9fafb;
  color: #f9fafb;
  background: #02b0a5;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  padding: 0 12px;
}

.esheet-process-grid :deep(.rgHeaderCell .header-content) {
  display: flex;
  height: 20px;
  align-items: center;
  top: 50%;
  bottom: auto;
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
  line-height: 20px;
  transform: translateY(-50%);
}

.esheet-process-grid :deep(.rgHeaderCell .header-controls) {
  display: none;
}

.esheet-process-grid :deep(.esheet-process-grid__header--first) {
  border-start-start-radius: 6px;
}

.esheet-process-grid :deep(.rgCell) {
  box-sizing: border-box;
  overflow: hidden;
  border-inline-end: 1px solid #d1d5dc;
  border-block-end: 1px solid #d1d5dc;
  padding: 12px;
  background: #fff;
  font-size: 14px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.esheet-process-grid :deep(.esheet-process-grid__process-cell) {
  border-inline-start: 0;
}

.esheet-process-grid :deep(.esheet-process-grid__description-cell) {
  border-inline-end: 0;
  color: #364153;
  font-family: var(--family-font-family-default, 'Noto Sans KR', sans-serif);
  font-size: 12px;
  font-weight: 500;
  line-height: 15px;
}

.esheet-process-grid :deep(.esheet-process-row--selected .rgCell) {
  background: #f0fdfa;
  font-size: 14px;
  font-weight: 400;
}
</style>
