<template>
  <main class="batchsub">
    <header class="batchsub__header">
      <h1 data-testid="batchsub-title" class="batchsub__title">子 BATCH LIST</h1>
    </header>

    <section class="batchsub__content" aria-label="Batchsub grid">
      <div class="batchsub__table-card">
        <div v-if="isLoading" class="batchsub__status" aria-live="polite">
          <BaseLoading size="small" />
        </div>

        <p v-else-if="hasError" class="batchsub__error" role="alert">{{ errorMessage }}</p>

        <BaseRevoGrid
          v-else
          class="batchsub__grid"
          :rows="items"
          :columns="gridColumns"
          row-key="no"
          :row-size="BATCHSUB_GRID_ROW_SIZE"
          :resize="false"
          :stretch="true"
          :style="gridStyle"
          aria-label="子 BATCH LIST"
          @row-select="handleRowSelect"
        />
      </div>
    </section>

    <footer class="batchsub__footer">
      <BaseButton
        data-testid="batchsub-cancel"
        class="batchsub__cancel"
        variant="tertiary"
        block
        @click="cancel"
      >
        취소
      </BaseButton>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { BaseButton } from '../../../components/base/button';
import { BaseLoading } from '../../../components/base/loading';
import type { BaseRevoGridColumn, BaseRevoGridKey } from '../../../components/base/revo-grid';
import { BaseRevoGrid } from '../../../components/base/revo-grid';
import { DeviceInfo } from '../../../constants/deviceinfo';
import { normalizeApiError } from '../../../services/api-error';
import { fetchBatchsubList } from '../services/batchsub.service';
import { useBatchsubStore } from '../stores/batchsub.store';
import type { BatchsubItem } from '../types/batchsub.types';

const route = useRoute();
const router = useRouter();
const batchsubStore = useBatchsubStore();

const psbatchid = ref('');
const returnlotname = ref('');
const items = ref<BatchsubItem[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');

const BATCHSUB_GRID_HEADER_SIZE = 40;
const BATCHSUB_GRID_ROW_SIZE = 40;

const gridColumns: BaseRevoGridColumn[] = [
  { prop: 'no', name: 'No', size: 48 },
  { prop: 'batchId', name: 'BATCH ID', size: 132 },
  { prop: 'Jalotname', name: 'LOT No.', size: 152 },
];

const hasError = computed(() => errorMessage.value !== '');
const gridStyle = computed<Record<string, string>>(() => ({
  height: `${BATCHSUB_GRID_HEADER_SIZE + items.value.length * BATCHSUB_GRID_ROW_SIZE}px`,
}));

onMounted(() => {
  psbatchid.value = resolveInitialMobatchid();

  if (psbatchid.value !== '') {
    void getbatch();
  }
});

function resolveInitialMobatchid(): string {
  const value = route.query.MOBATCHID;
  return typeof value === 'string' ? value : '';
}

async function getbatch(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const response = await fetchBatchsubList({
      facility: DeviceInfo.FACILITY,
      psbatchid: psbatchid.value,
    });
    items.value = response.items;
  } catch (cause: unknown) {
    items.value = [];
    errorMessage.value = normalizeApiError(cause).message;
  } finally {
    isLoading.value = false;
  }
}

function cancel(): void {
  batchsubStore.cancel();
  router.back();
}

function handleRowSelect(rowKey: BaseRevoGridKey): void {
  const selected = items.value.find((item) => item.no === String(rowKey));
  if (!selected) return;

  sendjalotname(selected.Jalotname);
}

function sendjalotname(Jalotname: string): void {
  returnlotname.value = Jalotname;
  batchsubStore.complete({ JALOTNAME: returnlotname.value });
  router.back();
}
</script>

<style scoped>
.batchsub {
  --batchsub-accent: #09b4aa;
  --batchsub-border: #d1d5dc;
  --batchsub-surface: #f8fafc;
  --batchsub-text: #111827;
  --batchsub-bg: linear-gradient(180deg, #164d3f 0%, #90aca4 55%, #e9f8ef 100%);

  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  flex-direction: column;
  background: var(--batchsub-bg);
  color: var(--batchsub-text);
  font-family: var(--family-font-family-default, 'Noto Sans KR', sans-serif);
  font-size: 14px;
  line-height: 20px;
}

.batchsub__header {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  height: 60px;
  padding: 16px 20px;
  color: #fff;
}

.batchsub__title {
  margin: 0;
  overflow: hidden;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batchsub__content {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  padding: 12px;
}

.batchsub__table-card {
  display: flex;
  width: 100%;
  min-height: 0;
  flex-direction: column;
  padding: 10px;
  border: 1px solid var(--batchsub-border);
  border-radius: 8px;
  background: var(--batchsub-surface);
}

.batchsub__grid {
  --base-revo-grid-border-color: var(--batchsub-accent);
  --base-revo-grid-border-width: 1px;
  --base-revo-grid-radius: 6px;
  --base-revo-grid-scroll-color: var(--batchsub-accent);
  --base-revo-grid-vertical-right: -6px;
  --base-revo-grid-horizontal-bottom: -6px;
  --base-revo-grid-horizontal-left: 8px;
  --base-revo-grid-horizontal-width: 42%;
  --base-revo-grid-horizontal-height: 4px;

  width: 100%;
}

.batchsub__grid :deep(.base-revo-grid__viewport) {
  background: #fff;
}

.batchsub__grid :deep(revo-grid) {
  --revo-grid-header-height: 40px;
  --revo-grid-font-family: var(--family-font-family-default, 'Noto Sans KR', sans-serif);
  --revo-grid-font-size: 14px;
  --revo-grid-header-font-size: 14px;
  --revo-grid-header-font-weight: 700;
  --revo-grid-header-text-transform: none;
  --revo-grid-header-text-align: left;
  --revo-grid-header-padding: 0 12px;
  --revo-grid-cell-padding: 0 12px;
  --revo-grid-text: var(--batchsub-text);
  --revo-grid-header-bg: var(--batchsub-accent);

  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.batchsub__grid :deep(.rgHeaderCell) {
  box-sizing: border-box;
  align-items: center;
  padding: 0 12px;
  background: var(--batchsub-accent);
  color: #ffffff;
  font-weight: 700;
}

.batchsub__grid :deep(.rgHeaderCell:not([data-rgcol='0'])),
.batchsub__grid :deep(.rgCell:not([data-rgcol='0'])) {
  border-inline-start: 1px solid var(--batchsub-border);
}

.batchsub__grid :deep(.rgHeaderCell .header-content) {
  text-transform: none;
}

.batchsub__grid :deep(.rgHeaderCell .header-controls) {
  display: none;
}

.batchsub__grid :deep(.rgCell) {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  overflow: hidden;
  border-block-end: 1px solid var(--batchsub-border);
  padding: 0 12px;
  background: #ffffff;
  color: var(--batchsub-text);
}

.batchsub__status,
.batchsub__error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  margin: 0;
  color: #4b5563;
}

.batchsub__footer {
  flex: none;
  padding: 12px;
}

.batchsub__cancel {
  --ds-btn-height: 44px;
  --ds-btn-radius: 8px;
  --ds-btn-font-size: 16px;
  --ds-btn-line-height: 28px;
  --ds-btn-border-color: var(--batchsub-border);
}
</style>
