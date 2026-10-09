<template>
  <main class="remote-machine-select-canvas">
    <section class="remote-machine-select">
      <q-toolbar class="remote-machine-select__header">
        <BaseButton
          class="remote-machine-select__back"
          variant="link"
          size="small"
          icon-only
          aria-label="뒤로"
          @click="goBack"
        >
          <q-icon name="sym_o_arrow_back" size="24px" aria-hidden="true" />
        </BaseButton>
        <q-toolbar-title>진행 장비 선택</q-toolbar-title>
      </q-toolbar>

      <div class="remote-machine-select__content">
        <q-card flat bordered class="remote-machine-select__card" aria-label="LOT 정보">
          <div class="remote-machine-select__field-row">
            <BaseInput
              class="remote-machine-select__field"
              label="LOT No."
              :model-value="state.lotId"
              stack-label
              readonly
            />
            <BaseInput
              :class="[
                'remote-machine-select__field',
                `remote-machine-select__field--${statusKind}`,
              ]"
              label="상태"
              :model-value="state.status"
              stack-label
              readonly
            />
          </div>
          <BaseInput
            class="remote-machine-select__field"
            label="제품"
            :model-value="state.product"
            stack-label
            readonly
          />
          <BaseInput
            class="remote-machine-select__field"
            label="현재공정"
            :model-value="state.currentOper"
            stack-label
            readonly
          />
          <BaseInput
            class="remote-machine-select__field"
            label="다음공정"
            :model-value="state.nextOper"
            stack-label
            readonly
          />
          <BaseInput
            class="remote-machine-select__field"
            label="RECIPE"
            :model-value="state.recipe"
            stack-label
            readonly
          />
          <BaseInput
            class="remote-machine-select__field"
            label="PR"
            :model-value="state.pr"
            stack-label
            readonly
          />
          <div class="remote-machine-select__field-row remote-machine-select__field-row--triple">
            <BaseInput
              class="remote-machine-select__field"
              label="REWORK"
              :model-value="state.rework"
              stack-label
              readonly
            />
            <BaseInput
              class="remote-machine-select__field"
              label="HOLD"
              :model-value="state.hold"
              stack-label
              readonly
            />
            <BaseInput
              class="remote-machine-select__field"
              label="수량"
              :model-value="state.qty"
              stack-label
              readonly
            />
          </div>
          <BaseInput
            class="remote-machine-select__field"
            label="기준장비"
            :model-value="state.eqpGroup"
            stack-label
            readonly
          />
          <BaseInput
            v-model="state.machineSelect"
            class="remote-machine-select__field"
            label="장비선택"
            id="remote-machine-select-machine"
            stack-label
            autocomplete="off"
            autocapitalize="characters"
            :disabled="state.machineDisabled || state.loading"
            @update:model-value="state.machineSelect = String($event ?? '').toUpperCase()"
            @keydown.enter.prevent="handleMachineEnter"
          />
        </q-card>

        <q-card
          flat
          bordered
          class="remote-machine-select__card remote-machine-select__port-card"
          aria-label="PORT 정보"
        >
          <div class="remote-machine-select__port-row">
            <div class="remote-machine-select__port-control">
              <BaseDropdownList
                class="remote-machine-select__port-select"
                label="PORT"
                placeholder="Search"
                stack-label
                :model-value="state.selectedPort || undefined"
                :options="portOptions"
                :disabled="state.loading"
                searchable
                @update:model-value="handlePortChange"
              >
                <template #indicator>
                  <q-icon name="sym_o_search" size="16px" aria-hidden="true" />
                </template>
              </BaseDropdownList>
            </div>
            <BaseButton
              class="remote-machine-select__refresh"
              variant="secondary"
              :disabled="state.refreshDisabled || state.loading"
              @click="setPortStatus"
            >
              조회
            </BaseButton>
          </div>
          <BaseInput
            :class="[
              'remote-machine-select__field',
              `remote-machine-select__field--${state.portStatusKind}`,
            ]"
            label="상태"
            :model-value="state.portStatus"
            stack-label
            readonly
          />
        </q-card>
      </div>

      <footer class="remote-machine-select__footer">
        <BaseButton
          class="remote-machine-select__button remote-machine-select__button--confirm"
          variant="primary"
          size="large"
          :disabled="state.okDisabled || state.loading"
          :loading="state.loading"
          @click="execute"
        >
          확인
        </BaseButton>
        <BaseButton
          class="remote-machine-select__button remote-machine-select__button--close"
          variant="tertiary"
          size="large"
          @click="goBack"
          >닫기</BaseButton
        >
      </footer>

      <div v-if="state.loading" class="remote-machine-select__loading" aria-label="처리중">
        <BaseLoading size="large" />
      </div>

      <BaseModal
        :open="Boolean(state.dialogMessage)"
        :title="state.dialogTitle"
        :closable="false"
        :overlay-closable="false"
        :width="320"
        @after-close="handleDialogClosed"
      >
        <p class="remote-machine-select__dialog-message" role="alert">{{ state.dialogMessage }}</p>
        <template #footer>
          <BaseButton
            class="remote-machine-select__dialog-confirm"
            variant="primary"
            @click="dismissDialog"
            >확인</BaseButton
          >
        </template>
      </BaseModal>
      <BaseModal
        :open="confirmDialog.open"
        :title="confirmDialog.title"
        :closable="false"
        :overlay-closable="false"
        :width="320"
      >
        <p class="remote-machine-select__dialog-message">{{ confirmDialog.message }}</p>
        <template #footer>
          <BaseButton variant="tertiary" @click="resolveConfirm(false)">취소</BaseButton>
          <BaseButton variant="primary" @click="resolveConfirm(true)">확인</BaseButton>
        </template>
      </BaseModal>
    </section>
  </main>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import {
  BaseButton,
  BaseDropdownList,
  type BaseDropdownValue,
  BaseInput,
  BaseLoading,
  BaseModal,
} from 'src/components/base';
import { ROUTE } from 'src/constants/routes';
import { useMainStore } from 'src/features/main/stores/main.store';
import { barcodeStyleEqpId } from 'src/utils/barcode-style';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useRemoteMachineSelect } from '../composables/useRemoteMachineSelect';
import { getRemoteMachineSelectMockCase } from '../mocks/remote-machine-select.mock';
import type { RemoteMachineChildFlow } from '../types/remote-machine-select.types';

