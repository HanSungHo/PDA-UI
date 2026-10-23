<template>
  <main class="een-setting-page">
    <section class="een-setting-shell" aria-labelledby="een-setting-title">
      <header class="een-setting-header">
        <h1 id="een-setting-title">EEN 설정</h1>
      </header>

      <div class="een-setting-content">
        <section class="een-setting-summary" aria-label="LOT 정보">
          <div class="een-setting-field">
            <span class="een-setting-label">LOT No.</span>
            <output data-field="lotId">{{ context.lotId }}</output>
          </div>
          <div class="een-setting-field">
            <span class="een-setting-label">Route</span>
            <output data-field="route">{{ context.route }}</output>
          </div>
          <div class="een-setting-field">
            <span class="een-setting-label">현재공정</span>
            <output data-field="operation">{{ context.operation }}</output>
          </div>
          <output class="een-setting-process-step" data-field="processStep">
            {{ context.processStep }}
          </output>
          <div class="een-setting-field een-setting-field--product">
            <span class="een-setting-label">제품명</span>
            <output data-field="product">{{ context.product }}</output>
          </div>
        </section>

        <section class="een-setting-table-card" aria-label="EEN 목록">
          <BaseRevoGrid
            v-if="items.length > 0"
            class="een-setting-grid"
            data-testid="een-setting-grid"
            :rows="items"
            :columns="columns"
            row-key="id"
            :selected-row-key="selectedItem?.id"
            selected-row-class="een-setting-row--selected"
            :row-size="40"
            :resize="false"
            @row-select="handleGridRowSelect"
          />
          <p v-else class="een-setting-empty" role="status">
            {{ isLoading ? '조회 중...' : '조회된 EEN 정보가 없습니다.' }}
          </p>
        </section>
      </div>

      <footer class="een-setting-footer" aria-label="EEN 작업">
        <BaseButton
          class="een-setting-action een-setting-action--primary"
          variant="primary"
          size="large"
          :disabled="isLoading || !selectedItem"
          @click="openAdd"
        >
          추가
        </BaseButton>
        <BaseButton
          class="een-setting-action een-setting-action--secondary"
          variant="secondary"
          size="large"
          :disabled="isLoading || !selectedItem"
          @click="openModify"
        >
          수정
        </BaseButton>
        <BaseButton
          class="een-setting-action een-setting-action--secondary"
          variant="secondary"
          size="large"
          :disabled="isLoading || !selectedItem"
          @click="openDelete"
        >
          삭제
        </BaseButton>
        <BaseButton
          class="een-setting-action"
          variant="tertiary"
          size="large"
          aria-label="닫기"
          @click="closePage"
        >
          닫기
        </BaseButton>
      </footer>
    </section>
  </main>

  <BaseModal
    :open="dialog.open"
    :title="dialog.title"
    :closable="false"
    :overlay-closable="false"
    @update:open="dialog.open = $event"
  >
    <p class="een-setting-dialog-message">{{ dialog.message }}</p>
    <template #footer>
      <BaseButton @click="dialog.open = false">확인</BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { BaseButton, BaseModal, BaseRevoGrid } from '~/components/base';
import type { BaseRevoGridColumn } from '~/components/base/revo-grid';
import { COMMON_FIELD } from '~/constants/common-strings';
import { ROUTE } from '~/constants/routes.ts';
import { useEenAddStore } from '~/features/een-add/stores/een-add.store';
import { useMainStore } from '~/features/main/stores/main.store';

import { defaultEENSettingContext } from '../mocks/een-setting.mock';
import { fetchEENSettingItems } from '../services/een-setting.service';
import { useEENSettingResultStore } from '../stores/een-setting-result.store';
import type { EENSettingContext, EENSettingItem } from '../types/een-setting.types';

const route = useRoute();
const router = useRouter();
const addStore = useEenAddStore();
const resultStore = useEENSettingResultStore();
const mainStore = useMainStore();
const isLoading = ref(false);
const items = ref<EENSettingItem[]>([]);
const selectedItemId = ref<string>();
const dialog = reactive({ open: false, title: '', message: '' });
const context = computed<EENSettingContext>(() => ({
  lotId: queryValue('lotId') || defaultEENSettingContext.lotId,
  factoryName: queryValue('factoryName') || defaultEENSettingContext.factoryName,
  route: queryValue('route') || defaultEENSettingContext.route,
  operation: queryValue('operation') || defaultEENSettingContext.operation,
  processStep: queryValue('processStep') || defaultEENSettingContext.processStep,
  product: queryValue('product') || defaultEENSettingContext.product,
  facility: queryValue('facility') || defaultEENSettingContext.facility,
}));
const selectedItem = computed(() => items.value.find(({ id }) => id === selectedItemId.value));
const columns: BaseRevoGridColumn[] = [
  { prop: 'processName', name: '공정명', size: 153 },
  { prop: 'tagComment', name: 'TAGCOMMENT', size: 160 },
  { prop: 'actionPoint', name: 'ACTIONPOINT' },
  { prop: 'createTime', name: 'CREATETIME' },
  { prop: 'createUser', name: 'CREATEUSER' },
  { prop: 'confirmUser', name: 'CONFIRMUSER' },
  { prop: 'confirmTime', name: 'CONFIRMTIME' },
];

