<template>
  <BaseScreen class="remote-imp" title="진행 장비 선택">
    <section class="ds-screen__card" aria-label="진행 장비">
      <div class="ds-screen__card-row">
        <BaseInput label="LOT No." :model-value="state.lotId" readonly />
        <BaseInput
          :class="portStateClass"
          label="PORT 상태"
          :model-value="state.machineState"
          readonly
        />
      </div>
      <BaseInput label="기준장비" :model-value="state.standardMachine" readonly />
      <BaseInput
        id="remote-imp-machine"
        label="진행장비"
        :model-value="state.machineName"
        autocapitalize="characters"
        autocomplete="off"
        :disabled="state.machineDisabled"
        @update:model-value="updateMachineName(String($event ?? ''))"
        @keydown.enter.prevent="handleMachineEnter"
      />
      <BaseDropdownList
        label="진행 Rcp"
        :model-value="state.recipe || undefined"
        :options="recipeOptions"
        :disabled="state.recipeDisabled || !recipeOptions.length"
        @update:model-value="changeRecipe"
      />
      <div class="ds-screen__card-row">
        <BaseDropdownList
          class="remote-imp-row-field"
          label="PORT"
          :model-value="state.port || undefined"
          :options="portOptions"
          :disabled="state.portDisabled || !portOptions.length"
          @update:model-value="changePort"
        />
        <BaseButton
          variant="secondary"
          size="small"
          :disabled="!state.clearPortEnabled"
          @click="executeClearPort"
        >
          초기화
        </BaseButton>
        <BaseButton variant="secondary" size="small" @click="showBatchUnavailable">
          동시진행
        </BaseButton>
      </div>
      <div class="ds-screen__card-row remote-imp-carry">
        <BaseCheckbox
          class="remote-imp-carry-checkbox"
          label="반송"
          :model-value="state.carry"
          :disabled="!state.carryEnabled"
          @update:model-value="setCarry"
        />
        <BaseDropdownList
          class="remote-imp-row-field remote-imp-hug-label"
          label="BAY"
          :model-value="state.bay || undefined"
          :options="bayOptions"
          :disabled="!state.carry"
          @update:model-value="changeBay"
        />
        <BaseDropdownList
          class="remote-imp-row-field remote-imp-hug-label"
          label="STK"
          :model-value="state.stk || undefined"
          :options="stkOptions"
          :disabled="!state.carry"
          @update:model-value="state.stk = String($event ?? '')"
        />
      </div>
    </section>

    <section class="ds-screen__card remote-imp-product" aria-label="제품 정보">
      <BaseInput
        v-for="field in productFields"
        :key="field.label"
        class="remote-imp-product-field"
        :label="field.label"
        :model-value="field.value"
        readonly
      />
    </section>

    <section class="ds-screen__card remote-imp-comment-card" aria-label="COMMENT">
      <div class="ds-screen__card-row remote-imp-comment">
        <BaseInput
          class="remote-imp-comment-count"
          label="COMMENT"
          :model-value="state.commentCount"
          readonly
        />
        <span class="remote-imp-comment-unit">개</span>
        <BaseButton
          variant="secondary"
          size="small"
          :disabled="!state.commentEnabled"
          @click="executeComment"
        >
          읽기
        </BaseButton>
      </div>
    </section>

    <BaseModal
      :open="Boolean(activeAlert)"
      :title="activeAlert?.title"
      :aria-label="activeAlert?.title"
      :closable="false"
      :overlay-closable="false"
      :width="320"
    >
      <p class="remote-imp-dialog-message" role="alert">{{ activeAlert?.message }}</p>
      <template #footer>
        <BaseButton variant="primary" @click="alerts.shift()">확인</BaseButton>
      </template>
    </BaseModal>
    <BaseModal
      :open="Boolean(confirmDialog)"
      :title="confirmDialog?.title"
      :aria-label="confirmDialog?.title"
      :closable="false"
      :overlay-closable="false"
      :width="320"
    >
      <p class="remote-imp-dialog-message">{{ confirmDialog?.message }}</p>
      <template #footer>
        <BaseButton variant="tertiary" @click="resolveConfirm(false)">취소</BaseButton>
        <BaseButton variant="primary" @click="resolveConfirm(true)">확인</BaseButton>
      </template>
    </BaseModal>

    <template #footer>
      <BaseButton
        variant="primary"
        size="medium"
        :disabled="!state.startEnabled || state.starting"
        @click="executeStart"
      >
        START
      </BaseButton>
      <BaseButton variant="tertiary" size="medium" @click="goBack">취소</BaseButton>
    </template>
  </BaseScreen>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import type { BaseDropdownValue } from 'src/components/base';
