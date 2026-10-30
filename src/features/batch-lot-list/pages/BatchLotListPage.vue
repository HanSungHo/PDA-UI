<template>
  <BaseScreen
    title="BATCH LOT LIST"
    ok-label="확인"
    cancel-label="취소"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <section class="ds-screen__card" aria-label="Batch search">
      <form class="ds-screen__card-row" @submit.prevent="handleSearch">
        <BaseInput
          :id="BAT_ID_INPUT_ID"
          v-model="batIdInput"
          label="BATCH ID"
          placeholder="Search"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          enterkeyhint="search"
          :disabled="isLoading"
        >
          <template #append>
            <QIcon name="sym_o_search" size="18px" aria-hidden="true" />
          </template>
        </BaseInput>
        <BaseButton variant="secondary" html-type="submit" :disabled="isLoading">조회</BaseButton>
      </form>
    </section>

    <section class="ds-screen__card blp__grid-card" aria-label="Batch lot grid">
      <div v-if="isLoading" class="blp__status" aria-live="polite">
        <BaseLoading size="small" />
        <span>Loading batch lots...</span>
      </div>

      <div v-else-if="lots.length === 0" class="blp__empty">{{ emptyMessage }}</div>

      <BaseRevoGrid
        v-else
        class="blp__grid"
        :rows="lots"
        :columns="columns"
        row-key="lotId"
        :selected-row-key="selectedLotId"
        selected-row-class="blp__row--selected"
        :row-size="40"
        :resize="false"
        :stretch="true"
        aria-label="Batch lot grid"
        @row-select="selectLot(String($event))"
        @cell-double-click="confirmLot(String($event.rowKey))"
        @keydown="handleGridKeydown"
      />
    </section>

    <BaseModal
      :open="isErrorOpen"
      title="에  러"
      :closable="false"
      :overlay-closable="false"
      @after-close="focusBatIdInput"
    >
      <p class="blp__error" role="alert">{{ errorMessage }}</p>
      <template #footer>
        <BaseButton @click="closeError">OK</BaseButton>
      </template>
    </BaseModal>
  </BaseScreen>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { computed, getCurrentInstance, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  BaseButton,
  BaseInput,
  BaseLoading,
  BaseModal,
  BaseRevoGrid,
  BaseScreen,
} from '../../../components/base';
import type { BaseRevoGridColumn } from '../../../components/base/revo-grid';
import { normalizeApiError } from '../../../services/api-error';
import { queryString } from '../../move-out/utils/route-query';
import { defaultBatchLotListContext } from '../mocks/batch-lot-list.mock';
import { fetchBatchLotList } from '../services/batch-lot-list.service';
import { useBatchLotListStore } from '../stores/batch-lot-list.store';
import type {
  BatchLotListItem,
  BatchLotListPageEmits,
  BatchLotListPageProps,
} from '../types/batch-lot-list.types';

const BAT_ID_INPUT_ID = 'batch-lot-list-bat-id';
const SELECT_LOT_MESSAGE = 'LOT을 선택하세요.';

const props = defineProps<BatchLotListPageProps>();
const emit = defineEmits<BatchLotListPageEmits>();

const route = useRoute();
const router = useRouter();
const instance = getCurrentInstance();
const batchLotListStore = useBatchLotListStore();

const columns: BaseRevoGridColumn[] = [
  { prop: 'no', name: 'NO', size: 46 },
  { prop: 'lotId', name: 'LOT No.', size: 180 },
  { prop: 'isDcol', name: 'D', size: 46 },
];

const batIdInput = ref('');
const lots = ref<BatchLotListItem[]>([]);
const selectedLotId = ref('');
const isLoading = ref(false);
const hasSearched = ref(false);
const errorMessage = ref('');
const isErrorOpen = ref(false);

const emptyMessage = computed(() =>
  hasSearched.value
    ? '해당 Batch의 LOT 정보를 찾을 수 없습니다.'
    : 'Batch ID를 입력한 후 조회를 눌러 주세요.',
);

onMounted(() => {
  batIdInput.value = resolveInitialBatId();

  if (batIdInput.value) {
    void loadBatchLots();
    return;
  }

  focusBatIdInput();
});

function resolveInitialBatId(): string {
  if (props.batId) {
    return props.batId;
  }

  return queryString(route, 'batId');
}

async function loadBatchLots(): Promise<void> {
  const batId = batIdInput.value.trim();

  isLoading.value = true;
  selectedLotId.value = '';

  try {
    const response = await fetchBatchLotList({
      batId,
      facility: defaultBatchLotListContext.facility,
    });

    lots.value = response.items;
    hasSearched.value = true;
  } catch (cause: unknown) {
    lots.value = [];
    hasSearched.value = true;
    showError(normalizeApiError(cause).message);
  } finally {
    isLoading.value = false;
  }
}

function handleSearch(): void {
  if (isLoading.value) {
    return;
  }

  void loadBatchLots();
}

function selectLot(lotId: string): void {
  selectedLotId.value = lotId;
}

function handleGridKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleOk();
  }
}

function confirmLot(lotId: string): void {
  emit('confirm', lotId);

  if (!hasListener('onConfirm')) {
    batchLotListStore.complete({ lotId });
    router.back();
  }
}

function handleOk(): void {
  if (!selectedLotId.value) {
    showError(SELECT_LOT_MESSAGE);
    return;
  }

  confirmLot(selectedLotId.value);
}

function handleCancel(): void {
  emit('cancel');

  if (!hasListener('onCancel')) {
    router.back();
  }
}

function hasListener(name: 'onConfirm' | 'onCancel'): boolean {
  return Boolean(instance?.vnode.props?.[name]);
}

function showError(message: string): void {
  errorMessage.value = message;
  isErrorOpen.value = true;
}

function closeError(): void {
  isErrorOpen.value = false;
}

function focusBatIdInput(): void {
  document.getElementById(BAT_ID_INPUT_ID)?.focus();
}
</script>

<style scoped>
.blp__grid-card {
  flex: 1 1 auto;
  min-height: 0;
}

.blp__grid {
  flex: 1 1 auto;
  min-height: 0;
}

.blp__status {
  display: flex;
  align-items: center;
  gap: var(--spacing-space-1, 8px);
  color: var(--text-text-secondary, #4a5565);
}

.blp__empty {
  display: grid;
  flex: 1 1 auto;
  place-items: center;
  width: 100%;
  color: var(--text-text-secondary, #4a5565);
  text-align: center;
}

.blp__grid :deep(.rgHeaderCell),
.blp__grid :deep(.rgCell) {
  box-sizing: border-box;
  padding: var(--spacing-space-1, 8px) var(--spacing-space-2, 12px);
}

.blp__grid :deep(.rgHeaderCell) {
  height: 40px;
  border-inline-end: 1px solid var(--border-border-secondary, #f3f4f6);
  background: var(--background-background-brand, #02b0a5);
  color: var(--text-text-white, #f9fafb);
  font-size: 14px;
  font-weight: 600;
  text-align: start;
}

.blp__grid :deep(.rgHeaderCell .header-content) {
  text-align: start;
  text-transform: none;
}

.blp__grid :deep(.rgHeaderCell[aria-colindex='3']),
.blp__grid :deep(.rgCell[aria-colindex='3']) {
  text-align: center;
}

.blp__grid :deep(.blp__row--selected .rgCell) {
  background: var(--teal-50, #f0fdfc);
}

.blp__error {
  margin: 0;
}
</style>