onMounted(() => void getEENInfo());

function queryValue(key: string): string {
  const value = route.query[key];
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

async function getEENInfo(): Promise<void> {
  if (isLoading.value) return;

  isLoading.value = true;
  const addedResult = addStore.consumeSettingResult(context.value.lotId) ?? undefined;
  const modifiedResult = resultStore.consumeModifyResult(context.value.lotId) ?? undefined;

  try {
    const response = await fetchEENSettingItems({
      lotId: context.value.lotId,
      facility: mainStore.facility || context.value.facility,
      addedResult,
      modifiedResult,
    });
    if (!response.success) {
      items.value = [];
      selectedItemId.value = undefined;
      showErrorDialog(response.message);
      return;
    }

    items.value = response.data;
    const addedItem = addedResult
      ? [...items.value]
          .reverse()
          .find(
            (item) =>
              item.operation === addedResult.operation &&
              item.tagId === addedResult.tagId &&
              item.tagComment === addedResult.tagComment,
          )
      : undefined;
    const preferredItem = addedItem ?? modifiedResult?.item;
    selectedItemId.value =
      items.value.find(({ id }) => id === preferredItem?.id)?.id ??
      items.value.find(
        ({ processOperationName }) => processOperationName === context.value.operation,
      )?.id ??
      items.value[0]?.id;
  } catch (error) {
    items.value = [];
    selectedItemId.value = undefined;
    showErrorDialog(error instanceof Error ? error.message : 'EEN 목록 조회에 실패하였습니다.');
  } finally {
    isLoading.value = false;
  }
}

function showErrorDialog(message: string): void {
  dialog.title = COMMON_FIELD.TXTDIALOGTITLE_ERROR;
  dialog.message = message;
  dialog.open = true;
}

function handleGridRowSelect(rowKey: string | number): void {
  selectedItemId.value = String(rowKey);
}

function openAdd(): void {
  const item = selectedItem.value;
  if (!item) return;

  void router.push({
    path: `/${ROUTE.eenAdd}`,
    query: {
      LOTID: context.value.lotId,
      FACTORYNAME: item.factoryName,
      PRODUCT: item.product,
      ROUTE: context.value.route,
      OPERATION: context.value.operation,
      PROCESSSTEP: '',
      source: ROUTE.eenSetting,
      mock: 'een-add',
    },
  });
}

function openModify(): void {
  const item = selectedItem.value;
  if (!item) return;

  void router.push({
    path: `/${ROUTE.eenModify}`,
    query: {
      itemId: item.id,
      lotId: context.value.lotId,
      factoryName: item.factoryName,
      facility: item.factoryName,
      product: item.product,
      route: item.route,
      operation: item.operation,
    },
  });
}

function openDelete(): void {
  const item = selectedItem.value;
  if (!item) return;

  void router.push({
    path: `/${ROUTE.eenDelete}`,
    query: {
      itemId: item.id,
      lotId: context.value.lotId,
      factoryName: item.factoryName || context.value.factoryName,
      facility: item.factoryName || context.value.facility,
      product: item.product || context.value.product,
      route: item.route || context.value.route,
      operation: item.operation || context.value.operation,
      eenId: item.eenId,
      tagComment: item.tagComment,
      actionPoint: item.actionPoint,
      tagId: item.tagId,
      poDesc: item.poDesc,
    },
  });
}
function closePage(): void {
  void router.push({
    path: `/${ROUTE.esheet}`,
    query: context.value.lotId ? { lotId: context.value.lotId } : undefined,
  });
}
</script>

<style scoped>
.een-setting-page {
  box-sizing: border-box;
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  background: #d1d5dc;
  font-family: 'Noto Sans KR', sans-serif;
}

.een-setting-page *,
.een-setting-page *::before,
.een-setting-page *::after {
  box-sizing: border-box;
}

.een-setting-shell {
  display: flex;
  width: 100%;
  min-height: 872px;
  flex-direction: column;
  color: #101828;
  background: linear-gradient(180deg, #1c493a 0%, #96b1a8 53.85%, #ecf8f1 100%);
}

.een-setting-header {
  display: flex;
  height: 60px;
  flex: 0 0 60px;
  align-items: center;
  justify-content: center;
  padding-inline: 16px;
  color: #f9fafb;
}

.een-setting-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
  letter-spacing: 0;
}

.een-setting-table-scroll:focus-visible,
.een-setting-table tr:focus-visible {
  outline: 3px solid #173d32;
  outline-offset: 2px;
}

.een-setting-content {
  display: flex;
  height: 744px;
  flex: 1 1 744px;
  flex-direction: column;
  gap: 16px;
  padding: 12px;
}

.een-setting-summary,
.een-setting-table-card {
  border: 1px solid #d1d5dc;
  border-radius: 8px;
  background: #f9fafb;
  box-shadow: 0 8px 24px rgb(13 20 31 / 6%);
}

.een-setting-summary {
  display: grid;
  min-height: 244px;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: repeat(3, 68px);
  gap: 8px;
  padding: 12px 11px;
}

.een-setting-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--spacing-space-1, 8px);
}

