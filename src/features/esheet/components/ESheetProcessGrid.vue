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
    accessible-label="공정표"
    @keydown="handleGridKeydown"
    @row-select="handleRowSelect"
    @cell-activate="handleCellActivate"
    @cell-click="handleCellClick"
    @cell-double-click="handleCellAction"
  />
</template>

<script setup lang="ts">
import type { ColumnRegular } from '@revolist/revogrid';
import { computed, ref } from 'vue';

import { BaseRevoGrid } from '@/components/base';

import type { ESheetProcessRow } from '../esheet.types';

interface Props {
  rows: ESheetProcessRow[];
  selectedProcessId?: string;
  showOperationNumbers?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  selectedProcessId: '',
  showOperationNumbers: false,
});
const emit = defineEmits<{
  select: [processId: string];
  processTap: [row: ESheetProcessRow];
  openMenu: [processId: string];
  openEdc: [row: ESheetProcessRow];
  openComment: [row: ESheetProcessRow];
  showDetails: [title: string, content: string, row: ESheetProcessRow];
}>();

type CellInteractionDetail = {
  rowKey: string | number;
  row: Record<string, unknown>;
  prop?: string;
};

const focusedCell = ref<CellInteractionDetail>();

const columns = computed<ColumnRegular[]>(() => {
  const numberColumns: ColumnRegular[] = props.showOperationNumbers
    ? [
        { prop: 'operationNumber', name: 'Step#', size: 88 },
        { prop: 'subOperationNumber', name: 'Sub#', size: 68 },
      ]
    : [];

  return [
    ...numberColumns,
    {
      prop: 'displayName',
      name: '공정명',
      size: 140,
      pin: 'colPinStart',
      cellProperties: () => ({ class: 'esheet-process-grid__process-cell' }),
      columnProperties: () => ({ class: 'esheet-process-grid__header--first' }),
    },
    { prop: 'c', name: 'C', size: 32 },
    { prop: 'i', name: 'I', size: 32 },
    { prop: 'o', name: 'O', size: 32 },
    {
      prop: 'description',
      name: 'DESCRIPTION',
      size: 112,
      cellProperties: () => ({ class: 'esheet-process-grid__description-cell' }),
      columnProperties: () => ({ class: 'esheet-process-grid__header--last' }),
    },
    {
      prop: 'recipe',
      name: 'RECIPE',
      size: 180,
      cellProperties: ({ model }) => ({
        class: (model as ESheetProcessRow).recipeChanged ? 'esheet-process-grid__changed-cell' : '',
      }),
    },
    {
      prop: 'equipmentGroup',
      name: '기준장비',
      size: 160,
      cellProperties: ({ model }) => ({
        class: (model as ESheetProcessRow).equipmentGroupChanged
          ? 'esheet-process-grid__changed-cell'
          : '',
      }),
    },
    { prop: 'isRework', name: 'R', size: 28 },
    {
      prop: 'isDcol',
      name: 'D',
      size: 28,
      cellProperties: () => ({ class: 'esheet-process-grid__dcol-cell' }),
    },
    { prop: 'bay', name: 'BAY', size: 72 },
    { prop: 'realEquipmentId', name: '진행장비', size: 132 },
    { prop: 'realRecipe', name: '진행RCP', size: 156 },
    { prop: 'realReticle', name: '진행MASK', size: 132 },
    { prop: 'startTime', name: '투입시간', size: 136 },
    { prop: 'inOperationName', name: '작업자', size: 112 },
    { prop: 'endTime', name: '완료시간', size: 136 },
    { prop: 'outOperationName', name: '작업자', size: 112 },
    { prop: 'futureActionDescription', name: 'Futureaction', size: 180 },
    { prop: 'actionType', name: 'Actiontype', size: 100 },
  ];
});

function handleRowSelect(processId: string | number): void {
  emit('select', String(processId));
}

function handleCellActivate(detail: CellInteractionDetail): void {
  focusedCell.value = detail;
}

function handleCellClick(detail: CellInteractionDetail & { wasSelected: boolean }): void {
  emitProcessTap(detail);
  if (detail.wasSelected) openProcessMenu(detail);
}

// Android's row gesture listener records the F (Future) operation, but cells with their own
// action (comment, EDC, detail dialogs) consume the tap before it reaches the row.
function emitProcessTap(detail: CellInteractionDetail): void {
  if (!getCellAction(detail)) emit('processTap', detail.row as unknown as ESheetProcessRow);
}

function handleGridKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' || !isGridCellEvent(event) || !focusedCell.value) return;

  event.preventDefault();
  emitProcessTap(focusedCell.value);
  if (focusedCell.value.prop === 'displayName') {
    openProcessMenu(focusedCell.value);
  } else {
    handleCellAction(focusedCell.value);
  }
}

function isGridCellEvent(event: KeyboardEvent): boolean {
  return event
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLElement &&
        (target.classList.contains('rgCell') || target.matches('revo-grid[role="treegrid"]')),
    );
}

function openProcessMenu(detail: CellInteractionDetail): void {
  const processId = String(detail.rowKey);
  if (
    processId === props.selectedProcessId &&
    detail.prop === 'displayName' &&
    (detail.row.operationType === 'M' || detail.row.operationType === 'P')
  ) {
    emit('openMenu', processId);
  }
}

type CellAction =
  | { kind: 'edc' }
  | { kind: 'comment' }
  | { kind: 'details'; title: string; value: string };

