<template>
  <section class="furnace-card furnace-card--table" aria-label="Batch Lot List">
    <!-- Empty State matching Figma node 4145:17395 -->
    <div v-if="items.length === 0" class="furnace-empty-state">
      <div class="furnace-empty-state__icon-wrap">
        <svg
          class="furnace-empty-state__icon"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 17H15M9 13H15M9 9H10M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <div class="furnace-empty-state__title">EMPTY</div>
      <div class="furnace-empty-state__desc">해당 결과가 없습니다</div>
    </div>

    <!-- Non-Empty Table List powered by BaseRevoGrid -->
    <div v-else class="furnace-table-wrap">
      <BaseRevoGrid
        class="furnace-grid"
        data-testid="furnace-grid"
        :rows="items"
        :columns="columns"
        row-key="lotId"
        :selected-row-key="selectedLotId"
        selected-row-class="furnace-grid__row--selected"
        :row-size="44"
        :resize="false"
        :readonly="true"
        aria-label="Batch Lot List"
        @row-select="handleRowSelect"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { VGridVueTemplate } from '@revolist/vue3-datagrid';
import { BaseRevoGrid } from 'src/components/base';
import type { BaseRevoGridColumn, BaseRevoGridKey } from 'src/components/base/revo-grid';
import { computed } from 'vue';

import type { BatchLotItem } from '../types/remote-furnace.types';
import { FurnaceCommentCell, FurnaceStatusCell, FurnaceTextCell } from './FurnaceTableCells';

defineOptions({ name: 'FurnaceBatchTable' });

const props = defineProps<{
  items: BatchLotItem[];
  selectedLotId?: string;
}>();

const emit = defineEmits<{
  (e: 'select-lot', item: BatchLotItem): void;
  (e: 'read-comment', item: BatchLotItem): void;
}>();

const commentTemplate = VGridVueTemplate(FurnaceCommentCell, {
  onReadComment: (item: BatchLotItem) => emit('read-comment', item),
});

const statusTemplate = VGridVueTemplate(FurnaceStatusCell);
const lotTemplate = VGridVueTemplate(FurnaceTextCell, { prop: 'lotId' });
const processTemplate = VGridVueTemplate(FurnaceTextCell, { prop: 'processStep' });
const productTemplate = VGridVueTemplate(FurnaceTextCell, { prop: 'product' });
const qtyTemplate = VGridVueTemplate(FurnaceTextCell, { prop: 'quantity' });
const errorTemplate = VGridVueTemplate(FurnaceTextCell, { prop: 'errorMessage' });

const columns = computed<BaseRevoGridColumn[]>(() => [
  { prop: 'lotId', name: 'LOTNO', size: 140, cellTemplate: lotTemplate },
  { prop: 'commentQty', name: 'C', size: 45, cellTemplate: commentTemplate },
  { prop: 'status', name: '상태', size: 80, cellTemplate: statusTemplate },
  { prop: 'processStep', name: '공정명', size: 130, cellTemplate: processTemplate },
  { prop: 'product', name: '제품명', size: 130, cellTemplate: productTemplate },
  { prop: 'quantity', name: '수량', size: 65, cellTemplate: qtyTemplate },
  { prop: 'errorMessage', name: '에러메시지', size: 160, cellTemplate: errorTemplate },
]);

function handleRowSelect(rowKey: BaseRevoGridKey, row?: Record<string, unknown>): void {
  const target =
    props.items.find((i) => i.lotId === String(rowKey)) || (row as unknown as BatchLotItem);
  if (target) {
    emit('select-lot', target);
    if (target.commentQty > 0) {
      emit('read-comment', target);
    }
  }
}
</script>
