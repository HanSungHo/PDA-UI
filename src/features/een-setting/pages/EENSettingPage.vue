<template>
  <BaseScreen title="EEN 설정" class="een-setting">
    <section class="ds-screen__card" aria-label="LOT 정보">
      <BaseInput data-field="lotId" label="LOT No." :model-value="context.lotId" readonly />
      <BaseInput data-field="route" label="Route" :model-value="context.route" readonly />
      <BaseInput
        data-field="operation"
        label="현재공정"
        :model-value="context.operation"
        readonly
      />
      <!-- Android txt_process_step has no caption; it shows the current process description. -->
      <BaseInput
        data-field="processStep"
        aria-label="현재공정 설명"
        :model-value="context.processStep"
        readonly
      />
      <BaseInput data-field="product" label="제품명" :model-value="context.product" readonly />
    </section>

    <section class="ds-screen__card een-setting__table" aria-label="EEN 목록">
      <BaseRevoGrid
        v-if="items.length > 0"
        class="een-setting__grid"
        data-testid="een-setting-grid"
        :rows="items"
        :columns="columns"
        row-key="id"
        :selected-row-key="selectedItem?.id"
        selected-row-class="een-setting-row--selected"
        :row-size="40"
        :resize="false"
        accessible-label="EEN 목록"
        @row-select="handleGridRowSelect"
      />
      <p v-else class="een-setting__empty" role="status">
        {{ isLoading ? '조회 중...' : '조회된 EEN 정보가 없습니다.' }}
      </p>
    </section>

    <template #footer>
      <BaseButton
        class="een-setting-action een-setting-action--primary"
        variant="primary"
        size="medium"
        :disabled="isLoading || !selectedItem"
        @click="openAdd"
      >
        추가
      </BaseButton>
      <BaseButton
        class="een-setting-action"
        variant="secondary"
        size="medium"
        :disabled="isLoading || !selectedItem"
        @click="openModify"
      >
        수정
      </BaseButton>
      <BaseButton
        class="een-setting-action"
        variant="secondary"
        size="medium"
        :disabled="isLoading || !selectedItem"
        @click="openDelete"
      >
        삭제
      </BaseButton>
      <BaseButton
        class="een-setting-action"
        variant="tertiary"
        size="medium"
        aria-label="닫기"
        @click="closePage"
      >
        닫기
      </BaseButton>
    </template>
  </BaseScreen>

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

import { BaseButton, BaseInput, BaseModal, BaseRevoGrid, BaseScreen } from '~/components/base';
import type { BaseRevoGridColumn } from '~/components/base/revo-grid';
import { COMMON_FIELD } from '~/constants/common-strings';
import { ROUTE } from '~/constants/routes.ts';
import { useMainStore } from '~/features/main/stores/main.store';

import { fetchEENSettingItems } from '../services/een-setting.service';
import type { EENSettingContext, EENSettingItem } from '../types/een-setting.types';

const route = useRoute();
const router = useRouter();
const mainStore = useMainStore();
const isLoading = ref(false);
const items = ref<EENSettingItem[]>([]);
const selectedItemId = ref<string>();
const dialog = reactive({ open: false, title: '', message: '' });
// eSheet passes the LOT context like Android's Intent extras (LOTID, ROUTE, OPERATION, ...).
const context = computed<EENSettingContext>(() => ({
  lotId: queryValue('lotId'),
  factoryName: queryValue('factoryName'),
  route: queryValue('route'),
  operation: queryValue('operation'),
  processStep: queryValue('processStep'),
  product: queryValue('product'),
  facility: queryValue('facility'),
}));
const selectedItem = computed(() => items.value.find(({ id }) => id === selectedItemId.value));
const columns: BaseRevoGridColumn[] = [
  { prop: 'processName', name: '공정명', size: 153 },
  { prop: 'tagComment', name: 'TAGCOMMENT', size: 160 },
  // Widths fit the full Android header text (13px bold) and the timestamp values.
  { prop: 'actionPoint', name: 'ACTIONPOINT', size: 120 },
  { prop: 'createTime', name: 'CREATETIME', size: 168 },
  { prop: 'createUser', name: 'CREATEUSER', size: 120 },
  { prop: 'confirmUser', name: 'CONFIRMUSER', size: 128 },
  { prop: 'confirmTime', name: 'CONFIRMTIME', size: 168 },
];

