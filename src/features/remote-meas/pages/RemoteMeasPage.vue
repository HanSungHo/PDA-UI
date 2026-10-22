<template>
  <main class="remote-meas-page">
    <div class="remote-meas-shell">
      <!-- Header -->
      <header class="remote-meas-header">
        <h1>REMOTE START</h1>
      </header>

      <!-- Main Content -->
      <div class="remote-meas-content">
        <!-- 1. Product & Machine Info Card -->
        <RemoteMeasProductCard
          ref="productCardRef"
          :lot-id="store.lotId"
          :port-state="store.portState"
          :port-status-kind="store.portStatusKind"
          :proc-eqp-id="store.procEqpId"
          :is-machine-disabled="store.isMachineDisabled"
          :selected-port="store.selectedPort"
          :port-options="store.portOptions"
          :is-port-disabled="store.isPortDisabled"
          :is-clear-port-enabled="store.isClearPortEnabled"
          :selected-flag="store.selectedFlag"
          :flag-options="store.flagOptions"
          :recipe-name="store.recipeName"
          :prod-machine="store.prodMachine"
          :wafer-count="store.waferCount"
          :selected-wafer-list="store.selectedWaferList"
          :is-loading="store.isLoading"
          @update:proc-eqp-id="store.procEqpId = $event"
          @update:selected-port="onPortChange"
          @update:selected-flag="store.selectedFlag = $event as MeasFlag"
          @update:prod-machine="store.prodMachine = $event"
          @machine-enter="onMachineEnter"
          @prod-machine-enter="onProdMachineEnter"
          @clear-port="store.requestClearPort"
          @select-wafer="onSelectWafer"
        />

        <!-- 2. Product Detail Card (10 Legacy Items) -->
        <RemoteMeasDetailCard :lot-info="store.lotInfo" />

        <!-- 3. Comments Card -->
        <RemoteMeasCommentCard
          :comment-qty="store.lotInfo?.commentQty || 0"
          :nw-comment-qty="store.lotInfo?.nwCommentQty || 0"
          :is-read-comment-enabled="store.isReadCommentEnabled"
          :is-loading="store.isLoading"
          @read-comment="onReadComment"
        />
      </div>

      <!-- 4. Footer Actions -->
      <RemoteMeasFooter
        :is-start-btn-enabled="store.isStartBtnEnabled"
        :is-loading="store.isLoading"
        @start="onStartClick"
        @cancel="onCancelClick"
      />

      <!-- Global Loading Overlay -->
      <div v-if="store.isLoading" class="remote-meas-loading-overlay" aria-label="처리중">
        <BaseLoading size="large" />
      </div>

      <!-- Alert Modal -->
      <BaseModal
        :open="store.alertDialog.open"
        :title="store.alertDialog.title"
        :closable="false"
        :overlay-closable="false"
        :width="320"
        @after-close="store.closeAlert"
      >
        <p class="remote-meas-dialog-message" role="alert">
          {{ store.alertDialog.message }}
        </p>
        <template #footer>
          <BaseButton
            variant="primary"
            size="medium"
            :label="COMMON_FIELD.BTNOKSTR"
            block
            @click="store.closeAlert"
          />
        </template>
      </BaseModal>

      <!-- Confirmation Modal (Clear Port) -->
      <BaseModal
        :open="store.confirmDialog.open"
        :title="store.confirmDialog.title"
        :closable="false"
        :overlay-closable="false"
        :width="320"
      >
        <p class="remote-meas-dialog-message">
          {{ store.confirmDialog.message }}
        </p>
        <template #footer>
          <div class="remote-meas-dialog-actions">
            <BaseButton
              class="remote-meas-dialog-actions__btn"
              variant="secondary"
              size="medium"
              :label="store.confirmDialog.cancelText || COMMON_FIELD.NEGATIVEBTNSTR"
              @click="store.closeConfirm"
            />
            <BaseButton
              class="remote-meas-dialog-actions__btn"
              variant="primary"
              size="medium"
              :label="store.confirmDialog.confirmText || COMMON_FIELD.BTNOKSTR"
              @click="store.confirmDialog.onConfirm?.()"
            />
          </div>
        </template>
      </BaseModal>

      <!-- Recipe Confirmation Modal -->
      <RemoteRecipeDialog
        v-model="store.recipeDialog.open"
        :recipe-list="store.recipeDialog.recipeList"
        :lot-no="store.recipeDialog.lotNo"
        @confirm="onRecipeConfirm"
        @cancel="store.recipeDialog.open = false"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import '../styles/remote-meas.css';

