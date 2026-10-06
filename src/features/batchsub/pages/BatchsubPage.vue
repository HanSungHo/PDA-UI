<template>
  <main class="batchsub">
    <header class="batchsub__header">
      <BaseButton
        class="batchsub__back"
        variant="link"
        size="xs"
        icon-only
        aria-label="Go back"
        @click="cancel"
      >
        <ArrowLeftOutlined aria-hidden="true" />
      </BaseButton>
      <h1 data-testid="batchsub-title" class="batchsub__title">子 BATCH LIST</h1>
    </header>

    <section class="batchsub__content" aria-label="Batchsub grid">
      <div class="batchsub__table-card">
        <div v-if="isLoading" class="batchsub__status" aria-live="polite">
          <BaseLoading size="small" />
        </div>

        <p v-else-if="hasError" class="batchsub__error" role="alert">{{ errorMessage }}</p>

        <div v-else class="batchsub__table-wrap">
          <table class="batchsub__table" role="grid" aria-label="子 BATCH LIST">
            <thead>
              <tr>
                <th
                  v-for="column in columns"
                  :key="column.key"
                  :class="`batchsub__cell--${column.key}`"
                >
                  {{ column.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in items"
                :key="item.no"
                :data-testid="`batchsub-row-${index}`"
                tabindex="0"
                @click="sendjalotname(item.Jalotname)"
                @keydown.enter.prevent="sendjalotname(item.Jalotname)"
              >
                <td
                  v-for="column in columns"
                  :key="column.key"
                  :class="`batchsub__cell--${column.key}`"
                >
                  {{ item[column.key] }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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
import { ArrowLeftOutlined } from '@ant-design/icons-vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { BaseButton } from '../../../components/base/button';
import { BaseLoading } from '../../../components/base/loading';
import { DeviceInfo } from '../../../constants/deviceinfo';
import { normalizeApiError } from '../../../services/api-error';
import { fetchBatchsubList } from '../services/batchsub.service';
import { useBatchsubStore } from '../stores/batchsub.store';
import type { BatchsubColumn, BatchsubItem } from '../types/batchsub.types';

const route = useRoute();
const router = useRouter();
const batchsubStore = useBatchsubStore();

const psbatchid = ref('');
const returnlotname = ref('');
const items = ref<BatchsubItem[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');

const columns: BatchsubColumn[] = [
  { key: 'no', label: 'No' },
  { key: 'batchId', label: 'BATCH ID' },
  { key: 'Jalotname', label: 'LOT No.' },
];

const hasError = computed(() => errorMessage.value !== '');

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
  gap: 14px;
  height: 60px;
  padding: 16px 20px;
  color: #fff;
}

.batchsub__back {
  --ds-btn-fg: #fff;
  --ds-btn-accent: #fff;
  --ds-btn-accent-strong: #fff;
  --ds-btn-height: 24px;
  --ds-btn-icon-size: 22px;
  --ds-btn-radius: 4px;
}

.batchsub__back:hover,
.batchsub__back:active {
  --ds-btn-fg: #fff;
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

.batchsub__table-wrap {
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--batchsub-accent);
  border-radius: 6px;
  background: #fff;
  scrollbar-color: var(--batchsub-accent) transparent;
  scrollbar-width: thin;
}

.batchsub__table-wrap::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.batchsub__table-wrap::-webkit-scrollbar-thumb {
  border-radius: 99px;
  background: var(--batchsub-accent);
}

.batchsub__table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.batchsub__table th,
.batchsub__table td {
  box-sizing: border-box;
  height: 40px;
  padding: 10px 12px;
  border-right: 1px solid var(--batchsub-border);
  border-bottom: 1px solid var(--batchsub-border);
  text-align: left;
  white-space: nowrap;
}

.batchsub__table th {
  position: sticky;
  top: 0;
  z-index: 1;
  border-color: #dff7f5;
  background: var(--batchsub-accent);
  color: #fff;
  font-weight: 700;
}

.batchsub__table td {
  background: #fff;
}

.batchsub__table th:last-child,
.batchsub__table td:last-child {
  border-right: 0;
}

.batchsub__table tbody tr:last-child td {
  border-bottom: 0;
}

.batchsub__table tbody tr {
  cursor: pointer;
}

.batchsub__table tbody tr:focus-visible {
  outline: 2px solid var(--batchsub-accent);
  outline-offset: -2px;
}

.batchsub__cell--no {
  width: 42px;
}

.batchsub__cell--batchId {
  width: 43%;
}

.batchsub__cell--Jalotname {
  width: 57%;
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
