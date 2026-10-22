<template>
  <main v-show="!isShelfIncomingRoute" class="esheet">
    <header class="esheet__header">
      <BaseButton
        class="icon-button"
        variant="link"
        size="small"
        icon-only
        aria-label="뒤로가기"
        @click="goBack"
      >
        <ArrowLeftOutlined aria-hidden="true" />
      </BaseButton>
      <h1>ESHEET</h1>
    </header>

    <div class="esheet__content">
      <section class="summary-grid" aria-label="LOT 정보">
        <div class="summary-field summary-field--empty">
          <span aria-hidden="true">Null</span>
        </div>
        <BaseInput
          :model-value="viewData?.jobCode ?? ''"
          aria-label="Job code"
          readonly
          class="summary-field summary-input"
        >
          <template #suffix>
            <span class="esheet-field-clear" aria-hidden="true"
              ><CloseOutlined class="esheet-field-clear__icon"
            /></span>
          </template>
        </BaseInput>
        <BaseInput
          :model-value="`TAT : ${viewData?.tat ?? ''}`"
          aria-label="TAT"
          readonly
          class="summary-field summary-input"
        >
          <template #suffix>
            <span class="esheet-field-clear" aria-hidden="true"
              ><CloseOutlined class="esheet-field-clear__icon"
            /></span>
          </template>
        </BaseInput>
      </section>

      <section class="lot-search">
        <BaseInput
          v-model="lotInput"
          aria-label="LOT"
          :loading="isLoading"
          @keyup.enter="handleLotEnter"
        >
          <template #suffix>
            <BaseButton
              variant="link"
              size="small"
              icon-only
              aria-label="LOT 조회"
              :disabled="isLoading"
              @click="searchLot"
            >
              <SearchOutlined aria-hidden="true" />
            </BaseButton>
          </template>
        </BaseInput>
      </section>

      <nav class="mode-tabs">
        <BaseButton
          v-for="tab in tabs"
          :key="tab"
          :class="['mode-tab', { active: tab !== 'M' }]"
          :variant="tab !== 'M' ? 'primary' : 'tertiary'"
          :disabled="tab === 'M' && !viewData?.maskActionAvailable"
          @click="handleModeTab(tab)"
        >
          {{ tab }}
        </BaseButton>
      </nav>

      <section class="lot-card" aria-label="LOT 정보">
        <div class="lot-card__top">
          <div>
            <strong>{{ viewData?.processCode ?? '' }}</strong>
            <div class="status-row">
              <BaseButton
                class="status status--normal"
                variant="tertiary"
                size="xs"
                :aria-label="`${viewData?.lotType || '현재'} 상태 삭제`"
              >
                {{ viewData?.lotType || '–' }}
                <template #suffix><span aria-hidden="true">×</span></template>
              </BaseButton>
              <BaseButton
                class="quantity"
                variant="tertiary"
                size="xs"
                :aria-label="`${viewData?.lotQuantity || '현재'} 수량 삭제`"
              >
                {{ viewData?.lotQuantity || '–' }}
                <template #suffix><span aria-hidden="true">×</span></template>
              </BaseButton>
              <BaseButton
                class="status status--wait"
                variant="tertiary"
                size="xs"
                :aria-label="`${viewData?.lotStatus || '현재'} 상태 삭제`"
              >
                {{ viewData?.lotStatus || '–' }}
                <template #suffix><span aria-hidden="true">×</span></template>
              </BaseButton>
            </div>
          </div>
        </div>
        <div class="lot-card__remaining">
          <h2>잔여</h2>
          <BaseInput
            class="remaining-input"
            :model-value="viewData?.remainingLayers ?? ''"
            aria-label="잔여"
            readonly
          />
        </div>
      </section>

      <section class="process-card">
        <ESheetProcessGrid
          :rows="viewData?.processRows ?? []"
          :selected-process-id="selectedProcessId"
          @select="selectedProcessId = $event"
          @open-menu="isDrawMenuOpen = true"
          @open-edc="openEdc"
        />
      </section>

      <section class="details-card" aria-label="상세 정보">
        <BaseInput
          class="detail-field"
          :model-value="viewData?.equipmentGroup ?? ''"
          aria-label="기준장비"
          readonly
        >
          <template #suffix>
            <span class="esheet-field-clear" aria-hidden="true"
              ><CloseOutlined class="esheet-field-clear__icon"
            /></span>
          </template>
        </BaseInput>
        <BaseInput
          class="detail-field"
          :model-value="viewData?.product ?? ''"
          aria-label="제품"
          readonly
        >
          <template #suffix>
            <span class="esheet-field-clear" aria-hidden="true"
              ><CloseOutlined class="esheet-field-clear__icon"
            /></span>
          </template>
        </BaseInput>
        <BaseInput
          class="detail-field"
          :model-value="viewData?.facility ?? ''"
          aria-label="공장"
          readonly
        >
          <template #suffix>
            <span class="esheet-field-clear" aria-hidden="true"
              ><CloseOutlined class="esheet-field-clear__icon"
            /></span>
          </template>
        </BaseInput>
      </section>

      <section class="lot-number" aria-label="공정번호">
        <BaseCheckbox v-model="processNumberEnabled" label="공정번호" />
      </section>
    </div>

    <footer class="action-bar">
      <BaseButton class="primary" variant="primary">母 LOT</BaseButton>
      <BaseButton variant="secondary">PCM</BaseButton>
      <BaseButton variant="secondary">F</BaseButton>
      <BaseButton class="close-button" variant="tertiary" @click="goBack">닫기</BaseButton>
    </footer>

    <BaseModal
      :open="isErrorDialogOpen"
      :title="errorDialogTitle"
      :width="340"
      :closable="false"
      :overlay-closable="false"
      class="esheet-error-dialog"
      @cancel="closeErrorDialog"
      @update:open="handleErrorDialogOpenChange"
    >
      <p class="esheet-error-dialog__message">{{ errorMessage }}</p>
      <template #footer>
        <div class="esheet-error-dialog__actions">
          <BaseButton variant="primary" @click="closeErrorDialog">확인</BaseButton>
        </div>
      </template>
    </BaseModal>
    <DrawMenuList
      :open="isDrawMenuOpen"
      :title="selectedProcess?.name ?? ''"
      :lot-id="lotInput"
      :factory-name="viewData?.facility ?? ''"
      :product-name="viewData?.product ?? ''"
      :route-name="viewData?.processCode ?? ''"
      area="DIFF"
      :row="selectedDrawMenuRow"
      @close="isDrawMenuOpen = false"
      @select-action="handleDrawMenuAction"
    />
    <BackupBayDialog
      :model-value="isBackupBayOpen"
      @update:model-value="isBackupBayOpen = $event"
    />
    <BaseModal
      :open="isMaskLocationOpen"
      :width="352"
      :closable="false"
      :overlay-closable="false"
      class="esheet-mask-location-modal"
      @update:open="isMaskLocationOpen = $event"
    >
      <MaskLocationDialog :lot-id="lotInput" @ok="isMaskLocationOpen = false" />
    </BaseModal>
  </main>
  <RouterView v-if="isShelfIncomingRoute" />