import { BaseButton, BaseLoading, BaseModal } from 'src/components/base';
import RemoteRecipeDialog from 'src/components/esheet/RemoteRecipeDialog.vue';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { ROUTE } from 'src/constants/routes';
import { useMainStore } from 'src/features/main/stores/main.store';
import { useWaferSelectStore } from 'src/features/move-out/stores/wafer-select.store';
import { barcodeStyleEqpId } from 'src/utils/barcode-style';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import RemoteMeasCommentCard from '../components/RemoteMeasCommentCard.vue';
import RemoteMeasDetailCard from '../components/RemoteMeasDetailCard.vue';
import RemoteMeasFooter from '../components/RemoteMeasFooter.vue';
import RemoteMeasProductCard from '../components/RemoteMeasProductCard.vue';
import { remoteMeasService, setRemoteMeasMockMode } from '../services/remote-meas.service';
import { useRemoteMeasStore } from '../stores/remote-meas.store';
import type { MeasFlag } from '../types/remote-meas.types';

defineOptions({ name: 'RemoteMeasPage' });

const route = useRoute();
const router = useRouter();
const mainStore = useMainStore();
const store = useRemoteMeasStore();
const waferSelectStore = useWaferSelectStore();

const productCardRef = ref<{ focusMachineInput?: () => void } | null>(null);

async function applyRouteParams(): Promise<void> {
  const hashQuery = window.location.hash.includes('?')
    ? new URLSearchParams(window.location.hash.split('?')[1])
    : null;
  const searchParams = new URLSearchParams(window.location.search);

  const isMock =
    route.query.mock === 'true' ||
    hashQuery?.get('mock') === 'true' ||
    searchParams.get('mock') === 'true';
  if (isMock) {
    setRemoteMeasMockMode(true);
  }

  const queryLot = (route.query.lotId ||
    route.query.LOTID ||
    route.params.lotId ||
    hashQuery?.get('lotId') ||
    hashQuery?.get('LOTID') ||
    searchParams.get('lotId') ||
    searchParams.get('LOTID') ||
    '') as string;

  if (queryLot && queryLot.trim() !== '') {
    await store.initScreen(queryLot.trim());
  } else if (!store.lotId) {
    await store.initScreen();
  }

  const isDismissAlert =
    route.query.dismissAlert === 'true' ||
    hashQuery?.get('dismissAlert') === 'true' ||
    searchParams.get('dismissAlert') === 'true';
  if (isDismissAlert) {
    store.closeAlert();
  }

  const isRecipeDialog =
    route.query.recipeDialog === 'true' ||
    hashQuery?.get('recipeDialog') === 'true' ||
    searchParams.get('recipeDialog') === 'true';
  if (isRecipeDialog) {
    store.closeAlert();
    store.recipeDialog.open = true;
    store.recipeDialog.recipeList = store.recipeName || 'RCP-MEAS-01';
    store.recipeDialog.lotNo = store.lotId || 'LOT-MEAS-01';
  }

  const isConfirmDialog =
    route.query.confirmDialog === 'true' ||
    hashQuery?.get('confirmDialog') === 'true' ||
    searchParams.get('confirmDialog') === 'true';
  if (isConfirmDialog) {
    store.closeAlert();
    store.showConfirm({
      title: 'PORT 초기화',
      message: 'PORT를 초기화 하시겠습니까?',
      onConfirm: () => store.closeConfirm(),
    });
  }
}

