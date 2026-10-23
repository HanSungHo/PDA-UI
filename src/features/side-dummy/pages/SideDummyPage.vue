<template>
  <main class="side-dummy-page">
    <div class="side-dummy-shell">
      <!-- 1. Header -->
      <header class="side-dummy-header">
        <h1>SIDE DUMMY</h1>
      </header>

      <!-- 2. Main Content Area -->
      <div class="side-dummy-content">
        <!-- Product & Search Card (EQP and LOT) -->
        <SideDummyProductCard
          ref="productCardRef"
          :eqp-id="store.eqpId"
          :lot-id="store.lotId"
          :is-lot-disabled="store.isLotDisabled"
          :is-lot-search-enabled="store.isLotSearchEnabled"
          :is-loading="store.isLoading"
          @update:eqp-id="store.eqpId = $event"
          @update:lot-id="store.lotId = $event"
          @search-eqp="handleEqpSearch"
          @search-lot="handleLotSearch"
          @eqp-enter="handleEqpEnter"
          @lot-enter="handleLotEnter"
        />

        <!-- Info Card (공정번호, 공정명, IN DATE, IN USER) -->
        <SideDummyInfoCard
          :oper-id="store.operId"
          :oper-desc="store.operDesc"
          :in-date="store.inDate"
          :in-user="store.inUser"
        />
      </div>

      <!-- 3. Footer Action Buttons (IN, OUT, 닫기) -->
      <SideDummyFooter
        :is-btn-in-enabled="store.isBtnInEnabled"
        :is-btn-out-enabled="store.isBtnOutEnabled"
        :is-loading="store.isLoading"
        @in="handleExecuteIn"
        @out="handleExecuteOut"
        @close="handleClose"
      />

      <!-- Global Loading Overlay -->
      <div v-if="store.isLoading" class="side-dummy-loading-overlay" aria-label="처리중">
        <BaseLoading size="large" />
      </div>

      <!-- Result / Error Alert Modal -->
      <BaseModal
        :open="store.alertDialog.open"
        :title="store.alertDialog.title"
        :closable="false"
        :overlay-closable="false"
        :width="320"
        @after-close="store.closeAlert"
      >
        <p class="side-dummy-dialog-message" role="alert">
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
    </div>
  </main>
</template>

<script setup lang="ts">
import '../styles/side-dummy.css';

import { BaseButton, BaseLoading, BaseModal } from 'src/components/base';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { ROUTE } from 'src/constants/routes';
import { barcodeStyleEqpId, barcodeStyleLotId } from 'src/utils/barcode-style';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import SideDummyFooter from '../components/SideDummyFooter.vue';
import SideDummyInfoCard from '../components/SideDummyInfoCard.vue';
import SideDummyProductCard from '../components/SideDummyProductCard.vue';
import { useSideDummyStore } from '../stores/side-dummy.store';

defineOptions({ name: 'SideDummyPage' });

const router = useRouter();
const store = useSideDummyStore();

const productCardRef = ref<{ focusEqp?: () => void; focusLot?: () => void } | null>(null);

watch(
  () => store.focusTarget,
  (target) => {
    if (!target) return;
    void nextTick(() => {
      if (target === 'eqp') {
        productCardRef.value?.focusEqp?.();
      } else if (target === 'lot') {
        productCardRef.value?.focusLot?.();
      }
      store.focusTarget = null;
    });
  },
);

async function handleEqpSearch(): Promise<void> {
  const raw = store.eqpId.trim();
  await store.getEqpInfo(raw);
}

async function handleEqpEnter(): Promise<void> {
  const raw = store.eqpId;
  const { isValid, parsedId } = barcodeStyleEqpId(raw);
  if (!isValid) return;

  store.eqpId = parsedId;
  await store.getEqpInfo(parsedId);
}

async function handleLotSearch(): Promise<void> {
  const raw = store.lotId.trim();
  await store.getLotInfo(raw);
}

async function handleLotEnter(): Promise<void> {
  const raw = store.lotId;
  const { isValid, parsedId } = barcodeStyleLotId(raw);
  if (!isValid) return;

  store.lotId = parsedId;
  await store.getLotInfo(parsedId);
}

async function handleExecuteIn(): Promise<void> {
  await store.executeInOut('IN');
}

async function handleExecuteOut(): Promise<void> {
  await store.executeInOut('OUT');
}

function handleClose(): void {
  void router.push({ path: `/${ROUTE.main}` });
}

function onNativeEnter(): void {
  if (!store.isLotDisabled && store.lotId && !store.isBtnInEnabled) {
    void handleLotEnter();
  } else {
    void handleEqpEnter();
  }
}

onMounted(() => {
  window.addEventListener(NATIVE_ENTER_EVENT, onNativeEnter);

  void nextTick(() => {
    productCardRef.value?.focusEqp?.();
  });
});

onUnmounted(() => {
  window.removeEventListener(NATIVE_ENTER_EVENT, onNativeEnter);
});
</script>
