<template>
  <BaseScreen class="remote-aegis-screen" :title="screenTitle">
    <!-- Card 1: Product & Machine Info -->
    <RemoteAegisProductCard
      ref="productCardRef"
      :machine-input="machineInput"
      :lot-id-input="lotIdInput"
      :selected-port="selectedPort"
      :port-options="portOptions"
      :port-state="portState"
      :port-status-kind="portStatusKind"
      :recipe-input="recipeInput"
      :prod-machine-input="prodMachineInput"
      :wafer-count="waferCount"
      :selected-wafer-list="selectedWaferList"
      :is-clear-port-enabled="isClearPortEnabled"
      :is-loading="isLoading"
      @update:machine-input="machineInput = $event"
      @update:lot-id-input="lotIdInput = $event"
      @update:selected-port="onPortChange"
      @update:recipe-input="recipeInput = $event"
      @update:prod-machine-input="prodMachineInput = $event"
      @machine-enter="handleMachineEnter"
      @search-machine="handleSearchMachine"
      @change-local="store.modeChangeLocal"
      @change-remote="store.modeChangeRemote"
      @lot-enter="handleLotEnter"
      @search-lot="handleSearchLot"
      @clear-port="store.executeClearPort"
      @select-wafer="handleSelectWafer"
    />

    <!-- Card 2: Process Table / LOT Comment -->
    <RemoteAegisCommentCard :notice-text="noticeText" />

    <!-- Card 3: Action Buttons START & 닫기 -->
    <RemoteAegisActionCard
      :is-start-enabled="isStartEnabled"
      :is-loading="isLoading"
      @start="handleStart"
      @cancel="handleCancel"
    />

    <!-- Bottom Footer Bar -->
    <template #footer>
      <BaseButton
        variant="primary"
        size="medium"
        label="MOVE OUT (ESHEET)"
        block
        :disabled="isLoading"
        @click="handleMoveOut"
      />
    </template>

    <!-- Global Loading Overlay -->
    <div v-if="isLoading" class="remote-aegis-loading-overlay" aria-label="처리중">
      <BaseLoading size="large" />
    </div>

    <!-- Alert Dialog -->
    <OkDialog
      :open="okDialog.isOpen.value"
      :title="okDialog.title.value"
      :message="okDialog.message.value"
      :confirm-label="okDialog.confirmLabel.value"
      @confirm="handleDialogConfirm"
    />

    <!-- Confirmation Modal (Clear Port, Local/Remote, RUN/OnHold, MOVEIN EEN) -->
    <BaseModal
      :open="confirmDialog.open"
      :title="confirmDialog.title"
      :closable="false"
      :overlay-closable="false"
      :width="320"
    >
      <p class="remote-aegis-dialog-message">
        {{ confirmDialog.message }}
      </p>
      <template #footer>
        <div class="remote-aegis-dialog-actions">
          <BaseButton
            class="remote-aegis-dialog-actions__btn"
            variant="link"
            size="medium"
            :label="confirmDialog.cancelLabel"
            @click="store.resolveConfirm(false)"
          />
          <BaseButton
            class="remote-aegis-dialog-actions__btn"
            variant="link"
            size="medium"
            :label="confirmDialog.confirmLabel"
            @click="store.resolveConfirm(true)"
          />
        </div>
      </template>
    </BaseModal>
  </BaseScreen>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { BaseButton, BaseLoading, BaseModal, BaseScreen } from 'src/components/base';
import OkDialog from 'src/components/OkDialog.vue';
import { DeviceInfo } from 'src/constants/device-info';
import { ROUTE } from 'src/constants/routes';
import { useMainStore } from 'src/features/main/stores/main.store';
import { useWaferSelectStore } from 'src/features/move-out/stores/wafer-select.store';
import { okDialog } from 'src/services/ok-dialog.service';
import { barcodeStyleEqpId, barcodeStyleLotId } from 'src/utils/barcode-style';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import RemoteAegisActionCard from '../components/RemoteAegisActionCard.vue';
import RemoteAegisCommentCard from '../components/RemoteAegisCommentCard.vue';
import RemoteAegisProductCard from '../components/RemoteAegisProductCard.vue';
import { useRemoteAegisStore } from '../stores/remote-aegis.store';

defineOptions({ name: 'RemoteAegisPage' });

const route = useRoute();
const router = useRouter();
const mainStore = useMainStore();
const store = useRemoteAegisStore();
const waferSelectStore = useWaferSelectStore();

const { operatorName, facility } = storeToRefs(mainStore);
const {
  machineInput,
  lotIdInput,
  portOptions,
  selectedPort,
  portState,
  recipeInput,
  prodMachineInput,
  waferCount,
  selectedWaferList,
  isStartEnabled,
  isClearPortEnabled,
  isLoading,
  focusTarget,
  isReturningFromChild,
  searchOperation,
  searchSubOperation,
  searchProcessStep,
  searchOperSequence,
  confirmDialog,
  noticeText,
  portStatusKind,
} = storeToRefs(store);

const productCardRef = ref<{
  focusMachine?: () => void;
  focusLot?: () => void;
  isLotFocused?: () => boolean;
  isMachineFocused?: () => boolean;
} | null>(null);

const screenTitle = computed(() => {
  const operator = operatorName.value?.trim();
  if (operator && operator !== 'OPERATOR_NAME' && operator !== DeviceInfo.OPERATOR_NAME) {
    return `AEGIS Remote Start (${operator})`;
  }
  return 'AEGIS Remote Start';
});

watch(focusTarget, (target) => {
  if (!target) return;
  void nextTick(() => {
    if (target === 'lot') {
      productCardRef.value?.focusLot?.();
    } else if (target === 'machine') {
      productCardRef.value?.focusMachine?.();
    }
    focusTarget.value = null;
  });
});