onMounted(() => void getEENInfo());

function queryValue(key: string): string {
  const value = route.query[key];
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

async function getEENInfo(): Promise<void> {
  if (isLoading.value) return;

  isLoading.value = true;

  try {
    const response = await fetchEENSettingItems({
      lotId: context.value.lotId,
      facility: mainStore.facility || context.value.facility,
    });
    if (!response.success) {
      items.value = [];
      selectedItemId.value = undefined;
      showErrorDialog(response.message);
      return;
    }

    items.value = response.data;
    // EENSettingActivity.getEENInfo focuses the first row of the current operation.
    selectedItemId.value =
      items.value.find(
        ({ processOperationName }) => processOperationName === context.value.operation,
      )?.id ?? items.value[0]?.id;
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
    },
  });
}

function openModify(): void {
  const item = selectedItem.value;
  if (!item) return;

  void router.push({
    path: `/${ROUTE.eenModify}`,
    query: selectedRowQuery(item),
  });
}

function openDelete(): void {
  const item = selectedItem.value;
  if (!item) return;

  void router.push({
    path: `/${ROUTE.eenDelete}`,
    query: selectedRowQuery(item),
  });
}

/** EENSettingActivity.modifyEEN / deleteEEN pass the selected row as Intent extras. */
function selectedRowQuery(item: EENSettingItem) {
  return {
    lotId: context.value.lotId,
    eenId: item.eenId,
    tagComment: item.tagComment,
    actionPoint: item.actionPoint,
    factoryName: item.factoryName,
    product: item.product,
    route: item.route,
    operation: item.operation,
    tagId: item.tagId,
    poDesc: item.poDesc,
  };
}
function closePage(): void {
  void router.push({
    path: `/${ROUTE.esheet}`,
    query: context.value.lotId ? { lotId: context.value.lotId } : undefined,
  });
}
</script>

<style scoped>
/* The table card takes the remaining height so the 360x720 screen itself never scrolls. */
.een-setting__table.ds-screen__card {
  flex: 1 1 0;
  min-height: 0;
  align-items: stretch;
}
.een-setting__grid {
  flex: 1;
  width: 100%;
  min-height: 0;
}
/* Figma Table List: brand header and start-aligned cells. */
.een-setting__grid :deep(revo-grid) {
  --revo-grid-header-height: 40px;
  --revo-grid-font-family: var(--font-family-default);
  --revo-grid-font-size: var(--size-13px);
}
.een-setting__grid :deep(.rgHeaderCell) {
  box-sizing: border-box;
  padding: 0 var(--spacing-space-2);
  border-inline-end: 1px solid var(--border-border-secondary);
  background: var(--background-background-brand);
  color: var(--text-text-reversed);
  font-weight: var(--weight-font-bold);
}
.een-setting__grid :deep(.rgHeaderCell .header-content) {
  text-align: start;
}
.een-setting__grid :deep(.rgCell) {
  box-sizing: border-box;
  padding: 0 var(--spacing-space-2);
  border-inline-end: 1px solid var(--border-border-primary);
  border-block-end: 1px solid var(--border-border-primary);
  color: var(--text-text-primary);
  text-align: start;
}
.een-setting__grid :deep(.een-setting-row--selected .rgCell) {
  background: var(--background-background-hover);
}
.een-setting__empty {
  display: grid;
  flex: 1;
  place-items: center;
  margin: 0;
  color: var(--text-text-secondary);
  font-size: var(--size-14px);
}
.een-setting-dialog-message {
  margin: 0;
  white-space: pre-line;
}
</style>