import {
  BaseButton,
  BaseCheckbox,
  BaseDropdownList,
  BaseInput,
  BaseModal,
  BaseScreen,
} from 'src/components/base';
import { ROUTE } from 'src/constants/routes';
import { useMainStore } from 'src/features/main/stores/main.store';
import { barcodeStyleEqpId } from 'src/utils/barcode-style';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { type ImpDialog, useRemoteImpMain } from '../composables/useRemoteImpMain';

defineOptions({ name: 'RemoteImpMainPage' });
const route = useRoute();
const router = useRouter();
const { facility, operatorId } = storeToRefs(useMainStore());
const alerts = ref<ImpDialog[]>([]);
const activeAlert = computed(() => alerts.value[0]);
const confirmDialog = ref<ImpDialog | null>(null);
let confirmResolver: ((accepted: boolean) => void) | undefined;
const query = (key: string) => {
  const raw = route.query[key];
  return typeof raw === 'string' ? raw : Array.isArray(raw) ? (raw[0] ?? '') : '';
};
function confirm(dialog: ImpDialog): Promise<boolean> {
  confirmResolver?.(false);
  confirmDialog.value = dialog;
  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}
function resolveConfirm(accepted: boolean): void {
  confirmDialog.value = null;
  confirmResolver?.(accepted);
  confirmResolver = undefined;
}
const screen = useRemoteImpMain({
  facility: facility.value,
  operatorId: operatorId.value,
  alert: (dialog) => alerts.value.push(dialog),
  confirm,
  onComplete: goBack,
  onComment: (commentQuery) => {
    void (async () => {
      await router.replace({
        path: `/${ROUTE.remoteImpMain}`,
        query: { ...route.query, EQPID: state.machineName },
      });
      await router.push({ path: `/${ROUTE.commentList}`, query: commentQuery });
    })();
  },
});
const {
  state,
  initDisable,
  setLotInfo,
  getMachineInfo,
  updateMachineName,
  setCarry,
  setStkSpinner,
  selectPort,
  memorizationRecipe,
  executeClearPort,
  executeComment,
  executeStart,
} = screen;
const productFields = computed(() => [
  { label: 'JOB CODE', value: state.jobCode },
  { label: '제품명', value: state.product },
  { label: '현재공정', value: state.currentOperation },
  { label: '수량', value: state.qty },
  { label: 'FACILITY', value: state.facility },
  { label: 'CUSTOMER', value: state.customer },
  { label: 'SALE TYPE', value: state.saleType },
  { label: "담당 Eng'r", value: state.engineer },
  { label: 'PACKING', value: state.packing },
  { label: 'GOOD CHIPS', value: state.goodChips },
]);
const portStateClass = computed(() => `remote-imp-port-state--${state.machineState.toLowerCase()}`);
const options = (items: string[]) => items.map((item) => ({ label: item, value: item }));
const recipeOptions = computed(() => options(state.recipeList));
const portOptions = computed(() => options(state.portList));
const bayOptions = computed(() => options(state.bayList));
const stkOptions = computed(() => options(state.stkList));
function changeRecipe(raw: BaseDropdownValue): void {
  state.recipe = String(raw ?? '');
  void memorizationRecipe();
}
function changePort(raw: BaseDropdownValue): void {
  void selectPort(String(raw ?? ''));
}
function changeBay(raw: BaseDropdownValue): void {
  state.bay = String(raw ?? '');
  void setStkSpinner();
}
function handleMachineEnter(): void {
  const parsed = barcodeStyleEqpId(state.machineName);
  if (parsed.isValid) void getMachineInfo(parsed.parsedId);
  else updateMachineName('');
}
function showBatchUnavailable(): void {
  alerts.value.push({ title: '경고', message: '동시진행 화면은 아직 구현되지 않았습니다.' });
}
function goBack(): void {
  void router.replace({ path: `/${ROUTE.esheet}`, query: { lotId: state.lotId } });
}
onMounted(async () => {
  initDisable();
  const lotId = query('LOTID');
  if (lotId) await setLotInfo(lotId);
  const eqpId = query('EQPID');
  if (eqpId && !state.machineDisabled) await getMachineInfo(eqpId);
});
</script>

<style scoped src="../styles/remote-imp-main.css"></style>