</template>

<script setup lang="ts">
import { ArrowLeftOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons-vue';
import { computed, nextTick, onMounted, ref } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';

import { BaseButton, BaseCheckbox, BaseInput, BaseModal } from '../components/base';
import BackupBayDialog from '../components/esheet/BackupBayDialog.vue';
import { ROUTE } from '../constants/routes';
import { useEenAddStore } from '../features/een-add/stores/een-add.store';
import {
  DRAW_MENU_ACTION_ID,
  DRAW_MENU_ACTION_TARGET,
} from '../features/esheet/components/draw-menu-list/draw-menu-list.constants';
import type { DrawMenuActionItem } from '../features/esheet/components/draw-menu-list/draw-menu-list.types';
import DrawMenuList from '../features/esheet/components/draw-menu-list/DrawMenuList.vue';
import ESheetProcessGrid from '../features/esheet/components/ESheetProcessGrid.vue';
import MaskLocationDialog from '../features/esheet/components/mask-location-dialog/MaskLocationDialog.vue';
import { mapESheetInfo } from '../features/esheet/esheet.mapper';
import type {
  ESheetDrawMenuRow,
  ESheetInfoResult,
  ESheetProcessRow,
  ESheetViewData,
} from '../features/esheet/esheet.types';
import { getESheetInfo } from '../features/esheet/services/esheet.service';
import { normalizeLotInput } from '../features/esheet/utils/normalize-lot-input';
import { useMainStore } from '../features/main/stores/main.store';
import { getRemoteFurnaceKjApi, useRemoteFurnaceKjStore } from '../features/remote-furnace-kj';
import { useRemoteRamcoStore } from '../features/remote-ramco';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from '../services/message-response.helper';

const route = useRoute();
const router = useRouter();
const isShelfIncomingRoute = computed(
  () => route.path === `/${ROUTE.esheet}/${ROUTE.shelfIncoming}`,
);
const DeviceInfo = useMainStore();
const eenAddStore = useEenAddStore();
const remoteRamcoStore = useRemoteRamcoStore();
const remoteFurnaceKjStore = useRemoteFurnaceKjStore();
const tabs = ['S', 'P', 'M'] as const;
const lotInput = ref('');
const processNumberEnabled = ref(false);
const selectedProcessId = ref<string>();
const viewData = ref<ESheetViewData>();
const isLoading = ref(false);
const errorMessage = ref('');
const errorDialogTitle = ref('에  러');
const isErrorDialogOpen = ref(false);
const isDrawMenuOpen = ref(false);
const isBackupBayOpen = ref(false);
const isMaskLocationOpen = ref(false);
const selectedProcess = computed(() =>
  viewData.value?.processRows.find((row) => row.id === selectedProcessId.value),
);
const selectedDrawMenuRow = computed<ESheetDrawMenuRow>(() => {
  const row = selectedProcess.value;
  return {
    ACTIONTYPE: row?.actionType ?? '',
    COMMENTCNT: row?.commentCount ?? '',
    ENDTIME: row?.endTime ?? '',
    EQPGROUP: row?.equipmentGroup ?? '',
    ISCURRENT: row?.current ? 'Y' : 'N',
    LOT_STATUS: viewData.value?.lotStatus ?? '',
    OPERATION: row?.operation ?? '',
    OPERSEQUENCE: row?.operSequence ?? '',
    PROCESSSTEP: row?.name ?? '',
    SUBOPERATION: row?.subOperation ?? '',
  };
});

// Keep destination behavior in its owning feature; this page only translates menu context to routes.

function handleModeTab(tab: (typeof tabs)[number]): void {
  if (tab === 'S') void router.push({ path: `/${ROUTE.esheet}/${ROUTE.shelfIncoming}` });
  if (tab === 'P') isBackupBayOpen.value = true;
  if (tab === 'M' && viewData.value?.maskActionAvailable) isMaskLocationOpen.value = true;
}

async function restoreLotFocus(): Promise<void> {
  await nextTick();
  const input = document.querySelector<HTMLInputElement>('input[aria-label="LOT"]');
  input?.focus();
  input?.select();
}

function showErrorDialog(message: string, title = '에  러'): void {
  errorMessage.value = message;
  errorDialogTitle.value = title;
  isErrorDialogOpen.value = true;
}

async function closeErrorDialog(): Promise<void> {
  if (!isErrorDialogOpen.value) return;

  isErrorDialogOpen.value = false;
  await restoreLotFocus();
}

function handleErrorDialogOpenChange(open: boolean): void {
  if (open) {
    isErrorDialogOpen.value = true;
  } else {
    void closeErrorDialog();
  }
}

async function searchLot(): Promise<void> {
  if (isLoading.value) return;

  const normalizedLotId = normalizeLotInput(lotInput.value);
  lotInput.value = normalizedLotId;
  errorMessage.value = '';

  if (!normalizedLotId) {
    showErrorDialog('LOT NO를 입력하세요');
    return;
  }

  isLoading.value = true;
  viewData.value = undefined;
  selectedProcessId.value = undefined;
  isDrawMenuOpen.value = false;

  try {
    const response = await getESheetInfo({
      facility: DeviceInfo.facility,
      forwardCount: DeviceInfo.forwardCount,
      historyCount: DeviceInfo.historyCount,
      lotId: normalizedLotId,
    });
    if (!isResponseSuccessful(response)) {
      throw new Error(getResponseErrorMessage(response));
    }

    const messageBody = parseMessageBody(response) as unknown as ESheetInfoResult;
    if (!Array.isArray(messageBody.ESHEETITEMS) || messageBody.ESHEETITEMS.length === 0) {
      throw new Error('ESHEETITEMS가 존재하지 않습니다.');
    }

    const mapped = mapESheetInfo(messageBody);
    viewData.value = mapped;
    selectedProcessId.value = mapped.currentProcessId;
  } catch (error) {
    showErrorDialog(error instanceof Error ? error.message : 'eSheet 조회에 실패하였습니다.');
  } finally {
    isLoading.value = false;
    if (!isErrorDialogOpen.value) await restoreLotFocus();
  }
}

async function handleLotEnter(): Promise<void> {
  const scannedValue = lotInput.value;
  const normalizedLotId = normalizeLotInput(scannedValue);
  errorMessage.value = '';

  if (!scannedValue.startsWith(' ') || !normalizedLotId) {
    lotInput.value = '';
    viewData.value = undefined;
    selectedProcessId.value = undefined;
    isDrawMenuOpen.value = false;
    showErrorDialog('LOT#를 읽어주세요.', 'READING ERROR');
    return;
  }

  lotInput.value = normalizedLotId;
  await searchLot();
}

function handleDrawMenuAction(action: DrawMenuActionItem) {
  isDrawMenuOpen.value = false;
  if (action.id === DRAW_MENU_ACTION_ID.furnaceAuto) {
    void openFurnaceKj(action.payload.LOTID || lotInput.value.trim());
    return;
  }

  if (action.id === DRAW_MENU_ACTION_ID.auto) {
    void router.push({
      path: `/${ROUTE.remoteMachineSelect}`,
      query: { LOTID: action.payload.LOTID ?? '' },
    });
    return;
  }

  if (action.target === DRAW_MENU_ACTION_TARGET.eenAdd) {
    const operation = action.payload.OPERATION ?? '';
    const subOperation = action.payload.SUBOPERATION ?? '';
    void router.push({
      path: `/${ROUTE.eenAdd}`,
      query: {
        LOTID: action.payload.LOTID ?? '',
        FACTORYNAME: action.payload.FACTORYNAME ?? '',
        PRODUCT: action.payload.PRODUCT ?? '',
        ROUTE: action.payload.ROUTE ?? '',
        OPERATION: operation && subOperation ? `${operation}-${subOperation}` : operation,
        PROCESSSTEP: action.payload.PROCESSSTEP ?? '',
      },
    });
    return;
  }

  if (action.id === DRAW_MENU_ACTION_ID.etchInsp) {
    void router.push({
      path: `/${ROUTE.etchInspection}`,
      query: { LOTID: action.payload.LOTID ?? '' },
    });
    return;
  }

  if (action.target === DRAW_MENU_ACTION_TARGET.eenSetting) {
    const query = {
      lotId: action.payload.LOTID ?? '',
      factoryName: action.payload.FACTORYNAME ?? '',
      product: action.payload.PRODUCT ?? '',
      route: action.payload.ROUTE ?? '',
      operation: action.payload.OPERATION ?? '',
      processStep: action.payload.PROCESSSTEP ?? '',
      facility: viewData.value?.facility ?? '',
    };
    void router.push({ path: '/een-setting', query });
    return;
  }
  if (action.id === 'comment') {
    const query = {
      lotId: action.payload.LOTID ?? '',
      operation: action.payload.OPERATION ?? '',
      subOperation: action.payload.SUBOPERATION ?? '',
      processStep: action.payload.PROCESSSTEP ?? '',
      operSequence: action.payload.OPERSEQUENCE ?? '',
      facility: viewData.value?.facility ?? '',
    };
    void router.push({ path: '/comment-list', query });
    return;
  }

  if (action.id === DRAW_MENU_ACTION_ID.batchAuto) {
    const lotId = action.payload.LOTID || lotInput.value.trim();
    void router.push({
      path: `/${ROUTE.remoteRamco}`,
      query: {
        lotId,
      },
    });
    return;
  }
}

function openEdc(row: ESheetProcessRow): void {
  void router.push({
    path: `/${ROUTE.eSheetEdc}`,
    query: {
      LOTID: lotInput.value.trim(),
      OPERATION: row.operation,
      SUBOPERATION: row.subOperation,
      PROCESSSTEP: row.name,
      REALRECIPE: row.realRecipe,
    },
  });
}

async function openFurnaceKj(lotId: string): Promise<void> {
  isLoading.value = true;
  try {
    const response = await getRemoteFurnaceKjApi().checkFurnaceKj({ LOTID: lotId });
    if (!response.ok) {
      showErrorDialog(response.message);
      return;
    }
    if (response.data.CNT === '0') {
      void router.push({ path: `/${ROUTE.remoteFurnaceKj}`, query: { lotId } });
      return;
    }
    if (response.data.FURNACE === 'KEC') {
      await router.push({ path: `/${ROUTE.furnaceRemote}`, query: { LOTID: lotId } });
      return;
    }
    showErrorDialog('해당 Furnace 화면은 아직 연결되지 않았습니다.');
  } catch (error) {
    showErrorDialog(error instanceof Error ? error.message : 'Furnace 구분 조회에 실패하였습니다.');
  } finally {
    isLoading.value = false;
  }
}

function goBack(): void {
  void router.push('/');
}

onMounted(() => {
  const returnedLotId = eenAddStore.consumeReturnLotId();
  if (returnedLotId) {
    lotInput.value = returnedLotId;
    void searchLot();
    return;
  }

  const returnedRamcoLotId = remoteRamcoStore.consumeReturnLotId();
  if (returnedRamcoLotId) {
    lotInput.value = returnedRamcoLotId;
    void searchLot();
    return;
  }

  const returnedFurnaceLotId = remoteFurnaceKjStore.consumeReturnLotId();
  if (returnedFurnaceLotId) {
    lotInput.value = returnedFurnaceLotId;
    void searchLot();
    return;
  }

  const routeLotId = route.query.lotId;
  const initialLotId = Array.isArray(routeLotId) ? routeLotId[0] : routeLotId;
  if (typeof initialLotId === 'string' && initialLotId.trim()) {
    lotInput.value = initialLotId;
    void searchLot();
  }
});
</script>

<style scoped>
:global(*) {
  box-sizing: border-box;
}
:global(html),
:global(body),
:global(#q-app) {
  min-width: 0;
  min-height: 100%;
}
:global(html) {
  scrollbar-width: none;
}
:global(html::-webkit-scrollbar) {
  display: none;
}
:global(body) {
  margin: 0;
  overflow-x: hidden;
  background: #d1d5dc;
}
.esheet {
  --esheet-teal: #02b0a5;
  --esheet-ink: #030712;
  /* The eSheet is authored at the 360 x 720 logical scale. Keep the
     shared Base Components on that scale without changing their global
     tokens for other screens. */
  --ds-color-primary: var(--esheet-teal);
  --ds-color-brand-500: var(--esheet-teal);
  --ds-color-brand-600: #009d95;
  --ds-input-icon-size: 16px;
  --ds-checkbox-border-color: var(--esheet-teal);
  --ds-checkbox-checked-color: var(--esheet-teal);
  width: 100%;
  max-width: 360px;
  min-height: 1228px;
  margin-inline: auto;
  overflow: hidden;
  color: var(--esheet-ink);
  background: linear-gradient(180deg, #1c493a 0%, #96b1a8 53.85%, #ecf8f1 100%);
  font-family: var(--family-font-family-default, 'Noto Sans KR', sans-serif);
}
:global(.ant-modal.esheet-mask-location-modal .mask-location-dialog) {
  width: 100%;
}
:global(.ant-modal.esheet-mask-location-modal) {
  width: min(340px, calc(100vw - 20px)) !important;
  max-width: calc(100vw - 20px) !important;
}
:global(.ant-modal.esheet-mask-location-modal .ds-modal__body) {
  max-height: calc(100vh - 8px);
  padding: 0;
}
.esheet__header {
  display: flex;
  width: 100%;
  height: 60px;
  align-items: center;
  gap: 16px;
  padding: 16px;
  color: #f9fafb;
}
.esheet__header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
}
.icon-button {
  --ds-btn-icon-size: 24px;

  position: relative;
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  place-items: center;
  padding: 0;
  border: 0;
  color: #f9fafb;
  background: transparent;
  cursor: pointer;
  font-size: 24px;
  font-weight: 400;
}
.icon-button::after {
  position: absolute;
  content: '';
  inset: -10px;
}
.esheet__content {
  width: 100%;
  height: 1100px;
  padding: 12px;
}
.summary-grid,
.lot-search,
.mode-tabs,
.lot-card,
.process-card,
.details-card,
.lot-number {
  width: 100%;
}
.summary-grid {
  display: grid;
  height: 136px;
  grid-template-columns: 1fr;
  grid-template-rows: repeat(3, 40px);
  gap: 8px;
}
.summary-field,
.lot-search,
.detail-field,
.lot-card__remaining input {
  display: flex;
  min-width: 0;
  align-items: center;
  border: 1px solid #d1d5dc;
  border-radius: 8px;
  color: var(--esheet-ink);
  background: #fff;
  font-size: 14px;
  line-height: 20px;
}
.summary-field,
.detail-field,
.remaining-input {
  box-sizing: border-box;
  height: 40px;
  padding: 0;
  border: 0;
  background: transparent;
}
.summary-field--empty {
  height: 40px;
  padding: 8px 12px;
  border: 1px solid #d1d5dc;
  border-radius: 8px;
  background: #fff;
}
.summary-field :deep(.ds-input__control),
.detail-field :deep(.ds-input__control),
.remaining-input :deep(.ds-input__control) {
  box-sizing: border-box;
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid #d1d5dc;
  border-radius: 8px;
  background: #fff;
  color: var(--esheet-ink);
  font-size: 14px;
  line-height: 20px;
}
.summary-field :deep(.ds-input__native),
.detail-field :deep(.ds-input__native),
.remaining-input :deep(.ds-input__native) {
  color: inherit;
  font: inherit;
}
.summary-field {
  height: 40px;
}
.summary-field.summary-input {
  padding: 0;
}
.summary-field input,
.lot-search input,
.lot-card input,
.detail-field input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: inherit;
  background: transparent;
  font: inherit;
}
.summary-field--empty {
  color: #364153;
}
.summary-field--empty span {
  font-size: 14px;
}
.esheet-field-clear {
  display: inline-flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  color: var(--esheet-ink);
  font-size: 12px;
  line-height: 12px;
}
.esheet-field-clear__icon {
  width: 12px;
  height: 12px;
}
.lot-search {
  height: 40px;
  margin-top: 8px;
  padding: 0;
  border: 0;
  background: transparent;
}
.lot-search :deep(.ds-input) {
  width: 100%;
}
.lot-search :deep(.ds-input__control) {
  box-sizing: border-box;
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid #d1d5dc;
  border-radius: 8px;
  background: #fff;
  color: var(--esheet-ink);
  font-size: 14px;
  line-height: 20px;
}
.lot-search :deep(.ds-btn) {
  position: relative;
  display: inline-flex;
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  padding: 0;
  border: 0;
  color: var(--esheet-ink);
  background: transparent;
  cursor: pointer;
  font-size: 16px;
}
.lot-search :deep(.ds-btn)::after {
  position: absolute;
  content: '';
  inset: -14px;
}
.lot-search :deep(.ds-btn:disabled) {
  cursor: not-allowed;
  opacity: 0.5;
}
.mode-tabs {
  display: grid;
  height: 44px;
  grid-template-columns: 106px 106px 108px;
  gap: 8px;
  margin-top: 16px;
}
.mode-tabs button,
.action-bar button {
  height: 44px;
  padding: 8px;
  border: 1px solid var(--esheet-teal);
  border-radius: 8px;
  color: var(--esheet-teal);
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 16px;
  font-weight: 600;
  line-height: 28px;
  touch-action: manipulation;
}
.mode-tabs button {
  border-color: #d1d5dc;
  color: #101828;
  background: #fff;
}
.mode-tabs button.active,
.action-bar .primary {
  border-color: var(--esheet-teal);
  color: #f0fdfa;
  background: var(--esheet-teal);
}
.mode-tabs button:disabled {
  border-color: #d1d5dc;
  color: #101828;
  background: #fff;
  cursor: not-allowed;
  opacity: 1;
}
.lot-card,
.process-card,
.details-card,
.lot-number {
  border: 1px solid #d1d5dc;
  border-radius: 8px;
  background: #f9fafb;
  box-shadow: 0 8px 24px rgb(13 20 31 / 6%);
}
.lot-card {
  height: 172px;
  margin-top: 16px;
  padding: 12px;
}
.lot-card strong {
  display: block;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}