// Watch for Wafer Selection results from WaferSelectPage
watch(
  () => waferSelectStore.result,
  (result) => {
    if (!result) return;
    const list = result.selectedWaferList || '';
    selectedWaferList.value = list;
    waferCount.value = list
      ? String(
          list
            .split(',')
            .map((w) => w.trim())
            .filter(Boolean).length,
        )
      : '';
    waferSelectStore.clearResult();
  },
  { immediate: true },
);

function handleDialogConfirm(): void {
  okDialog.confirm();
  void nextTick(() => {
    if (focusTarget.value === 'lot') {
      productCardRef.value?.focusLot?.();
      focusTarget.value = null;
    }
  });
}

function onNativeEnter(event: Event): void {
  const customEvent = event as CustomEvent<{ value?: string }>;
  const scanned = customEvent.detail?.value;
  const isLot = productCardRef.value?.isLotFocused?.() ?? false;
  const isMachine = productCardRef.value?.isMachineFocused?.() ?? false;

  if (isLot) {
    if (scanned !== undefined) lotIdInput.value = scanned;
    void handleLotEnter();
  } else if (isMachine) {
    if (scanned !== undefined) machineInput.value = scanned;
    void handleMachineEnter();
  } else if (scanned !== undefined) {
    // When no element is focused in jsdom / test environment, determine target by barcode prefix
    if (scanned.startsWith(' ')) {
      lotIdInput.value = scanned;
      void handleLotEnter();
    } else {
      machineInput.value = scanned;
      void handleMachineEnter();
    }
  }
}

async function handleMachineEnter(): Promise<void> {
  const { isValid, parsedId } = barcodeStyleEqpId(machineInput.value);
  machineInput.value = parsedId;
  if (!isValid) return;

  await store.setEqpInfo();
}

async function handleSearchMachine(): Promise<void> {
  await store.setEqpInfo();
}

async function onPortChange(port: string): Promise<void> {
  selectedPort.value = port;
  await store.setPortState();
}

async function handleLotEnter(): Promise<void> {
  const { isValid, parsedId } = barcodeStyleLotId(lotIdInput.value);
  lotIdInput.value = parsedId;
  if (!isValid) return;

  await store.setLotInfo(handleNavigateCommentList);
}

async function handleSearchLot(): Promise<void> {
  await store.setLotInfo(handleNavigateCommentList);
}

function handleNavigateCommentList(): void {
  isReturningFromChild.value = true;
  void router.push({
    path: `/${ROUTE.commentList}`,
    query: {
      LOTID: lotIdInput.value,
      OPERATION: searchOperation.value,
      SUBOPERATION: searchSubOperation.value,
      PROCESSSTEP: searchProcessStep.value,
      OPERSEQUENCE: searchOperSequence.value,
      lotId: lotIdInput.value,
      operation: searchOperation.value,
      subOperation: searchSubOperation.value,
      processStep: searchProcessStep.value,
      operSequence: searchOperSequence.value,
      facility: facility.value || DeviceInfo.FACILITY,
    },
  });
}

async function handleSelectWafer(): Promise<void> {
  const payload = await store.executeSelectWafer();
  if (!payload) return;

  // NOTE: Android uses WaferselectAEGIS_Activity (with FACTORY/PRODUCT/OWNERCODE/OPERCODE and Chamber Coverage).
  // The new WaferselectAEGIS screen implementation will be reviewed and handled in a separate task.
  // Standard waferSelectStore fallback:
  waferSelectStore.start({
    LOTID: payload.lotId,
    EXISTWAFERLIST: payload.enableWaferList,
    FIXEDCOUNT: payload.fixedCount,
    CATEGORY: payload.category,
  });

  isReturningFromChild.value = true;
  await router.push({ path: `/${ROUTE.waferSelect}` });
}

async function handleStart(): Promise<void> {
  await store.executeStart(handleNavigateCommentList);
}

function handleMoveOut(): void {
  isReturningFromChild.value = true;
  void router.push({ path: `/${ROUTE.esheet}` });
}

function handleCancel(): void {
  if (router.options.history.state.back) {
    router.back();
  } else {
    void router.push({ path: `/${ROUTE.main}` });
  }
}

onMounted(async () => {
  window.addEventListener(NATIVE_ENTER_EVENT, onNativeEnter);

  if (isReturningFromChild.value) {
    isReturningFromChild.value = false;
    return;
  }

  const queryEqp = (route.query.Eqpid ||
    route.query.eqpid ||
    route.params.Eqpid ||
    route.params.eqpid ||
    '') as string;

  if (queryEqp && queryEqp !== 'NULL' && queryEqp.trim() !== '') {
    await store.initScreen(queryEqp.trim());
  } else {
    store.resetState();
  }

  void nextTick(() => {
    productCardRef.value?.focusMachine?.();
  });
});

onUnmounted(() => {
  window.removeEventListener(NATIVE_ENTER_EVENT, onNativeEnter);
  if (!isReturningFromChild.value) {
    store.resetState();
  }
});
</script>

<style scoped>
.remote-aegis-loading-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--component-opacity-opacity-scrim);
}

.remote-aegis-dialog-message {
  margin: 0;
  color: var(--text-text-primary);
  font-size: var(--font-size-14px);
  line-height: var(--line-height-20px);
  white-space: pre-line;
  text-align: center;
}

.remote-aegis-dialog-actions {
  display: flex;
  width: 100%;
  gap: var(--spacing-space-2);
}

.remote-aegis-dialog-actions__btn {
  flex: 1;
}
</style>
