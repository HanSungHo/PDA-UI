<template>
  <BaseScreen
    class="machine-status-detail-screen"
    title="장비상태(변경)"
    ok-label="변경"
    cancel-label="닫기"
    :ok-loading="store.isLoading"
    :cancel-disabled="store.isLoading"
    @ok="handleChange"
    @cancel="handleClose"
  >
    <!-- Card 1: Equipment Search -->
    <MachineStatusDetailSearchCard
      ref="searchCardRef"
      :eqp-id="store.eqpId"
      :is-loading="store.isLoading"
      @update:eqp-id="store.eqpId = $event"
      @search-eqp="handleEqpSearch"
      @eqp-enter="handleEqpEnter"
    />

    <!-- Card 2: Equipment Status Read-Only Info -->
    <MachineStatusDetailInfoCard
      :facility="store.facility"
      :main-status="store.mainStatus"
      :sub-status="store.subStatus"
      :fdc-state="store.fdcState"
      :final-work-time="store.finalWorkTime"
    />

    <!-- Card 3: Change Fields (COMMENT, 장비상태, DOWN CODE, 작업자) -->
    <MachineStatusDetailChangeCard
      :comment="store.comment"
      :comment-options="store.commentOptions"
      :selected-eqp-state="store.selectedEqpState"
      :status-options="store.statusOptions"
      :selected-down-code="store.selectedDownCode"
      :down-code-options="store.downCodeOptions"
      :operator="store.operator"
      :is-loading="store.isLoading"
      @update:comment="store.comment = $event"
      @update:selected-eqp-state="handleEqpStateSelect"
      @update:selected-down-code="handleDownCodeSelect"
      @comment-enter="handleCommentEnter"
    />

    <!-- Card 4: Chamber Batch Checkbox & Machine Inform Button -->
    <MachineStatusDetailChamberCard
      :is-chamber-checked="store.isChamberChecked"
      :is-loading="store.isLoading"
      @update:is-chamber-checked="handleChamberToggle"
      @machine-inform="handleMachineInform"
    />

    <!-- Global Loading Overlay -->
    <div v-if="store.isLoading" class="machine-status-detail-loading-overlay" aria-label="처리중">
      <BaseLoading size="large" />
    </div>

    <!-- Alert Modal (OkDialog parity) -->
    <BaseModal
      :open="store.alertDialog.open"
      :title="store.alertDialog.title"
      :closable="false"
      :overlay-closable="false"
      :width="320"
    >
      <p class="machine-status-detail-dialog-message" role="alert">
        {{ store.alertDialog.message }}
      </p>
      <template #footer>
        <BaseButton
          variant="link"
          size="medium"
          :label="COMMON_FIELD.BTNOKSTR"
          @click="handleAlertClose"
        />
      </template>
    </BaseModal>

    <!-- Confirmation Modal (OkCancelDialog parity) -->
    <BaseModal
      :open="store.confirmDialog.open"
      :title="store.confirmDialog.title"
      :closable="false"
      :overlay-closable="false"
      :width="320"
    >
      <p class="machine-status-detail-dialog-message" role="alert">
        {{ store.confirmDialog.message }}
      </p>
      <template #footer>
        <BaseButton
          variant="link"
          size="medium"
          :label="store.confirmDialog.cancelText"
          @click="store.cancelConfirm"
        />
        <BaseButton
          variant="link"
          size="medium"
          :label="store.confirmDialog.confirmText"
          @click="store.acceptConfirm"
        />
      </template>
    </BaseModal>
  </BaseScreen>
</template>

<script setup lang="ts">
import { BaseButton, BaseLoading, BaseModal, BaseScreen } from 'src/components/base';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { ROUTE } from 'src/constants/routes';
import { barcodeStyleEqpId } from 'src/utils/barcode-style';
import { CommonUtil } from 'src/utils/common-util';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import MachineStatusDetailChamberCard from '../components/MachineStatusDetailChamberCard.vue';
import MachineStatusDetailChangeCard from '../components/MachineStatusDetailChangeCard.vue';
import MachineStatusDetailInfoCard from '../components/MachineStatusDetailInfoCard.vue';
import MachineStatusDetailSearchCard from '../components/MachineStatusDetailSearchCard.vue';
import { useMachineStatusDetailStore } from '../stores/machine-status-detail.store';

defineOptions({ name: 'MachineStatusDetailPage' });

const route = useRoute();
const router = useRouter();
const store = useMachineStatusDetailStore();

const searchCardRef = ref<{ focusEqp?: () => void } | null>(null);

function navigateBack(): void {
  void router.push({ path: `/${ROUTE.main}` });
}

watch(
  () => store.focusTarget,
  (target) => {
    if (!target) return;
    void nextTick(() => {
      if (target === 'eqp') {
        searchCardRef.value?.focusEqp?.();
      }
      store.focusTarget = null;
    });
  },
);

watch(
  () => store.isCompleted,
  (completed) => {
    if (!completed) return;
    if (!store.alertDialog.open) {
      store.isCompleted = false;
      navigateBack();
    }
  },
);

async function handleEqpSearch(): Promise<void> {
  await store.setEQPInfo(store.eqpId);
  searchCardRef.value?.focusEqp?.();
}

async function handleEqpEnter(): Promise<void> {
  const { isValid, parsedId } = barcodeStyleEqpId(store.eqpId);
  if (isValid) {
    store.eqpId = parsedId;
    await store.setEQPInfo(parsedId);
  } else {
    store.clearInfo();
  }
  searchCardRef.value?.focusEqp?.();
}

function handleCommentEnter(): void {
  CommonUtil.hideKeyboard();
}

async function handleEqpStateSelect(newStatusKey: string): Promise<void> {
  await store.selectEqpState(newStatusKey);
}

async function handleDownCodeSelect(newDownCodeKey: string): Promise<void> {
  await store.selectDownCode(newDownCodeKey);
}

async function handleChamberToggle(isChecked: boolean): Promise<void> {
  await store.handleChamberChecked(isChecked);
}

function handleMachineInform(): void {
  void router.push({
    path: `/${ROUTE.machineInform}`,
    query: { MACHINENAME: store.eqpId },
  });
}

async function handleChange(): Promise<void> {
  await store.changeData();
}

function handleAlertClose(): void {
  store.closeAlert();
  if (store.isCompleted) {
    store.isCompleted = false;
    navigateBack();
  }
}

function handleClose(): void {
  navigateBack();
}

function onNativeEnter(): void {
  void handleEqpEnter();
}

onMounted(async () => {
  store.resetState();

  window.addEventListener(NATIVE_ENTER_EVENT, onNativeEnter);

  const initialEqpId = (route.query.EQPID || route.query.eqpId || '') as string;
  if (initialEqpId.trim()) {
    store.eqpId = initialEqpId.trim().toUpperCase();
    await store.setEQPInfo(store.eqpId);
  }

  void nextTick(() => {
    searchCardRef.value?.focusEqp?.();
  });
});

onUnmounted(() => {
  window.removeEventListener(NATIVE_ENTER_EVENT, onNativeEnter);
  store.resetState();
});
</script>

<style scoped>
.machine-status-detail-loading-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--component-opacity-opacity-scrim);
}

.machine-status-detail-dialog-message {
  margin: 0;
  padding: var(--spacing-space-1) 0;
  font-size: var(--ds-font-size-md);
  line-height: var(--ds-line-height-md);
  color: var(--ds-color-text);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
