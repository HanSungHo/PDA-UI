<template>
  <BaseScreen class="auto-merge" title="AUTO MERGE" :aria-busy="loading">
    <div class="auto-merge__body" :inert="blocked">
      <section class="ds-screen__card">
        <div class="ds-screen__card-row">
          <BaseInput
            ref="lotInput"
            data-testid="auto-merge-lot"
            label="LOT ID"
            :model-value="editLotNo"
            autocomplete="off"
            @update:model-value="editLotNo = String($event ?? '').toUpperCase()"
            @keydown.enter.prevent
            @keyup.enter.prevent="handleLotEnter"
          >
            <template #suffix>
              <QIcon name="sym_o_search" aria-hidden="true" />
            </template>
          </BaseInput>
          <BaseButton
            data-testid="auto-merge-search"
            variant="secondary"
            aria-label="LOT 조회"
            @click="onSingleClick(() => store.getMergeLotInfo())"
          >
            조회
          </BaseButton>
        </div>
      </section>

      <section class="ds-screen__card auto-merge__grid-card" aria-label="AUTO MERGE LOT 목록">
        <BaseRevoGrid
          data-testid="auto-merge-candidates"
          class="auto-merge__grid"
          :rows="candidateRows"
          :columns="columns"
          row-key="gridKey"
          :readonly="true"
          :resize="false"
          :filter="false"
          @row-select="selectLotList"
          @pointerdown.capture="beginRowTap"
          @pointermove.capture="moveRowTap"
          @pointerup="finishRowTap"
          @pointercancel="rowTap = undefined"
          @keyup.enter="activateCandidateFromKey"
        />
        <div v-if="loading" class="auto-merge__loading" role="status" aria-label="Loading">
          <BaseLoading />
        </div>
      </section>

      <section class="ds-screen__card">
        <div class="ds-screen__card-row">
          <BaseInput
            data-testid="auto-merge-selected"
            label="LOT ID"
            :model-value="txtSelectedLot"
            readonly
          />
          <BaseButton
            data-testid="auto-merge-detail"
            variant="secondary"
            @click="onSingleClick(inquireLotInfo)"
            >LOT 상세</BaseButton
          >
        </div>
        <div class="ds-screen__card-row">
          <BaseInput label="제품" :model-value="txtProduct" readonly />
          <BaseInput label="ROUTE" :model-value="txtRoute" readonly />
        </div>
        <div class="ds-screen__card-row">
          <BaseInput label="공정번호" :model-value="txtProcessNum" readonly />
          <BaseInput aria-label="공정 설명" :model-value="txtProcessStep" readonly />
        </div>
      </section>

      <section class="ds-screen__card">
        <div class="ds-screen__card-row">
          <BaseInput
            data-testid="auto-merge-parent"
            label="PARENT LOT"
            :model-value="txtParentLot"
            readonly
          />
          <BaseInput label="수량" :model-value="txtQty" readonly />
        </div>
        <div class="ds-screen__card-row">
          <BaseInput label="제품" :model-value="txtProduct2" readonly />
          <BaseInput label="ROUTE" :model-value="txtRoute2" readonly />
        </div>
        <div class="ds-screen__card-row">
          <BaseInput label="공정번호" :model-value="txtProcessNum2" readonly />
          <BaseInput aria-label="PARENT 공정 설명" :model-value="txtProcessStep2" readonly />
        </div>
      </section>

      <section class="ds-screen__card auto-merge__grid-card" aria-label="Merge LOT 목록">
        <BaseRevoGrid
          data-testid="auto-merge-items"
          class="auto-merge__grid"
          :rows="mergeRows"
          :columns="columns2"
          row-key="gridKey"
          :readonly="true"
          :resize="false"
          :filter="false"
        />
        <div v-if="loading" class="auto-merge__loading" role="status" aria-label="Loading">
          <BaseLoading />
        </div>
      </section>

      <section class="ds-screen__card">
        <BaseInput
          v-model="editComment"
          data-testid="auto-merge-comment"
          mode="textarea"
          aria-label="Comment"
          placeholder="Comment"
          :rows="4"
          resize="vertical"
        />
      </section>
    </div>
    <template #footer>
      <BaseButton
        data-testid="auto-merge-execute"
        size="medium"
        :disabled="blocked"
        @click="onSingleClick(() => store.executeMerge())"
        >실행</BaseButton
      >
      <BaseButton
        data-testid="auto-merge-close"
        variant="tertiary"
        size="medium"
        :disabled="blocked"
        @click="onSingleClick(close)"
        >닫기</BaseButton
      >
    </template>
    <BaseModal
      :open="Boolean(dialog)"
      :title="dialog?.title"
      :closable="false"
      :overlay-closable="false"
      :back-closable="false"
      class="action-dialog"
    >
      <p class="action-dialog-message">{{ dialog?.message }}</p>
      <template #footer>
        <div class="action-dialog-actions">
          <BaseButton data-testid="auto-merge-dialog-ok" @click="store.acknowledgeDialog()">
            {{ TEXT.BTNOKSTR }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </BaseScreen>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { QIcon } from 'quasar';
import { BaseButton } from 'src/components/base/button';
import { BaseInput } from 'src/components/base/input';
import { BaseLoading } from 'src/components/base/loading';
import { BaseModal } from 'src/components/base/modal';
import {
  BaseRevoGrid,
  type BaseRevoGridColumn,
  type BaseRevoGridKey,
} from 'src/components/base/revo-grid';
import { BaseScreen } from 'src/components/base/screen';
import { COMMON_FIELD as TEXT } from 'src/constants/common-strings';
import { ROUTE } from 'src/constants/routes';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';

import { useAutoMergeStore } from '../stores/auto-merge.store';
import type { CandidateLot } from '../types/auto-merge.types';

const router = useRouter();
const store = useAutoMergeStore();
if (!store.returningFromLotStatus) store.$reset();
store.returningFromLotStatus = false;
const {
  editLotNo,
  editComment,
  loading,
  gridList,
  gridList2,
  gridVisible,
  txtSelectedLot,
  txtProduct,
  txtRoute,
  txtProcessNum,
  txtProcessStep,
  txtParentLot,
  txtQty,
  txtProduct2,
  txtRoute2,
  txtProcessNum2,
  txtProcessStep2,
} = storeToRefs(store);
const lotInput = ref<InstanceType<typeof BaseInput>>();
const dialog = computed(() => store.dialogs[0]);
const blocked = computed(() => loading.value || Boolean(dialog.value));
const candidateRows = computed(() =>
  gridList.value.map((row, index) => ({ ...row, gridKey: index })),
);
const mergeRows = computed(() =>
  gridList2.value.map((row, index) => ({
    ...row,
    gridKey: index,
    rowClass: store.isMismatch(row) ? 'auto-merge__row--mismatch' : '',
  })),
);
const columns: BaseRevoGridColumn[] = [
  { prop: 'LOTNAME', name: 'LOT ID', size: 140 },
  { prop: 'MAINLOTNAME', name: 'MAIN LOT ID', size: 150 },
  { prop: 'PRODUCTSPECNAME', name: '제품', size: 130 },
  { prop: 'PROCESSFLOWNAME', name: 'MERGE ROUTE', size: 150 },
  { prop: 'PROCESSOPERATIONNAME', name: 'MERGE 공정', size: 130 },
  { prop: 'DESCRIPTION', name: '공정 DESC', size: 180 },
];
const columns2: BaseRevoGridColumn[] = [
  { prop: 'LOTNAME', name: 'LOT ID', size: 140 },
  { prop: 'PRODUCTQUANTITY', name: 'QTY', size: 65 },
  { prop: 'PRODUCTSPECNAME', name: '제품', size: 130 },
  { prop: 'PROCESSFLOWNAME', name: 'ROUTE', size: 150 },
  { prop: 'PROCESSOPERATIONNAME', name: '공정', size: 100 },
  { prop: 'OPERATIONDESCRIPTION', name: '공정 DESC', size: 180 },
  { prop: 'LOTSTATE', name: 'STATUS', size: 110 },
];
let lastClickTime = 0;
function onSingleClick(action: () => unknown) {
  const now = Date.now();
  if (blocked.value || now - lastClickTime <= 1000) return;
  lastClickTime = now;
  lotInput.value?.$el?.querySelector('input')?.blur();
  void action();
}
async function handleLotEnter() {
  if (blocked.value) return;
  const focusRequestId = store.focusRequest.id;
  await store.handleLotEnter();
  if (store.focusRequest.id === focusRequestId) store.requestFocus();
}
let focusedCandidate: CandidateLot | undefined;
let rowTap: { x: number; y: number; moved: boolean } | undefined;
function selectLotList(_key: BaseRevoGridKey, row: Record<string, unknown>) {
  focusedCandidate = row as unknown as CandidateLot;
}
function beginRowTap(event: PointerEvent) {
  rowTap = { x: event.clientX, y: event.clientY, moved: false };
}
function moveRowTap(event: PointerEvent) {
  if (rowTap && Math.hypot(event.clientX - rowTap.x, event.clientY - rowTap.y) > 8)
    rowTap.moved = true;
}
function finishRowTap(event: PointerEvent) {
  const isCell = event
    .composedPath()
    .some((target) => target instanceof HTMLElement && target.classList.contains('rgCell'));
  if (rowTap && !rowTap.moved && isCell) activateCandidate();
  rowTap = undefined;
}
function activateCandidate() {
  if (!blocked.value && store.gMainLotId && focusedCandidate)
    void store.selectLotList(focusedCandidate);
}
function activateCandidateFromKey(event: KeyboardEvent) {
  if ((event.target as HTMLElement).getAttribute('role') !== 'scrollbar') activateCandidate();
}
watch([gridList, gridVisible], () => {
  focusedCandidate = undefined;
  rowTap = undefined;
});
async function inquireLotInfo() {
  store.returningFromLotStatus = true;
  try {
    await router.push({ name: ROUTE.lotStatus, query: { LOTID: store.editLotNo } });
  } catch (error) {
    store.returningFromLotStatus = false;
    throw error;
  }
}
function close() {
  store.returningFromLotStatus = false;
  if (router.options.history.state.back) router.back();
  else void router.replace(`/${ROUTE.main}`);
}
onBeforeRouteLeave((to) => {
  if (blocked.value) return false;
  store.returningFromLotStatus = to.name === ROUTE.lotStatus;
  return true;
});
async function focusLot() {
  if (blocked.value) return;
  await nextTick();
  lotInput.value?.focus();
  if (store.focusRequest.select) lotInput.value?.select();
}
let appliedFocusRequest = store.focusRequest.id;
watch(
  () => [store.focusRequest.id, blocked.value],
  () => {
    if (!blocked.value && store.focusRequest.id !== appliedFocusRequest) {
      appliedFocusRequest = store.focusRequest.id;
      void focusLot();
    }
  },
  { flush: 'post' },
);
onMounted(() => {
  void focusLot();
});
</script>

<style scoped src="../styles/auto-merge.css"></style>

<style src="../../../components/base/modal/action-dialog.css"></style>
