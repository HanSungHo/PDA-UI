<script setup lang="ts">
import { QIcon } from 'quasar';
import { computed } from 'vue';

import BaseButton from '~/components/base/button/BaseButton.vue';
import BaseEmptyState from '~/components/base/empty-state/BaseEmptyState.vue';
import BaseInput from '~/components/base/input/BaseInput.vue';
import BaseLoading from '~/components/base/loading/BaseLoading.vue';
import BaseModal from '~/components/base/modal/BaseModal.vue';
import type { BaseRevoGridColumn, BaseRevoGridKey } from '~/components/base/revo-grid';
import BaseRevoGrid from '~/components/base/revo-grid/BaseRevoGrid.vue';

import { useMergePage } from '../composables/useMergePage';
import type { MergeLotRow } from '../services/merge.service';

const merge = useMergePage();
const lotIdModel = computed({
  get: () => merge.lotId.value,
  set: (value: string | number | undefined) => {
    merge.lotId.value = String(value ?? '').toUpperCase();
  },
});

interface MergeGridRow extends MergeLotRow {
  id: number;
  rowClass: string;
}

const columns: BaseRevoGridColumn[] = [
  { prop: 'LOTNAME', name: 'LOT ID', size: 72 },
  { prop: 'PRODUCTSPECNAME', name: '제품', size: 56 },
  { prop: 'PROCESSFLOWNAME', name: 'ROUTE', size: 76 },
  { prop: 'OPERATIONDESCRIPTION', name: '공정 DESC', size: 100 },
  { prop: 'PROCESSOPERATIONNAME', name: '공정', size: 56 },
  { prop: 'JOBCODE', name: 'JOB CODE', size: 100 },
  { prop: 'PRODUCTQUANTITY', name: 'QTY', size: 70 },
];

const gridRows = computed<MergeGridRow[]>(() => {
  const selectedRows = new Set(merge.selectedRowList.value);
  return merge.rows.value.map((row, index) => ({
    ...row,
    id: index,
    rowClass: selectedRows.has(index) ? 'merge-grid-row--selected' : '',
  }));
});

function onGridRowSelect(rowKey: BaseRevoGridKey): void {
  if (typeof rowKey !== 'number' || rowKey < 0 || rowKey >= merge.rows.value.length) return;
  merge.selectLotList(rowKey);
}
</script>

<template>
  <main class="merge-canvas">
    <section class="merge-screen">
      <header class="merge-header">MERGE</header>

      <div class="merge-content">
        <section class="merge-card merge-product" aria-label="LOT 정보">
          <div class="merge-search-row">
            <BaseInput
              :ref="merge.lotInputRef"
              v-model="lotIdModel"
              class="merge-field merge-search"
              label="LOT ID"
              placeholder="Search"
              autocomplete="off"
              @keydown.enter.prevent="merge.onLotEnter"
            >
              <template #append>
                <QIcon name="sym_o_search" class="merge-search-icon" aria-hidden="true" />
              </template>
            </BaseInput>
            <BaseButton
              class="merge-search-button"
              label="조회"
              size="small"
              variant="secondary"
              :disabled="merge.busy.value"
              @click="merge.getMergeLotInfo"
            />
          </div>

          <BaseButton
            class="merge-detail-button"
            label="LOT 상세"
            size="small"
            variant="secondary"
            @click="merge.inquireLotInfo"
          />

          <div class="merge-field-grid">
            <BaseInput :model-value="merge.info.value.PRODUCTSPECNAME" label="제품" readonly />
            <BaseInput :model-value="merge.info.value.PROCESSFLOWNAME" label="ROUTE" readonly />
            <BaseInput
              :model-value="merge.info.value.PROCESSOPERATIONNAME"
              label="공정번호"
              readonly
            />
            <BaseInput
              :model-value="merge.info.value.OPERATIONDESCRIPTION"
              label=""
              aria-label="공정 설명"
              readonly
            />
            <BaseInput :model-value="merge.info.value.AREA" label="AREA" readonly />
            <BaseInput :model-value="merge.info.value.PRODUCTQUANTITY" label="QTY" readonly />
            <BaseInput :model-value="merge.info.value.LOTHOLDSTATE" label="HOLD" readonly />
            <BaseInput :model-value="merge.info.value.REWORKSTATE" label="REWORK" readonly />
          </div>

          <BaseButton
            class="merge-select-all"
            label="전체선택"
            size="small"
            variant="primary"
            :aria-pressed="merge.allSelected.value"
            @click="merge.selectAllRow"
          />
        </section>

        <section
          class="merge-card merge-grid-card"
          aria-label="Merge 대상 LOT"
          :aria-busy="merge.searching.value"
        >
          <div v-if="merge.searching.value" class="merge-grid-state">
            <BaseLoading size="medium" />
          </div>
          <div v-else-if="!gridRows.length" class="merge-grid-state">
            <BaseEmptyState />
          </div>
          <BaseRevoGrid
            v-else
            class="merge-grid"
            :rows="gridRows"
            :columns="columns"
            row-key="id"
            :row-size="40"
            :resize="false"
            :filter="false"
            :readonly="true"
            :stretch="false"
            accessible-label="Merge 대상 LOT"
            @row-select="onGridRowSelect"
          />
        </section>

        <section class="merge-card merge-comment" aria-label="Comment">
          <BaseInput
            v-model="merge.comment.value"
            placeholder="Comment"
            aria-label="Comment"
            mode="textarea"
            :rows="3"
          />
        </section>
      </div>

      <footer class="merge-footer">
        <BaseButton
          class="merge-execute"
          label="실행"
          variant="primary"
          :disabled="merge.busy.value"
          @click="merge.executeMerge"
        />
        <BaseButton class="merge-close" label="닫기" variant="tertiary" @click="merge.close" />
      </footer>

      <BaseModal
        :open="merge.dialog.value.open"
        :title="merge.dialog.value.title"
        :closable="false"
        :overlay-closable="false"
      >
        <p class="merge-dialog-message">{{ merge.dialog.value.message }}</p>
        <div class="merge-dialog-actions">
          <BaseButton
            v-if="merge.dialog.value.confirm"
            label="아니오"
            variant="tertiary"
            @click="merge.closeDialog(false)"
          />
          <BaseButton
            :label="merge.dialog.value.confirm ? '예' : '확인'"
            variant="primary"
            @click="merge.closeDialog(true)"
          />
        </div>
      </BaseModal>
    </section>
  </main>
</template>

<style src="../styles/merge.css"></style>
