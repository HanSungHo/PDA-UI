<template>
  <main class="blp">
    <header class="blp__header">
      <h1 id="batch-lot-list-title" class="blp__title">BATCH LOT LIST</h1>
    </header>

    <div class="blp__container">
      <section class="blp__card blp__search-card" :aria-labelledby="`${BAT_ID_INPUT_ID}-label`">
        <form class="blp__search-row" @submit.prevent="handleSearch">
          <BaseInput
            :id="BAT_ID_INPUT_ID"
            v-model="batIdInput"
            class="blp__search-input"
            label="BATCH ID"
            placeholder="Search"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            enterkeyhint="search"
            :disabled="isLoading"
          >
            <template #append>
              <QIcon name="sym_o_search" class="blp__search-icon" aria-hidden="true" />
            </template>
          </BaseInput>
          <BaseButton
            class="blp__btn blp__btn--search"
            variant="secondary"
            size="medium"
            html-type="submit"
            :disabled="isLoading"
          >
            조회
          </BaseButton>
        </form>
      </section>

      <section class="blp__card blp__grid-card" aria-label="Batch lot grid">
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
    </div>

    <footer class="blp__footer">
      <BaseButton class="blp__btn blp__btn--action" @click="handleOk">확인</BaseButton>
      <BaseButton class="blp__btn blp__btn--action" variant="tertiary" @click="handleCancel">
        취소
      </BaseButton>
    </footer>

    <BaseModal
      :open="isErrorOpen"
      title="에  러"
      :closable="false"
      :overlay-closable="false"
      @after-close="focusBatIdInput"
    >
      <p class="blp__error" role="alert">{{ errorMessage }}</p>
      <template #footer>
        <BaseButton class="blp__btn blp__btn--action" @click="closeError">OK</BaseButton>
      </template>
    </BaseModal>
  </main>
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
/* Figma frame "activity_batch_lot_list", authored at 360x720; values are used 1:1. */
.blp {
  --blp-accent: #02b0a5;
  --blp-accent-strong: #019a90;
  --blp-on-accent: #f0fdfc;
  --blp-surface: #f9fafb;
  --blp-surface-raised: #ffffff;
  --blp-border: #d1d5dc;
  --blp-border-on-accent: #f3f4f6;
  --blp-text: #030712;
  --blp-text-strong: #101828;
  --blp-text-muted: #4a5565;
  --blp-text-inverse: #f9fafb;
  --blp-row-selected: #f0fdfc;
  --blp-bg: linear-gradient(180deg, #1c493a 0%, #96b1a8 53.85%, #ecf8f1 100%);
  --blp-shadow: 0 8px 24px rgb(13 20 31 / 6%);
  --blp-space: 12px;
  --blp-radius: 8px;
  --blp-control-height: 40px;
  --blp-row-height: 40px;

  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--blp-bg);
  color: var(--blp-text);
  font-family: var(--font-family-default, 'Noto Sans KR', sans-serif);
  font-size: 14px;
  line-height: 20px;
}

/* Header: 360x60, padding 16, gap 16 */
.blp__header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  padding: 16px;
  color: var(--blp-text-inverse);
}

.blp__title {
  margin: 0;
  overflow: hidden;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Container: padding 12, gap 16, fills the space between header and bottom bar */
.blp__container {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  gap: 16px;
  padding: var(--blp-space);
}

.blp__card {
  box-sizing: border-box;
  padding: var(--blp-space);
  border: 1px solid var(--blp-border);
  border-radius: var(--blp-radius);
  background: var(--blp-surface);
  box-shadow: var(--blp-shadow);
}

/* Card Product Info: 92px tall, row aligned to the bottom edge */
.blp__search-card {
  flex: none;
}

.blp__search-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.blp__search-input {
  flex: 1 1 auto;
  min-width: 0;
}

.blp__search-icon {
  font-size: 20px;
  color: var(--blp-text-muted);
}

/* Buttons are BaseButton; the design's sizes and colours are fed through its tokens */
.blp__btn {
  --ds-btn-accent: var(--blp-accent);
  --ds-btn-accent-strong: var(--blp-accent-strong);
  --ds-btn-on-accent: var(--blp-on-accent);
  --ds-btn-radius: var(--blp-radius);
}

.blp__btn:focus-visible {
  outline-color: var(--blp-accent);
}

/* Search: 72x40 in the frame; min-width so the 1px border never clips the label */
.blp__btn--search {
  --ds-btn-height: var(--blp-control-height);
  --ds-btn-padding-x: 12px;
  --ds-btn-font-size: 14px;
  --ds-btn-line-height: 20px;

  flex: none;
  min-width: 72px;
}

/* OK / Cancel: 44px tall, padding 16, 16/28 label; Cancel border is the design grey */
.blp__btn--action {
  --ds-btn-height: 44px;
  --ds-btn-padding-x: 16px;
  --ds-btn-font-size: 16px;
  --ds-btn-line-height: 28px;

  flex: 1 1 0;
}

.blp__btn--action.ds-btn--tertiary {
  --ds-btn-border-color: var(--blp-border);
}

/* Process Table card grows; the list inside scrolls */
.blp__grid-card {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
}

.blp__status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: var(--blp-space);
  color: var(--blp-text-muted);
}

.blp__grid {
  --base-revo-grid-border-color: var(--blp-accent);
  --base-revo-grid-border-width: 1px;
  --base-revo-grid-radius: 6px;
  --base-revo-grid-scroll-color: var(--blp-accent);

  flex: 1 1 auto;
  min-height: 0;
}

.blp__grid :deep(revo-grid) {
  --revo-grid-header-height: 40px;
  --revo-grid-font-family: var(--font-family-default, 'Noto Sans KR', sans-serif);
  --revo-grid-font-size: 14px;
  --revo-grid-header-bg: var(--blp-accent);

  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.blp__grid :deep(.rgHeaderCell) {
  box-sizing: border-box;
  align-items: center;
  padding: 0 12px;
  border-inline-end: 1px solid var(--blp-border-on-accent);
  background: var(--blp-accent);
  color: var(--blp-text-inverse);
  font-size: 14px;
  font-weight: 600;
  text-align: start;
}

.blp__grid :deep(.rgHeaderCell .header-content) {
  text-align: start;
  text-transform: none;
}

.blp__grid :deep(.rgHeaderCell .header-controls) {
  display: none;
}

.blp__grid :deep(.rgHeaderCell[aria-colindex='3']),
.blp__grid :deep(.rgCell[aria-colindex='3']) {
  text-align: center;
}

.blp__grid :deep(.rgCell) {
  box-sizing: border-box;
  overflow: hidden;
  padding: 9px 12px;
  border-inline-end: 1px solid var(--blp-border);
  border-block-end: 1px solid var(--blp-border);
  background: var(--blp-surface-raised);
  color: var(--blp-text);
  font-size: 14px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.blp__grid :deep(.rgCell:focus-visible) {
  outline: 2px solid var(--blp-accent);
  outline-offset: -2px;
}

.blp__grid :deep(.blp__row--selected .rgCell) {
  background: var(--blp-row-selected);
}

.blp__empty {
  display: grid;
  flex: 1 1 auto;
  min-height: 0;
  place-items: center;
  padding: 16px 12px;
  color: var(--blp-text-muted);
  text-align: center;
}

/* Bottom: 360x68, padding 12, buttons gap 8 */
.blp__footer {
  flex: none;
  display: flex;
  gap: 8px;
  padding: var(--blp-space);
}

.blp__error {
  margin: 0;
}
</style>
