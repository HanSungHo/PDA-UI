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
          { 'ds-table__row--selected': selectedRowKey === scope.key },
        ]"
        tabindex="0"
        :aria-selected="selectedRowKey === scope.key"
        @click="emit('row-click', scope.row)"
        @keydown.enter="emit('row-click', scope.row)"
        @keydown.space.prevent="emit('row-click', scope.row)"
      >
        <QTd v-for="column in scope.cols" :key="column.name" :props="scope">
          {{ column.value }}
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

import { BaseEmptyState } from '../empty-state';

defineOptions({ name: 'BaseTable' });
withDefaults(
  defineProps<{
    rows: Row[];
    columns: QTableColumn<Row>[];
    rowKey: string;
    loading?: boolean;
    selectedRowKey?: string | number;
    rowStatus?: (row: Row) => string;
  }>(),
  { loading: false, selectedRowKey: undefined, rowStatus: undefined },
);
const emit = defineEmits<{ 'row-click': [row: Row] }>();
</script>

<style scoped>
.ds-table {
  min-width: 0;
  color: var(--text-text-primary);
  font-family: var(--font-family-default, 'Noto Sans KR', sans-serif);
}
.ds-table :deep(tbody tr) {
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
