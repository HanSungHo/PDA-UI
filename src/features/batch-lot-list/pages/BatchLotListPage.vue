<template>
  <main class="blp">
    <header class="blp__header">
      <BaseButton
        class="blp__back"
        variant="link"
        size="xs"
        icon-only
        aria-label="Go back"
        @click="handleCancel"
      >
        <ArrowLeftOutlined aria-hidden="true" />
      </BaseButton>
      <h1 id="batch-lot-list-title" class="blp__title">BATCH LOT LIST</h1>
    </header>

    <div class="blp__container">
      <section class="blp__card blp__search-card" :aria-labelledby="`${BAT_ID_INPUT_ID}-label`">
        <form class="blp__search-row" @submit.prevent="handleSearch">
          <div class="blp__field">
            <label :id="`${BAT_ID_INPUT_ID}-label`" :for="BAT_ID_INPUT_ID" class="blp__label">
              Batch ID
            </label>
            <span class="blp__input-wrap">
              <input
                :id="BAT_ID_INPUT_ID"
                v-model="batIdInput"
                class="blp__input"
                type="text"
                placeholder="조회"
                autocomplete="off"
                autocapitalize="characters"
                spellcheck="false"
                enterkeyhint="search"
                :disabled="isLoading"
              />
              <SearchOutlined class="blp__input-icon" aria-hidden="true" />
            </span>
          </div>
          <BaseButton
            class="blp__btn blp__btn--search"
            variant="secondary"
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

        <div v-else class="blp__grid-wrap">
          <table
            class="blp__grid"
            role="grid"
            aria-multiselectable="false"
            aria-labelledby="batch-lot-list-title"
          >
            <thead>
              <tr>
                <th
                  v-for="column in columns"
                  :key="column.key"
                  scope="col"
                  :class="`blp__cell--${column.key}`"
                >
                  {{ column.label }}
                </th>
              </tr>
            </thead>
            <tbody @keydown="handleGridKeydown">
              <tr
                v-for="lot in lots"
                :key="lot.lotId"
                :class="{ 'is-selected': lot.lotId === selectedLotId }"
                :aria-selected="lot.lotId === selectedLotId"
                tabindex="0"
                @click="selectLot(lot.lotId)"
                @dblclick="confirmLot(lot.lotId)"
                @focus="selectLot(lot.lotId)"
              >
                <td v-for="column in columns" :key="column.key" :class="`blp__cell--${column.key}`">
                  {{ lot[column.key] }}
                </td>
              </tr>
              <tr v-if="lots.length === 0" class="blp__empty">
                <td :colspan="columns.length">{{ emptyMessage }}</td>
              </tr>
            </tbody>
          </table>
        </div>
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
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons-vue';
import { computed, getCurrentInstance, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { BaseButton, BaseLoading, BaseModal } from '../../../components/base';
import { normalizeApiError } from '../../../services/api-error';
import { queryString } from '../../move-out/utils/route-query';
import { defaultBatchLotListContext } from '../mocks/batch-lot-list.mock';
import { fetchBatchLotList } from '../services/batch-lot-list.service';
import { useBatchLotListStore } from '../stores/batch-lot-list.store';
import type {
  BatchLotListColumn,
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

const columns: BatchLotListColumn[] = [
  { key: 'no', label: 'NO' },
  { key: 'lotId', label: 'LOT No.' },
  { key: 'isDcol', label: 'D' },
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
  const row = event.target instanceof HTMLElement ? event.target.closest('tr') : null;

  if (!row) {
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    handleOk();
    return;
  }

  const sibling =
    event.key === 'ArrowDown'
      ? row.nextElementSibling
      : event.key === 'ArrowUp'
        ? row.previousElementSibling
        : null;

  if (sibling instanceof HTMLElement && sibling.hasAttribute('tabindex')) {
    event.preventDefault();
    sibling.focus();
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
  font-family: var(--family-font-family-default, 'Noto Sans KR', sans-serif);
  font-size: 14px;
  line-height: 20px;
}

/* Header: 360x60, padding 16, gap 16 */
.blp__header {
  flex: none;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 60px;
  padding: 16px;
  color: var(--blp-text-inverse);
}

/* Back: BaseButton link/icon-only, 24px glyph in the header colour */
.blp__back {
  --ds-btn-accent: var(--blp-text-inverse);
  --ds-btn-accent-strong: var(--blp-text-inverse);
  --ds-btn-height: 24px;
  --ds-btn-icon-size: 24px;
  --ds-btn-radius: 4px;
}

.blp__back:focus-visible {
  outline-color: var(--blp-text-inverse);
}

.blp__title {
  flex: 1 1 auto;
  margin: 0;
  overflow: hidden;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
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

.blp__field {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.blp__label {
  height: 20px;
  font-weight: 500;
}

.blp__input-wrap {
  position: relative;
  display: block;
}

.blp__input {
  box-sizing: border-box;
  width: 100%;
  height: var(--blp-control-height);
  padding: 8px 36px 8px 12px;
  border: 1px solid var(--blp-border);
  border-radius: var(--blp-radius);
  background: var(--blp-surface-raised);
  color: var(--blp-text);
  font: inherit;
  text-transform: uppercase;
}

.blp__input::placeholder {
  color: var(--blp-text-muted);
  text-transform: none;
}

.blp__input:focus-visible {
  outline: 2px solid var(--blp-accent);
  outline-offset: -1px;
}

.blp__input:disabled {
  color: var(--blp-text-muted);
}

.blp__input-icon {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  color: var(--blp-text);
  font-size: 16px;
  pointer-events: none;
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

/* Table List: white, 1px accent border, radius 6; the wrapper is the only outer edge */
.blp__grid-wrap {
  box-sizing: border-box;
  min-height: 0;
  overflow: auto;
  isolation: isolate;
  border: 1px solid var(--blp-accent);
  border-radius: 6px;
  background: var(--blp-surface-raised);
  overscroll-behavior: contain;
  scrollbar-color: var(--blp-accent) transparent;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
}

.blp__grid-wrap::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.blp__grid-wrap::-webkit-scrollbar-thumb {
  border-radius: 99px;
  background: var(--blp-accent);
}

/* Cells own only their right/bottom edges, like the frame's -1px overlapped borders */
.blp__grid {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.blp__grid th,
.blp__grid td {
  box-sizing: border-box;
  height: var(--blp-row-height);
  padding: 12px;
  border-right: 1px solid var(--blp-border);
  border-bottom: 1px solid var(--blp-border);
  text-align: start;
  white-space: nowrap;
}

.blp__grid th {
  position: sticky;
  top: 0;
  z-index: 1;
  border-color: var(--blp-border-on-accent);
  background: var(--blp-accent);
  color: var(--blp-text-inverse);
  font-weight: 600;
}

.blp__grid td {
  background: var(--blp-surface-raised);
}

.blp__grid th:last-child,
.blp__grid td:last-child {
  border-right: 0;
}

.blp__grid tbody tr:last-child td {
  border-bottom: 0;
}

/* NO and D hug their content (frame: 46 = 22 text + 24 padding); LOT NO takes the rest */
.blp__cell--no,
.blp__cell--isDcol {
  width: 1%;
}

.blp__cell--lotId {
  width: 100%;
  max-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.blp__grid tbody tr[tabindex] {
  cursor: pointer;
}

.blp__grid tbody tr[tabindex]:focus-visible {
  outline: 2px solid var(--blp-accent);
  outline-offset: -2px;
}

.blp__grid tbody tr.is-selected td {
  background: var(--blp-row-selected);
}

.blp__empty td {
  padding: 16px 12px;
  color: var(--blp-text-muted);
  text-align: center;
  white-space: normal;
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