defineOptions({ name: 'RemoteMachineSelectPage' });

const route = useRoute();
const router = useRouter();
const mainStore = useMainStore();
const { facility, operatorId, operatorName } = storeToRefs(mainStore);
function queryString(value: unknown): string {
  if (Array.isArray(value)) return queryString(value[0]);
  return typeof value === 'string' ? value : '';
}
const mockPreview =
  import.meta.env.DEV && queryString(route.query.mock) === '1'
    ? getRemoteMachineSelectMockCase(queryString(route.query.mockCase))
    : null;
const confirmDialog = reactive({ open: false, title: '', message: '' });
let confirmResolver: ((accepted: boolean) => void) | undefined;
let focusMachineAfterDialog = false;

function confirm(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    confirmDialog.title = title;
    confirmDialog.message = message;
    confirmDialog.open = true;
    confirmResolver = resolve;
  });
}

function resolveConfirm(accepted: boolean): void {
  confirmDialog.open = false;
  confirmResolver?.(accepted);
  confirmResolver = undefined;
}

const { state, statusKind, dismissDialog, execute, searchData, setEQPInfo, setPortStatus } =
  useRemoteMachineSelect({
    facility: facility.value,
    lotId: mockPreview?.lotId ?? queryString(route.query.LOTID),
    operatorId: operatorId.value,
    operatorName: operatorName.value,
    confirm,
    onComplete: returnToESheet,
    onOpenChildScreen: openChildScreen,
    onRequestMachineFocus: requestMachineFocus,
  });
const portOptions = computed(() => state.portList.map((port) => ({ label: port, value: port })));

function handlePortChange(value: BaseDropdownValue): void {
  state.selectedPort = typeof value === 'string' ? value : '';
  void setPortStatus();
}

function goBack(): void {
  returnToESheet();
}

function returnToESheet(): void {
  void router.replace({
    path: `/${ROUTE.esheet}`,
    query: { lotId: state.lotId },
  });
}

function openChildScreen(flow: RemoteMachineChildFlow, lotId: string): void {
  const routeByFlow = {
    meas: ROUTE.measRemote,
    imp: ROUTE.remoteImpMain,
    cvd: ROUTE.remoteCvd,
  } as const;
  void router.replace({ path: `/${routeByFlow[flow]}`, query: { LOTID: lotId } });
}

function requestMachineFocus(): void {
  focusMachineAfterDialog = true;
}

function handleDialogClosed(): void {
  if (!focusMachineAfterDialog || state.dialogMessage) return;

  focusMachineAfterDialog = false;
  void nextTick(() => {
    const input = document.getElementById(
      'remote-machine-select-machine',
    ) as HTMLInputElement | null;
    input?.focus();
    input?.select();
  });
}

function handleMachineEnter(): void {
  const { isValid, parsedId } = barcodeStyleEqpId(state.machineSelect);
  state.machineSelect = parsedId;
  if (!isValid) return;
  void setEQPInfo();
}

onMounted(async () => {
  if (!state.lotId) return;

  await searchData(state.lotId);
  if (mockPreview?.machineId && !state.machineDisabled && !state.dialogMessage) {
    state.machineSelect = `${mockPreview.machineId}-${mockPreview.portId}`;
    await setEQPInfo();
  }
});

onBeforeUnmount(() => {
  confirmResolver?.(false);
});
</script>

<style scoped src="../styles/remote-machine-select.css"></style>
