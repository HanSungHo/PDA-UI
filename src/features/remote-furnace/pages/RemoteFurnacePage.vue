<template>
  <main class="furnace-page">
    <div class="furnace-shell">
      <!-- Title Header -->
      <header class="furnace-header">
        <h1>Furnace 자동화</h1>
      </header>

      <!-- Main Scrollable Content -->
      <div class="furnace-content">
        <!-- 1. Product & Machine Card -->
        <FurnaceProductInfoCard
          ref="productCardRef"
          :lot-id="store.lotId"
          :batch-id="store.batchId"
          :recipe="store.recipe"
          :is-recipe-changed="store.isRecipeChanged"
          :selected-recipe="store.selectedRecipe"
          :recipe-options="store.recipeOptions"
          :standard-machine="store.standardMachine"
          :is-standard-machine-changed="store.isStandardMachineChanged"
          :processing-machine="store.processingMachine"
          :ex-machine="store.exMachine"
          :selected-port="store.selectedPort"
          :port-options="store.portOptions"
          :port-state="store.portState"
          :port-status-kind="store.portStatusKind"
          :is-machine-disabled="store.isMachineDisabled"
          :is-port-disabled="store.isPortDisabled"
          :is-recipe-disabled="store.isRecipeDisabled"
          :is-clear-port-disabled="store.isClearPortDisabled"
          :is-loading="store.isLoading"
          @update:processing-machine="store.processingMachine = $event"
          @machine-enter="onMachineEnter"
          @recipe-change="onRecipeChange"
          @port-change="onPortChange"
          @clear-port="store.requestClearPort"
        />

        <!-- 2. Batch Lots Table -->
        <FurnaceBatchTable
          :items="store.batchLots"
          :selected-lot-id="store.selectedLot?.lotId"
          @select-lot="store.setSelectedLot"
          @read-comment="onReadComment"
        />
      </div>

      <!-- 3. Bottom Action Footer -->
      <FurnaceActionFooter
        :start-label="store.startButtonLabel"
        :restart-label="store.restartButtonLabel"
        :is-start-disabled="store.isStartBtnDisabled"
        :is-restart-disabled="store.isRestartBtnDisabled"
        :is-loading="store.isLoading"
        :loading-action="activeLoadingAction"
        @start="onStartClick"
        @restart="onRestartClick"
        @cancel="handleCancel"
      />

      <!-- Global Loading Overlay -->
      <div v-if="store.isLoading" class="furnace-loading-overlay" aria-label="처리중">
        <BaseLoading size="large" />
      </div>

      <!-- Alert Modal -->
      <BaseModal
        :open="store.alertDialog.open"
        :title="store.alertDialog.title"
        :closable="false"
        :overlay-closable="false"
        class="action-dialog"
        @after-close="store.closeAlert"
      >
        <p class="action-dialog-message" role="alert">
          {{ store.alertDialog.message }}
        </p>
        <template #footer>
          <div class="action-dialog-actions">
            <BaseButton
              class="action-dialog-confirm"
              :label="COMMON_FIELD.BTNOKSTR"
              @click="store.closeAlert"
            />
          </div>
        </template>
      </BaseModal>

      <!-- Confirmation Modal -->
      <BaseModal
        :open="store.confirmDialog.open"
        :title="store.confirmDialog.title"
        :closable="false"
        :overlay-closable="false"
        class="action-dialog"
      >
        <p class="action-dialog-message">
          {{ store.confirmDialog.message }}
        </p>
        <template #footer>
          <div class="action-dialog-actions">
            <BaseButton
              class="action-dialog-cancel"
              :label="store.confirmDialog.cancelText || COMMON_FIELD.NEGATIVEBTNSTR"
              @click="onConfirmCancel"
            />
            <BaseButton
              class="action-dialog-confirm"
              :label="store.confirmDialog.confirmText || COMMON_FIELD.BTNOKSTR"
              @click="onConfirmAccept"
            />
          </div>
        </template>
      </BaseModal>

      <!-- Remote Recipe Dialog -->
      <RemoteRecipeDialog
        v-model="store.recipeDialog.open"
        :recipe-list="store.recipeDialog.recipeList"
        :lot-no="store.recipeDialog.lotNo"
        @confirm="onRecipeConfirmed"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import { BaseButton, BaseLoading, BaseModal } from 'src/components/base';
import RemoteRecipeDialog from 'src/components/esheet/RemoteRecipeDialog.vue';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { ROUTE } from 'src/constants/routes';
import { useMainStore } from 'src/features/main/stores/main.store';
import { barcodeStyleEqpId } from 'src/utils/barcode-style';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import FurnaceActionFooter from '../components/FurnaceActionFooter.vue';
import FurnaceBatchTable from '../components/FurnaceBatchTable.vue';
import FurnaceProductInfoCard from '../components/FurnaceProductInfoCard.vue';
import { setRemoteFurnaceMockMode } from '../services/remote-furnace.service';
import { useRemoteFurnaceStore } from '../stores/remote-furnace.store';
import type { BatchLotItem } from '../types/remote-furnace.types';

defineOptions({ name: 'RemoteFurnacePage' });

const route = useRoute();
const router = useRouter();
const mainStore = useMainStore();
const store = useRemoteFurnaceStore();

