<template>
  <BaseScreen
    class="re-transfer-screen"
    title="반송"
    ok-label="확인"
    cancel-label="취소"
    :ok-loading="store.isLoading"
    :cancel-disabled="store.isLoading"
    @ok="handleExecuteCarry"
    @cancel="handleCancel"
  >
    <!-- Card 1: LOT No Search -->
    <ReTransferSearchCard
      ref="searchCardRef"
      :lot-id="store.lotId"
      :is-loading="store.isLoading"
      @update:lot-id="store.lotId = $event"
      @search-lot="handleSearchLot"
      @lot-enter="handleLotEnter"
    />

    <!-- Card 2: Current STK & 5 Next Dropdowns -->
    <ReTransferDetailCard
      :current-stk="store.currentStk"
      :fabs="store.fabs"
      :selected-fab="store.selectedFab"
      :bays="store.bays"
      :selected-bay="store.selectedBay"
      :stockers="store.stockers"
      :selected-stocker="store.selectedStocker"
      :ports="store.ports"
      :selected-port="store.selectedPort"
      :pdas="store.pdas"
      :selected-pda="store.selectedPda"
      :is-loading="store.isLoading"
      @select-fab="handleSelectFab"
      @select-bay="handleSelectBay"
      @update:selected-stocker="store.selectedStocker = $event"
      @update:selected-port="store.selectedPort = $event"
      @update:selected-pda="store.selectedPda = $event"
    />

    <!-- Global Loading Overlay -->
    <div v-if="store.isLoading" class="re-transfer-loading-overlay" aria-label="처리중">
      <BaseLoading size="large" />
    </div>
  </BaseScreen>
</template>

<script setup lang="ts">
import { BaseLoading, BaseScreen } from 'src/components/base';
import { ROUTE } from 'src/constants/routes';
import { okDialog } from 'src/services/ok-dialog.service';
import { barcodeStyleLotId } from 'src/utils/barcode-style';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import ReTransferDetailCard from '../components/ReTransferDetailCard.vue';
import ReTransferSearchCard from '../components/ReTransferSearchCard.vue';
import { useReTransferStore } from '../stores/re-transfer.store';

defineOptions({ name: 'ReTransferPage' });

const router = useRouter();
const route = useRoute();
const store = useReTransferStore();

const searchCardRef = ref<{ focusLot?: () => void } | null>(null);

watch(
  () => okDialog.isOpen.value,
  (isOpen, wasOpen) => {
    if (wasOpen && !isOpen) {
      void nextTick(() => searchCardRef.value?.focusLot?.());
    }
  },
);

watch(
  () => store.focusTarget,
  (target) => {
    if (!target) return;
    void nextTick(() => {
      if (target === 'lot') {
        searchCardRef.value?.focusLot?.();
      }
      store.focusTarget = null;
    });
  },
);

async function handleSearchLot(): Promise<void> {
  await store.fetchCarryInfo(store.lotId);
  searchCardRef.value?.focusLot?.();
}

async function handleLotEnter(): Promise<void> {
  const { isValid, parsedId } = barcodeStyleLotId(store.lotId);
  store.lotId = parsedId;
  if (isValid) {
    await store.fetchCarryInfo(parsedId);
  } else {
    store.clearInfo();
  }
  searchCardRef.value?.focusLot?.();
}

function handleNativeEnter(event: Event): void {
  const customEvent = event as CustomEvent<{ value?: string }>;
  if (customEvent.detail?.value !== undefined) {
    store.lotId = customEvent.detail.value;
  }
  void handleLotEnter();
}

function handleSelectFab(fab: string): void {
  void store.selectFab(fab);
}

function handleSelectBay(bay: string): void {
  void store.selectBay(bay);
}

async function handleExecuteCarry(): Promise<void> {
  await store.executeCarry();
}

function handleCancel(): void {
  if (router.options.history.state.back) {
    router.back();
  } else {
    void router.push({ path: `/${ROUTE.main}` });
  }
}

onMounted(async () => {
  store.resetState();

  window.addEventListener(NATIVE_ENTER_EVENT, handleNativeEnter);

  const queryLotId = (route.query.LOTID || route.query.lotId || '') as string;
  if (typeof queryLotId === 'string' && queryLotId.trim().length > 0) {
    store.lotId = queryLotId.trim().toUpperCase();
    await store.fetchCarryInfo(store.lotId);
  }

  void nextTick(() => {
    searchCardRef.value?.focusLot?.();
  });
});

onUnmounted(() => {
  window.removeEventListener(NATIVE_ENTER_EVENT, handleNativeEnter);
  store.resetState();
});
</script>

<style scoped>
.re-transfer-loading-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--component-opacity-opacity-scrim);
}
</style>
