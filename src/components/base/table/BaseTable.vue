<template>
  <QTable
    class="ds-table"
    :rows="rows"
    :columns="columns"
    :row-key="rowKey"
    :loading="loading"
    :pagination="{ rowsPerPage: 0 }"
    :rows-per-page-options="[0]"
    flat
    dense
    :hide-bottom="rows.length > 0"
    separator="cell"
  >
    <template #body="scope">
      <QTr
        :props="scope"
        :class="[
          rowStatus ? `ds-table__row--${rowStatus(scope.row).toLowerCase()}` : undefined,
          {
            'ds-table__row--selected': selectedRowKey === scope.key,
            'ds-table__row--interactive': rowInteractive,
          },
        ]"
        :tabindex="rowInteractive ? 0 : undefined"
        :aria-selected="rowInteractive ? selectedRowKey === scope.key : undefined"
        @click="handleRowClick(scope.row)"
        @keydown.enter="handleRowClick(scope.row)"
        @keydown.space.prevent="handleRowClick(scope.row)"
      >
        <QTd v-for="column in scope.cols" :key="column.name" :props="scope">
          <slot name="cell" :row="scope.row" :column="column" :value="column.value">
            {{ column.value }}
          </slot>
        </QTd>
      </QTr>
    </template>
    <template #no-data>
      <slot name="empty"><BaseEmptyState /></slot>
    </template>
  </QTable>
</template>

<script setup lang="ts" generic="Row extends Record<string, unknown>">
import { QTable, type QTableColumn, QTd, QTr } from 'quasar';
import type { VNode } from 'vue';

import { BaseEmptyState } from '../empty-state';

defineOptions({ name: 'BaseTable' });
const props = withDefaults(
  defineProps<{
    rows: Row[];
    columns: QTableColumn<Row>[];
    rowKey: string;
    loading?: boolean;
    selectedRowKey?: string | number;
    rowStatus?: (row: Row) => string;
    rowInteractive?: boolean;
  }>(),
  { loading: false, selectedRowKey: undefined, rowStatus: undefined, rowInteractive: true },
);
defineSlots<{
  cell?: (props: { row: Row; column: QTableColumn<Row>; value: unknown }) => VNode[];
  empty?: () => VNode[];
}>();
const emit = defineEmits<{ 'row-click': [row: Row] }>();
function handleRowClick(row: Row): void {
  if (props.rowInteractive) emit('row-click', row);
}
</script>

<style scoped>
.ds-table {
  min-width: 0;
  color: var(--text-text-primary);
  font-family: var(--font-family-default, 'Noto Sans KR', sans-serif);
}
.ds-table :deep(tbody tr.ds-table__row--interactive) {
  cursor: pointer;
}
.ds-table :deep(.ds-table__row--fail) {
  background: var(--background-background-error-opacity-20);
  color: var(--text-text-error);
}
.ds-table :deep(.ds-table__row--run) {
  background: var(--background-background-info-opacity-20);
  color: var(--text-text-info);
}
.ds-table :deep(.ds-table__row--selected) {
  background: var(--background-background-brand);
  color: var(--text-text-reversed);
}
.ds-table :deep(tr:focus-visible) {
  outline: 2px solid var(--border-border-brand);
  outline-offset: -2px;
}
</style>
