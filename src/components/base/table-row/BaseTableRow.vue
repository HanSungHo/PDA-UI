<script setup lang="ts">
import { LineChartOutlined, WarningOutlined } from '@ant-design/icons-vue';

import type { BaseTableRowProps } from './BaseTableRow.types';

defineProps<BaseTableRowProps>();

const rowSelection = {
  onchange: () => {},
};
const formatDateTime = (date?: Date) => {
  if (!date) {
    return '-';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
};
</script>

<template>
  <a-table
    class="ds-table"
    :columns="columns"
    :data-source="dataSource"
    :pagination="false"
    :row-selection="rowSelection"
  >
    <template #emptyText>
      <div class="ds-table-empty">
        <WarningOutlined />
        <div class="ds-table-empty__code">404</div>
        <div class="ds-table-empty__text">No results.</div>
      </div>
    </template>
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'project'">
        <div class="ds-project-cell">
          <div class="ds-project-cell__icon">
            <LineChartOutlined />
          </div>

          <div class="ds-project-cell__content">
            <p class="ds-project-cell__title">
              {{ record.title }}
            </p>

            <p class="ds-project-cell__description">
              {{ record.description }}
            </p>
          </div>
        </div>
      </template>

      <template v-else-if="column.key === 'status'">
        <div class="ds-status-cell">
          <template v-if="record.tags?.length">
            <span v-for="tag in record.tags" :key="tag.label" class="ds-status-tag">
              {{ tag.label }}
            </span>
          </template>
          <span v-else>-</span>
        </div>
      </template>

      <template v-else-if="column.key === 'lastModified'">
        <div class="ds-last-modified">
          {{ formatDateTime(record.lastModified) }}
        </div>
      </template>

      <template v-else-if="column.key === 'actions'">
        <div class="ds-actions-cell"></div>
      </template>
    </template>
  </a-table>
</template>

<style scoped src="./base-tablerow.css"></style>