onMounted(async () => {
  window.addEventListener(NATIVE_ENTER_EVENT, onNativeEnter);
  await applyRouteParams();
});

watch(
  () => route.fullPath,
  async () => {
    await applyRouteParams();
  },
);

onUnmounted(() => {
  window.removeEventListener(NATIVE_ENTER_EVENT, onNativeEnter);
});

// Watch for Wafer Selection results from WaferSelectPage
watch(
  () => waferSelectStore.result,
  (result) => {
    if (!result) return;
    const list = result.selectedWaferList || '';
    store.selectedWaferList = list;
    store.waferCount = list
      ? list
          .split(',')
          .map((w) => w.trim())
          .filter(Boolean).length
      : 0;
    waferSelectStore.clearResult();
  },
  { immediate: true },
);

function onNativeEnter(): void {
  void onMachineEnter();
}

async function onMachineEnter(): Promise<void> {
  const raw = store.procEqpId.trim();
  if (!raw) {
    store.procEqpId = '';
    store.showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '진행장비를 입력하세요.');
    return;
  }

  let targetEqp = raw;
  if (raw.toUpperCase().startsWith('EQP-')) {
    const { isValid, parsedId } = barcodeStyleEqpId(raw);
    if (!isValid) return;
    targetEqp = parsedId;
  }

  store.procEqpId = targetEqp;
  await store.getMachineInfo(targetEqp);
}

function onProdMachineEnter(): void {
  const raw = store.prodMachine.trim();
  if (!raw) return;

  if (raw.toUpperCase().startsWith('EQP-')) {
    const { isValid, parsedId } = barcodeStyleEqpId(raw);
    if (isValid) {
      store.prodMachine = parsedId;
    }
  }
}

async function onPortChange(newPort: string): Promise<void> {
  store.selectedPort = newPort;
  await store.fetchPortStatus();
}

async function onSelectWafer(): Promise<void> {
  if (!store.lotId) {
    store.showAlert('확인', '진행할 LOT을 먼저 입력하세요.');
    return;
  }

  store.isLoading = true;
  try {
    const res = await remoteMeasService.fetchSlotInfo(store.lotId, mainStore.facility || 'FAB2');

    if (!res.ok || !res.data) {
      store.showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, res.message || 'SLOTINFO 조회 실패');
      return;
    }

    const enableWaferList = res.data.waferList || '';
    if (enableWaferList.length > 0) {
      const fixedCount = enableWaferList
        .split(',')
        .map((w) => w.trim())
        .filter(Boolean).length;

      waferSelectStore.start({
        LOTID: store.lotId,
        EXISTWAFERLIST: enableWaferList,
        FIXEDCOUNT: fixedCount,
        CATEGORY: 'ETC',
      });

      await router.push({ path: `/${ROUTE.waferSelect}` });
    } else {
      store.showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '선택 가능한 Wafer가 없습니다.');
    }
  } catch (err) {
    store.showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, String(err));
  } finally {
    store.isLoading = false;
  }
}

async function onReadComment(): Promise<void> {
  if (!store.lotId) return;

  await router.push({
    path: `/${ROUTE.commentList}`,
    query: {
      lotId: store.lotId,
      operation: store.lotInfo?.operation || '',
      subOperation: store.lotInfo?.subOperation || '',
      processStep: store.lotInfo?.processStep || '',
      operSequence: store.lotInfo?.operSequence || '',
      facility: mainStore.facility || 'FAB2',
    },
  });
}

async function onStartClick(): Promise<void> {
  await store.validateAndStart();
}

async function onRecipeConfirm(): Promise<void> {
  await store.submitRemoteStart(() => {
    router.back();
  });
}

function onCancelClick(): void {
  router.back();
}
</script>
