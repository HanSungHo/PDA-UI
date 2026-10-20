<template>
  <main class="remote-imp-canvas">
    <section class="remote-imp-page" aria-labelledby="remote-imp-title">
      <header class="remote-imp-header"><h1 id="remote-imp-title">진행 장비 선택</h1></header>
      <div class="remote-imp-content">
        <section class="remote-imp-card remote-imp-machine" aria-label="진행 장비">
          <div class="remote-imp-row">
            <BaseInput
              class="remote-imp-field"
              label="LOT NO."
              :model-value="display(state.lotId)"
              stack-label
              readonly
            />
            <BaseInput
              :class="['remote-imp-field', portStateClass]"
              label="PORT 상태"
              :model-value="display(state.machineState)"
              stack-label
              readonly
            />
          </div>
          <BaseInput
            class="remote-imp-field"
            label="기준장비"
            :model-value="display(state.standardMachine)"
            stack-label
            readonly
          />
          <BaseInput
            id="remote-imp-machine"
            class="remote-imp-field"
            label="진행장비"
            :model-value="state.machineName"
            placeholder="Null"
            stack-label
            autocapitalize="characters"
            autocomplete="off"
            :disabled="state.machineDisabled"
            @update:model-value="updateMachineName(String($event ?? ''))"
            @keydown.enter.prevent="handleMachineEnter"
          />
          <div class="remote-imp-select">
            <BaseDropdownList
              class="remote-imp-field"
              label="진행 Rcp"
              stack-label
              :model-value="state.recipe || 'Null'"
              :options="recipeOptions"
              :disabled="state.recipeDisabled || !recipeOptions.length"
              @update:model-value="changeRecipe"
            />
          </div>
          <div class="remote-imp-select">
            <BaseDropdownList
              class="remote-imp-field"
              label="PORT"
              stack-label
              :model-value="state.port || 'Null'"
              :options="portOptions"
              :disabled="state.portDisabled || !portOptions.length"
              @update:model-value="changePort"
            />
          </div>
          <div class="remote-imp-actions">
            <BaseButton
              variant="secondary"
              :disabled="!state.clearPortEnabled"
              @click="executeClearPort"
              >초기화</BaseButton
            >
            <BaseButton variant="secondary" @click="showBatchUnavailable">동시진행</BaseButton>
          </div>
        </section>

        <section class="remote-imp-card remote-imp-carry" aria-label="반송 설정">
          <BaseCheckbox
            label="반송"
            :model-value="state.carry"
            :disabled="!state.carryEnabled"
            @update:model-value="setCarry"
          />
          <div class="remote-imp-select">
            <BaseDropdownList
              class="remote-imp-field"
              label="BAY"
              stack-label
              :model-value="state.bay || 'Null'"
              :options="bayOptions"
              :disabled="!state.carry"
              @update:model-value="changeBay"
            />
          </div>
          <div class="remote-imp-select">
            <BaseDropdownList
              class="remote-imp-field"
              label="STK"
              stack-label
              :model-value="state.stk || 'Null'"
              :options="stkOptions"
              :disabled="!state.carry"
              @update:model-value="state.stk = String($event ?? '')"
            />
          </div>
        </section>

        <section class="remote-imp-card remote-imp-product" aria-label="제품 정보">
          <BaseInput
            v-for="field in productFields"
            :key="field.label"
            class="remote-imp-field"
            :label="field.label"
            :model-value="display(field.value)"
            stack-label
            readonly
          />
        </section>

        <section class="remote-imp-card remote-imp-comment" aria-label="Comment">
          <BaseInput
            class="remote-imp-field remote-imp-comment-count"
            label="Comment"
            :model-value="state.commentCount"
            stack-label
            readonly
          />
          <span class="remote-imp-comment-unit">개</span>
          <BaseButton variant="secondary" :disabled="!state.commentEnabled" @click="executeComment"
            >읽기</BaseButton
          >
        </section>
      </div>
      <footer class="remote-imp-footer">
        <BaseButton
          class="remote-imp-footer-button remote-imp-footer-button--confirm"
          variant="primary"
          size="large"
          :disabled="!state.startEnabled || state.starting"
          @click="executeStart"
          >확인</BaseButton
        >
        <BaseButton class="remote-imp-footer-button" variant="tertiary" size="large" @click="goBack"
          >취소</BaseButton
        >
      </footer>
    </section>

    <BaseModal
      :open="Boolean(activeAlert)"
      :title="activeAlert?.title"
      :closable="false"
      :overlay-closable="false"
      :width="320"
    >
      <p class="remote-imp-dialog-message" role="alert">{{ activeAlert?.message }}</p>
      <template #footer
        ><BaseButton variant="primary" @click="alerts.shift()">확인</BaseButton></template
      >
    </BaseModal>
    <BaseModal
      :open="Boolean(confirmDialog)"
      :title="confirmDialog?.title"
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
  </main>
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
const display = (value: string) => value || 'Null';
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
const portStateClass = computed(() => `remote-imp-field--${state.machineState.toLowerCase()}`);
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
