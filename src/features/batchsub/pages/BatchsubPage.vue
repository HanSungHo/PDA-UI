<template>
  <BaseScreen class="batchsub" title="子 BATCH LIST">
    <section class="ds-screen__card batchsub__table-card" aria-label="Batchsub grid">
      <div v-if="isLoading" class="batchsub__status" aria-live="polite">
        <BaseLoading size="small" />
      </div>

      <p v-else-if="hasError" class="batchsub__error" role="alert">{{ errorMessage }}</p>

      <div v-else-if="items.length === 0" class="batchsub__empty">
        <BaseEmptyState />
      </div>

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
    </section>

    <template #footer>
      <BaseButton data-testid="batchsub-cancel" variant="tertiary" size="medium" @click="cancel">
        취소
      </BaseButton>
    </template>
  </BaseScreen>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { BaseButton } from '../../../components/base/button';
import { BaseEmptyState } from '../../../components/base/empty-state';
import { BaseLoading } from '../../../components/base/loading';
import type { BaseRevoGridColumn, BaseRevoGridKey } from '../../../components/base/revo-grid';
import { BaseRevoGrid } from '../../../components/base/revo-grid';
import { BaseScreen } from '../../../components/base/screen';
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
  { prop: 'no', name: 'No', size: 80 },
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
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.batchsub__table-card {
  flex: 1;
  min-height: 124px;
}

.batchsub__empty,
.batchsub__status,
.batchsub__error {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin: 0;
}

.batchsub__grid {
  min-height: 80px;
}
</style>