.status-row {
  position: relative;
  display: flex;
  height: 40px;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 36px 8px 12px;
  border: 1px solid #d1d5dc;
  border-radius: 8px;
  background: #fff;
}
.status-row::after {
  position: absolute;
  right: 12px;
  content: '×';
  font-size: 20px;
  line-height: 16px;
}
.status,
.quantity {
  display: inline-flex;
  height: 23px;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid;
  border-radius: 9999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 400;
  line-height: 15px;
  white-space: nowrap;
}
.status,
.quantity {
  --ds-btn-gap: 0px;
  font-weight: 400;
}
.status :deep(.ds-btn__label),
.quantity :deep(.ds-btn__label) {
  margin: 0;
}
.status :deep(.ds-btn__icon),
.quantity :deep(.ds-btn__icon) {
  width: 7px;
  height: 15px;
  margin: 0 0 0 2px;
  overflow: visible;
  font-size: 12px;
  line-height: 15px;
}
.status :deep(.ds-btn__icon > span),
.quantity :deep(.ds-btn__icon > span) {
  margin: 0;
}
.status--normal {
  border-color: #88c3f1;
  color: #2185d0;
  background: #e3eefb;
}
.status--wait {
  border-color: #fdb97c;
  color: #f56600;
  background: #fff1e6;
}
.quantity {
  border-color: #d1d5dc;
  color: #364153;
  background: #f3f4f6;
}
.lot-card__remaining {
  margin-top: 12px;
}
.lot-card h2 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}
.lot-card__remaining input {
  height: 40px;
  padding: 8px 12px;
  border: 1px solid #d1d5dc;
  border-radius: 8px;
}
.process-card {
  height: 376px;
  margin-top: 16px;
  padding: 11px;
  overflow: hidden;
}
.details-card {
  display: grid;
  height: 168px;
  gap: 12px;
  margin-top: 16px;
  padding: 12px;
}
.detail-field {
  height: 40px;
  padding: 0;
}
.lot-number {
  display: flex;
  height: 44px;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}
