<template>
  <BaseScreen title="장비 상태">
    <section class="ds-screen__card" aria-label="BAY 및 장비 조회">
      <div class="ds-screen__card-row">
        <BaseDropdownList
          label="BAY"
          :model-value="selectedBay ?? undefined"
          :options="bayOptions"
          @update:model-value="handleBayChange"
        />
        <BaseButton
          variant="secondary"
          size="small"
          label="조회"
          :disabled="isLoading"
          @click="loadEqpList"
        />
      </div>

      <div class="ds-screen__card-row">
        <BaseInput
          :ref="setEqpInputRef"
          label="장비"
          uppercase
          select-on-focus
          autocomplete="off"
          :model-value="eqpId"
          @update:model-value="eqpId = String($event ?? '')"
          @keyup.enter="handleEqpEnter"
        />
        <BaseButton variant="secondary" size="small" label="상세상태" @click="handleDetailClick" />
      </div>
    </section>

    <section class="ds-screen__card table-section" aria-label="장비 목록">
      <BaseRevoGrid
        v-if="rows.length"
        :rows="rows"
        :columns="columns"
        row-key="EQPID"
        :resize="false"
        readonly
        :auto-size-column="{ allColumns: true, preciseSize: true }"
        @row-select="onRowSelect"
        @cell-double-click="onCellDoubleClick"
      />
      <BaseEmptyState v-else icon-variant="filled" />
    </section>

    <template #footer>
      <BaseButton variant="tertiary" size="medium" label="닫기" @click="handleClose" />
    </template>
  </BaseScreen>
</template>

<script setup lang="ts">
import type { BaseRevoGridColumn } from 'src/components/base';
import {
  BaseButton,
  BaseDropdownList,
  BaseEmptyState,
  BaseInput,
  BaseRevoGrid,
  BaseScreen,
} from 'src/components/base';
import { ROUTE } from 'src/constants/routes';
import { onMounted } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';

import { useMachineStatus } from '../composables/use-machine-status';

// Legacy setEQPList(): 장비 / 상태 / TYPE are centered, DESCRIPTION is left-aligned.
const centerCell = () => ({ style: { textAlign: 'center' } });
const leftCell = () => ({ style: { textAlign: 'left' } });

const columns: BaseRevoGridColumn[] = [
  { prop: 'EQPID', name: '장비', cellProperties: centerCell },
  { prop: 'EQPSTATUS', name: '상태', cellProperties: centerCell },
  { prop: 'EQPDESCRIPTION', name: 'DESCRIPTION', cellProperties: leftCell },
  { prop: 'EQPTYPE', name: 'TYPE', cellProperties: centerCell },
];

const {
  bayOptions,
  selectedBay,
  eqpId,
  rows,
  isLoading,
  hasLoadedBays,
  eqpInputRef,
  loadBays,
  handleBayChange,
  loadEqpList,
  handleRowSelect,
  handleRowDoubleClick,
  handleEqpEnter,
  handleDetailClick,
  handleClose,
  consumeDetailResult,
  resetState,
} = useMachineStatus();

function setEqpInputRef(el: unknown): void {
  eqpInputRef.value = el as { focus: () => void; select: () => void } | null;
}

function onRowSelect(_rowKey: unknown, row: unknown): void {
  handleRowSelect(row as Record<string, unknown>);
}

function onCellDoubleClick(detail: { row: unknown }): void {
  handleRowDoubleClick(detail.row as Record<string, unknown>);
}

onMounted(() => {
  if (!hasLoadedBays.value) {
    void loadBays();
  } else if (consumeDetailResult()) {
    void loadEqpList();
  }
});

onBeforeRouteLeave((to) => {
  if (to.name !== ROUTE.machineStatusDetail) resetState();
});
</script>

<style scoped>
.ds-screen__card.table-section {
  flex: 1;
  align-items: center;
  justify-content: center;
}
</style>