function getCellAction(detail: CellInteractionDetail): CellAction | undefined {
  const row = detail.row as unknown as ESheetProcessRow;

  if (detail.prop === 'isDcol' && row.isDcol === 'Y') return { kind: 'edc' };
  if (
    detail.prop === 'c' &&
    (row.operationType === 'M' || row.operationType === 'P') &&
    row.commentCount !== '' &&
    row.commentCount !== '0'
  ) {
    return { kind: 'comment' };
  }
  const detailFields: Record<string, { title: string; value: string }> = {
    description: { title: 'DESCRIPTION', value: row.description },
    equipmentGroup: { title: '기준장비', value: row.equipmentGroup },
    recipe: { title: 'RECIPE', value: row.recipe },
  };
  const selected = detail.prop ? detailFields[detail.prop] : undefined;
  return selected?.value ? { kind: 'details', ...selected } : undefined;
}

function handleCellAction(detail: CellInteractionDetail): void {
  const row = detail.row as unknown as ESheetProcessRow;

  if (detail.prop === 'displayName') return;

  const action = getCellAction(detail);
  if (action?.kind === 'edc') emit('openEdc', row);
  else if (action?.kind === 'comment') emit('openComment', row);
  else if (action?.kind === 'details') {
    emit('showDetails', action.title, `[${action.title}]\n${action.value}`, row);
  }
}
</script>

<style scoped>
.esheet-process-grid {
  /* Android process-row colors; no design-tokens.css equivalent, so they stay local. */
  --esheet-comment-row-background: #ff0000;
  --esheet-current-row-background: #0080ff;
  --esheet-current-row-text: #ffffff;
  --esheet-non-current-row-background: #ffffd0;
  --esheet-row-selection-outline: #130842;
  --base-revo-grid-radius: 4px;
  --base-revo-grid-vertical-right: -8px;
  /* Thumb lengths stay proportional: the grid height follows the screen. */
  --base-revo-grid-vertical-width: 4px;
  --base-revo-grid-horizontal-bottom: -6px;
  --base-revo-grid-horizontal-left: 8px;
  --base-revo-grid-horizontal-height: 4px;

  position: relative;
  width: 100%;
  min-width: 0;
  height: 100%;
  overflow: visible;
}

/* The grid fills the process card, which takes the screen's remaining height. */
.esheet-process-grid :deep(.base-revo-grid__viewport) {
  height: 100%;
  border-radius: 4px;
  background: var(--background-background-primary, #fff);
}

.esheet-process-grid :deep(revo-grid) {
  --revo-grid-header-height: 40px;
  --revo-grid-font-family: var(--font-family-default, 'Noto Sans KR', sans-serif);
  --revo-grid-font-size: 12px;
  --revo-grid-header-font-size: 12px;
  --revo-grid-header-font-weight: 700;
  --revo-grid-header-text-transform: none;
  --revo-grid-header-text-align: left;
  --revo-grid-header-padding: 0 8px;
  --revo-grid-cell-padding: 8px;
  --revo-grid-text: var(--text-text-primary, #030712);
  --revo-grid-header-bg: var(--button-primary-default-btn-primary-bg-default, #02b0a5);

  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.esheet-process-grid :deep(.rgHeaderCell) {
  box-sizing: border-box;
  align-items: center;
  border-inline-end: 1px solid var(--background-background-primary, #fff);
  color: var(--text-text-white, #f9fafb);
  background: var(--button-primary-default-btn-primary-bg-default, #02b0a5);
  font-size: 12px;
  font-weight: 700;
  line-height: 16px;
  padding: 0 8px;
}

.esheet-process-grid :deep(.rgHeaderCell .header-content) {
  display: flex;
  height: 16px;
  align-items: center;
  top: 50%;
  bottom: auto;
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
  line-height: 16px;
  transform: translateY(-50%);
}

.esheet-process-grid :deep(.rgHeaderCell .header-controls) {
  display: none;
}

.esheet-process-grid :deep(.esheet-process-grid__header--first) {
  border-start-start-radius: 4px;
}

.esheet-process-grid :deep(.rgCell) {
  box-sizing: border-box;
  overflow: hidden;
  border-inline-end: 1px solid var(--border-border-primary, #d1d5dc);
  border-block-end: 1px solid var(--border-border-primary, #d1d5dc);
  padding: 8px;
  background: var(--background-background-primary, #fff);
  font-size: 12px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.esheet-process-grid :deep(.esheet-process-grid__process-cell) {
  border-inline-start: 0;
}

.esheet-process-grid :deep(.esheet-process-grid__description-cell) {
  color: var(--text-text-secondary, #364153);
}

.esheet-process-grid :deep(.esheet-process-grid__changed-cell) {
  background: var(--background-background-warning-20, #fff1e6);
}

.esheet-process-grid :deep(.esheet-process-row--hold .rgCell) {
  background: var(--semantic-pink-100, #f5c6ec);
}

.esheet-process-grid :deep(.esheet-process-row--skip .rgCell),
.esheet-process-grid :deep(.esheet-process-row--completed .rgCell) {
  background: var(--background-background-secondary, #dcdcdc);
}

.esheet-process-grid :deep(.esheet-process-row--other .rgCell) {
  background: var(--semantic-orange-100, #fffff0);
}

.esheet-process-grid :deep(.esheet-process-row--current .rgCell) {
  color: var(--esheet-current-row-text);
  background: var(--esheet-current-row-background);
}

.esheet-process-grid :deep(.esheet-process-row--upcoming .rgCell) {
  background: var(--esheet-non-current-row-background);
}

.esheet-process-grid
  :deep(.esheet-process-row--comment .rgCell:not(.esheet-process-grid__process-cell)) {
  background: var(--esheet-comment-row-background);
}

.esheet-process-grid :deep(.esheet-process-row--selected) {
  outline: 3px solid var(--esheet-row-selection-outline);
  outline-offset: -3px;
}
</style>