.een-setting-label {
  min-height: 20px;
  color: #030712;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.een-setting-field output,
.een-setting-process-step {
  display: flex;
  min-width: 0;
  height: 40px;
  align-items: center;
  overflow: hidden;
  padding-inline: 12px;
  border: 1px solid #d1d5dc;
  border-radius: var(--ds-radius-sm, 4px);
  color: #344054;
  background: #fff;
  font-size: 16px;
  line-height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.een-setting-process-step {
  align-self: end;
}

.een-setting-field--product {
  grid-column: 1 / -1;
}

.een-setting-field--product output {
  width: 100%;
}

.een-setting-table-card {
  position: relative;
  display: flex;
  min-height: 460px;
  flex: 1 1 460px;
  flex-direction: column;
  padding: 10px;
}

.een-setting-grid {
  --base-revo-grid-radius: 6px;
  --base-revo-grid-vertical-right: -8px;
  --base-revo-grid-vertical-width: 4px;
  --base-revo-grid-vertical-height: 120px;
  --base-revo-grid-horizontal-bottom: 6px;
  --base-revo-grid-horizontal-left: 8px;
  --base-revo-grid-horizontal-width: 44%;
  --base-revo-grid-horizontal-height: 8px;

  position: relative;
  width: 100%;
  min-height: 0;
  flex: 1;
}

.een-setting-grid :deep(.base-revo-grid__viewport) {
  border-radius: 6px;
}

.een-setting-grid :deep(.base-revo-grid__scroll-indicator--vertical) {
  display: none;
}

.een-setting-grid :deep(revo-grid) {
  --revo-grid-header-height: 40px;
  --revo-grid-font-family: 'Noto Sans KR', sans-serif;
  --revo-grid-font-size: 13px;
  --revo-grid-header-font-size: 13px;
  --revo-grid-header-font-weight: 700;
  --revo-grid-header-text-transform: none;
  --revo-grid-header-text-align: left;
  --revo-grid-header-padding: 0 12px;
  --revo-grid-cell-padding: 12px;
  --revo-grid-text: #344054;
  --revo-grid-header-bg: #02b0a5;

  display: block;
  width: calc(100% + 2px);
  height: calc(100% + 2px);
  border: 0;
}

.een-setting-grid :deep(.rgHeaderCell) {
  box-sizing: border-box;
  align-items: center;
  border-inline-end: 1px solid #f9fafb;
  color: #f9fafb;
  background: #02b0a5;
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
  padding: 0 12px;
}

.een-setting-grid :deep(.rgHeaderCell .header-content) {
  display: flex;
  height: 20px;
  align-items: center;
  top: 50%;
  bottom: auto;
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
  line-height: 20px;
  transform: translateY(-50%);
}

.een-setting-grid :deep(.rgHeaderCell .header-controls) {
  display: none;
}

.een-setting-grid :deep(.rgCell) {
  box-sizing: border-box;
  overflow: hidden;
  border-inline-end: 1px solid #d1d5dc;
  border-block-end: 1px solid #d1d5dc;
  padding: 12px;
  background: #fff;
  font-size: 13px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.een-setting-grid :deep(.een-setting-row--selected .rgCell) {
  background: #effcfb;
}

.een-setting-empty {
  display: grid;
  min-height: 80px;
  flex: 1;
  place-items: center;
  margin: 0;
  color: #667085;
  font-size: 14px;
}

.een-setting-dialog-message {
  margin: 0;
  white-space: pre-line;
}

.een-setting-footer {
  display: grid;
  width: min(100%, 360px);
  height: 68px;
  flex: 0 0 68px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-inline: auto;
  padding: 12px;
}

.een-setting-action {
  min-width: 0;
  font-weight: 700;
}

.een-setting-action--secondary {
  background: transparent;
}

@media (max-width: 359px) {
  .een-setting-summary {
    gap: 0 6px;
    padding: 10px;
  }
}
</style>