const productCardRef = ref<{ focusMachineInput: () => void } | null>(null);
const activeLoadingAction = ref<'START' | 'RESTART' | null>(null);

onMounted(async () => {
  window.addEventListener(NATIVE_ENTER_EVENT, onNativeEnter);

  setRemoteFurnaceMockMode(route.query.mock === 'true');

  const queryLot = route.query.lotId ?? route.query.LOTID;
  const initialLot =
    typeof queryLot === 'string'
      ? queryLot
      : Array.isArray(queryLot) && typeof queryLot[0] === 'string'
        ? queryLot[0]
        : '';

  // Initialize screen with lot if provided (or empty for NONLOT mode)
  await store.initScreen(initialLot);

  if (route.query.dismissAlert === 'true') {
    store.closeAlert();
  }
  if (route.query.recipeDialog === 'true') {
    store.closeAlert();
    store.recipeDialog.open = true;
    store.recipeDialog.recipeList = store.recipe;
    store.recipeDialog.lotNo = store.lotId;
  }
  if (route.query.confirmDialog === 'true') {
    store.closeAlert();
    store.showConfirm({
      title: '확인',
      message: '장비상태가 변경되었습니다.\n진행장비의 RECIPE를 다시 요청 하시겠습니까?',
      confirmText: '예',
      cancelText: '아니오',
    });
  }

  focusMachineInput();
});

watch(
  () => route.query.lotId,
  async (newLot) => {
    if (typeof newLot === 'string' && newLot) {
      setRemoteFurnaceMockMode(route.query.mock === 'true');
      await store.initScreen(newLot);
    }
  },
);

watch(
  () => route.query.recipeDialog,
  (val) => {
    if (val === 'true') {
      store.closeAlert();
      store.closeConfirm();
      store.recipeDialog.open = true;
      store.recipeDialog.recipeList = store.recipe;
      store.recipeDialog.lotNo = store.lotId;
    } else if (val === 'false') {
      store.recipeDialog.open = false;
    }
  },
);

watch(
  () => route.query.confirmDialog,
  (val) => {
    if (val === 'true') {
      store.closeAlert();
      store.recipeDialog.open = false;
      store.showConfirm({
        title: '확인',
        message: '장비상태가 변경되었습니다.\n진행장비의 RECIPE를 다시 요청 하시겠습니까?',
        confirmText: '예',
        cancelText: '아니오',
      });
    } else if (val === 'false') {
      store.closeConfirm();
    }
  },
);

onUnmounted(() => {
  window.removeEventListener(NATIVE_ENTER_EVENT, onNativeEnter);
});

function onNativeEnter(): void {
  void onMachineEnter();
}

function focusMachineInput(): void {
  void nextTick(() => {
    productCardRef.value?.focusMachineInput();
  });
}

async function onMachineEnter(): Promise<void> {
  const raw = store.processingMachine.trim();
  if (!raw) {
    store.processingMachine = '';
    return;
  }
  const { isValid, parsedId } = barcodeStyleEqpId(raw);
  if (!isValid) {
    return;
  }
  store.processingMachine = parsedId;
  await store.handleProcessingMachineInput(parsedId);
}

async function onRecipeChange(newRecipe: string): Promise<void> {
  store.selectedRecipe = newRecipe;
  await store.checkInterlock();
}

async function onPortChange(newPort: string): Promise<void> {
  store.selectedPort = newPort;
  await store.updatePortStatus();
}

function onConfirmAccept(): void {
  const cb = store.confirmDialog.onConfirm;
  store.closeConfirm();
  cb?.();
}

function onConfirmCancel(): void {
  const cb = store.confirmDialog.onCancel;
  store.closeConfirm();
  cb?.();
}

async function onStartClick(): Promise<void> {
  activeLoadingAction.value = 'START';
  try {
    await store.triggerStartAction();
  } finally {
    activeLoadingAction.value = null;
  }
}

function onRestartClick(): void {
  activeLoadingAction.value = 'RESTART';
  try {
    store.triggerRestartAction();
  } finally {
    activeLoadingAction.value = null;
  }
}

async function onRecipeConfirmed(): Promise<void> {
  const isSuccess = await store.submitRemoteExecution();
  if (isSuccess) {
    if (store.lotId) {
      void router.replace({
        path: `/${ROUTE.esheet}`,
        query: { lotId: store.lotId },
      });
    } else {
      void router.replace({ path: `/${ROUTE.main}` });
    }
  }
}

// Pass data to CommentList screen via Pinia store + Route queries
function onReadComment(item: BatchLotItem): void {
  store.setSelectedLot(item);
  void router.push({
    path: `/${ROUTE.commentList}`,
    query: {
      lotId: item.lotId,
      operation: item.operation,
      subOperation: item.subOperation,
      processStep: item.processStep,
      operSequence: item.operSequence,
      facility: mainStore.facility,
    },
  });
}

function handleCancel(): void {
  if (store.lotId) {
    void router.replace({
      path: `/${ROUTE.esheet}`,
      query: { lotId: store.lotId },
    });
  } else {
    void router.replace({ path: `/${ROUTE.main}` });
  }
}
</script>

<style src="../../../components/base/modal/action-dialog.css"></style>
<style src="../styles/remote-furnace.css"></style>