.lot-number input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--esheet-teal);
}
.lot-number :deep(.ds-checkbox__row) {
  gap: 8px;
}
.lot-number :deep(.ds-checkbox__control) {
  --ds-checkbox-size: 16px;
}
.action-bar {
  display: grid;
  width: 100%;
  height: 68px;
  grid-template-columns: 76.5px 78.5px 78.5px 78.5px;
  gap: 8px;
  padding: 12px;
}
.action-bar button:last-child {
  border-color: #d1d5dc;
  color: #101828;
  background: #fff;
}
.feedback {
  position: fixed;
  z-index: 20;
  right: 12px;
  bottom: 12px;
  left: 12px;
  max-width: 336px;
  margin: 0 auto;
  padding: 8px 12px;
  border-radius: 8px;
  color: #075e58;
  background: #d5f5ee;
  font-size: 12px;
  line-height: 16px;
  text-align: center;
  box-shadow: 0 8px 24px rgb(13 20 31 / 12%);
}
.feedback--error {
  color: #991b1b;
  background: #fee2e2;
}
:global(.esheet-error-dialog.ds-modal) {
  width: min(340px, calc(100vw - 32px)) !important;
}
:global(.esheet-error-dialog .ds-modal__title) {
  white-space: pre;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
button:focus-visible,
input:focus-visible {
  outline: 2px solid #0f766e;
  outline-offset: 2px;
}
@media (max-width: 359px) {
  .esheet {
    max-width: none;
  }
  .esheet__content,
  .action-bar {
    padding-inline: 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto;
    transition: none;
  }
}
</style>
