<template>
  <BaseScreen
    v-show="!isShelfIncomingRoute"
    class="esheet"
    :title="`eSheet (${DeviceInfo.operatorName})`"
  >
    <!-- Layout follows Figma activity_esheet (1551:44251); fields and states follow Android. -->
    <section class="ds-screen__card summary-grid" aria-label="LOT 조회">
      <div class="summary-grid__fields">
        <BaseInput
          :model-value="maintenanceItemDisplay"
          aria-label="정비 항목"
          :status="viewData?.qTimeTarget ? 'warning' : 'default'"
          readonly
          :class="['summary-input', { 'esheet-field--alert': viewData?.qTimeTarget }]"
        />
        <BaseInput
          :model-value="viewData?.cutoff ?? ''"
          aria-label="CUT OFF"
          readonly
          class="summary-input"
        />
        <BaseInput
          :model-value="viewData?.tat ?? ''"
          aria-label="TAT"
          readonly
          class="summary-input"
        />
      </div>
      <div class="summary-grid__search">
        <BaseInput
          v-model="lotInput"
          class="lot-search"
          aria-label="LOT"
          :loading="isLoading"
          @keyup.enter="handleLotEnter"
        >
          <template #suffix>
            <QIcon name="sym_o_search" aria-hidden="true" />
          </template>
        </BaseInput>
        <!-- Android shows an icon-only search button; Figma labels it 조회. -->
        <BaseButton
          variant="secondary"
          size="small"
          aria-label="LOT 조회"
          :disabled="isLoading"
          @click="searchLot"
        >
          조회
        </BaseButton>
        <div class="mode-tabs" role="group" aria-label="S P M">
          <BaseButton
            v-for="tab in tabs"
            :key="tab"
            :variant="tab !== 'M' ? 'primary' : 'tertiary'"
            size="small"
            block
            :disabled="tab === 'M' && !viewData?.maskActionAvailable"
            @click="handleModeTab(tab)"
          >
            {{ tab }}
          </BaseButton>
        </div>
      </div>
    </section>

    <!--
        Fields follow the Android current-process block (activity_esheet.xml, ESheetActivity.kt);
        layout follows the Figma frame. Real recipe keeps Android's red/yellow alert colors.
      -->
    <section class="ds-screen__card lot-card" aria-label="LOT 정보">
      <div class="lot-card__summary">
        <BaseInput
          class="lot-card__field"
          :model-value="currentProcess.bay"
          aria-label="BAY"
          readonly
        />
        <BaseInput
          :class="['lot-card__field', `lot-card__job-code--${viewData?.jobCodeTone ?? 'default'}`]"
          :model-value="viewData?.jobCode ?? ''"
          aria-label="JOB CODE"
          readonly
        />
        <div class="status-row" role="group" aria-label="LOT 상태 및 수량">
          <span
            :class="['status-chip', `status-chip--priority-${viewData?.lotTypeTone ?? 'default'}`]"
          >
            {{ viewData?.lotType }}
          </span>
          <BaseButton
            class="status-chip status-chip--quantity"
            size="small"
            variant="tertiary"
            :aria-label="`Wafer 목록 ${viewData?.lotQuantity ?? ''}`.trim()"
            @dblclick.prevent="openWaferList"
            @keydown.enter.prevent="openWaferList"
            @keydown.space.prevent="openWaferList"
          >
            {{ viewData?.lotQuantity }}
          </BaseButton>
          <BaseButton
            v-if="viewData?.lotStatus === 'HOLD'"
            class="status-chip status-chip--lot-status-hold"
            size="small"
            variant="tertiary"
            @click="showHoldComment"
          >
            {{ viewData.lotStatus }}
          </BaseButton>
          <span
            v-else
            :class="[
              'status-chip',
              `status-chip--lot-status-${viewData?.lotStatusTone ?? 'default'}`,
            ]"
            >{{ viewData?.lotStatus }}</span
          >
        </div>
      </div>
      <div class="lot-card__stack">
        <BaseInput
          class="lot-card__field"
          :model-value="currentProcess.operationName"
          aria-label="현재 공정"
          readonly
        />
        <BaseInput
          class="lot-card__field"
          :model-value="currentProcess.recipe"
          aria-label="RECIPE"
          readonly
          @dblclick="showCurrentProcessDetails('RECIPE', currentProcess.recipeDetails)"
          @keydown.enter="showCurrentProcessDetails('RECIPE', currentProcess.recipeDetails)"
        />
        <BaseInput
          class="lot-card__field"
          :model-value="currentProcess.moveInTime"
          aria-label="투입시간"
          readonly
        />
      </div>
      <BaseInput
        class="lot-card__field"
        label="잔여"
        :model-value="viewData?.remainingLayers ?? ''"
        readonly
        truncate
      />
      <div class="lot-card__pair">
        <BaseInput
          :class="['lot-card__field', { 'esheet-field--alert': currentProcess.realRecipe }]"
          :model-value="currentProcess.realRecipe"
          aria-label="진행RCP"
          readonly
        />
        <BaseInput
          class="lot-card__field"
          :model-value="currentProcess.machine"
          aria-label="기준장비"
          readonly
          @dblclick="showCurrentProcessDetails('기준장비', currentProcess.machineDetails)"
          @keydown.enter="showCurrentProcessDetails('기준장비', currentProcess.machineDetails)"
        />
      </div>
    </section>

    <section class="ds-screen__card process-card">
      <ESheetProcessGrid
        :rows="viewData?.processRows ?? []"
        :selected-process-id="selectedProcessId"
        :show-operation-numbers="processNumberEnabled"
        @select="selectedProcessId = $event"
        @process-tap="recordFutureOperation"
        @open-menu="isDrawMenuOpen = true"
        @open-edc="openEdc"
        @open-comment="openComment"
        @show-details="showDetails"
      />
    </section>

    <section class="ds-screen__card details-card" aria-label="상세 정보">
      <div class="details-card__pair">
        <BaseInput
          class="detail-field"
          :model-value="viewData?.engineer ?? ''"
          aria-label="ENGR"
          readonly
        />
        <BaseInput
          :class="[
            'detail-field',
            { 'detail-field--engr2-warning': viewData?.engineerSecondaryWarning },
          ]"
          :model-value="viewData?.engineerSecondary ?? ''"
          aria-label="ENGR2"
          readonly
        />
      </div>
      <div class="lot-number">
        <BaseInput
          class="detail-field"
          :model-value="viewData?.product ?? ''"
          aria-label="제품"
          readonly
        />
        <BaseCheckbox v-model="processNumberEnabled" label="공정번호" />
        <span
          v-if="viewData?.automotive"
          :class="[
            'automotive-indicator',
            { 'automotive-indicator--safe-launch': viewData.safeLaunch },
          ]"
          :aria-label="viewData.safeLaunch ? 'Safe launch automotive lot' : 'Automotive lot'"
          role="img"
        >
          <QIcon name="sym_o_directions_car" aria-hidden="true" />
        </span>
      </div>
    </section>

    <!-- Figma buttons are 36px: size small until the button redesign makes medium 36px. -->
    <template #footer>
      <div class="ds-screen__actions">
        <BaseButton class="primary" variant="primary" size="medium" block @click="checkMotherLot">
          母 LOT
        </BaseButton>
        <BaseButton
          variant="secondary"
          size="medium"
          block
          :loading="isActionLoading"
          @click="checkPcmRecipe"
        >
          PCM
        </BaseButton>
        <BaseButton
          variant="secondary"
          size="medium"
          block
          :loading="isActionLoading"
          @click="checkFutureActions"
        >
          F
        </BaseButton>
        <BaseButton variant="tertiary" size="medium" block @click="goBack"> 닫기 </BaseButton>
      </div>
    </template>

    <BaseModal
      :open="isErrorDialogOpen"
      :title="errorDialogTitle"
      :width="NOTICE_DIALOG_WIDTH"
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
    <BaseModal
      :open="Boolean(activeNotice)"
      :title="activeNotice?.title ?? ''"
      :width="NOTICE_DIALOG_WIDTH"
      :closable="false"
      :overlay-closable="false"
      class="esheet-notice-dialog"
      @update:open="handleNoticeOpenChange"
    >
      <p class="esheet-notice-dialog__message" role="alert">{{ activeNotice?.message }}</p>
      <template #footer>
        <div class="esheet-notice-dialog__actions">
          <BaseButton variant="primary" @click="dismissNotice">확인</BaseButton>
        </div>
      </template>
    </BaseModal>
    <DrawMenuList
      :open="isDrawMenuOpen"
      :title="selectedProcess?.name ?? ''"
      :lot-id="lotInput"
      :factory-name="viewData?.factoryName ?? ''"
      :product-name="viewData?.product ?? ''"
      :route-name="viewData?.routeName ?? ''"
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
      <MaskLocationDialog
        v-if="activeMaskInfo"
        :key="maskDialogKey"
        :lot-id="lotInput"
        :mask-tag="activeMaskInfo.RETICLETAG"
        :product-name="activeMaskInfo.PRODUCT"
        :giben="activeMaskInfo.GIBEN"
        :status="activeMaskInfo.STATUS"
        :is-use="activeMaskInfo.ISUSE === 'Y' ? '사용가능' : '사용불가'"
        :current-location="activeMaskInfo.CURRLOC"
        :sub-machine="activeMaskInfo.SUBLOCATION3"
        :test-hour="activeMaskInfo.AFTERINSP"
        @ok="advanceMaskInfo"
      />
    </BaseModal>
  </BaseScreen>
  <RouterView v-if="isShelfIncomingRoute" />
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { computed, nextTick, onMounted, ref } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';

import { BaseButton, BaseCheckbox, BaseInput, BaseModal, BaseScreen } from '../components/base';
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
  ESheetCurrentProcessSummary,
  ESheetDrawMenuRow,
  ESheetInfoResult,
  ESheetProcessRow,
  ESheetViewData,
} from '../features/esheet/esheet.types';
import { getESheetInfo } from '../features/esheet/services/esheet.service';
import {
  type ESheetMaskInfo,
  fetchESheetFutureActions,
  fetchESheetMaskInfo,
  fetchESheetPcmReworkRecipe,
  fetchESheetWaferList,
} from '../features/esheet/services/esheet-actions.service';
import { normalizeLotInput } from '../features/esheet/utils/normalize-lot-input';
import { useMainStore } from '../features/main/stores/main.store';
import { useWaferSelectStore } from '../features/move-out/stores/wafer-select.store';
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
const waferSelectStore = useWaferSelectStore();
const tabs = ['S', 'P', 'M'] as const;
const lotInput = ref('');
const processNumberEnabled = ref(false);
const selectedProcessId = ref<string>();
// Android keeps the operation from the last process-row tap (opM/opS) for F (Future) and does
// not clear it on a new lookup, so it can apply to the next LOT as well.
const futureOperation = ref<{ operation: string; subOperation: string }>();
const viewData = ref<ESheetViewData>();
const isLoading = ref(false);
const errorMessage = ref('');
const errorDialogTitle = ref('에  러');
const isErrorDialogOpen = ref(false);
const isDrawMenuOpen = ref(false);
const isBackupBayOpen = ref(false);
const isMaskLocationOpen = ref(false);
const isActionLoading = ref(false);
// BaseModal applies width inline; the string keeps a 16px side gutter on narrow screens.
const NOTICE_DIALOG_WIDTH = 'min(340px, calc(100vw - 32px))';
const maskQueue = ref<ESheetMaskInfo[]>([]);
const notices = ref<Array<{ title: string; message: string }>>([]);
const activeNotice = computed(() => notices.value[0]);
const activeMaskInfo = computed(() => maskQueue.value[0]);
const maskDialogKey = ref(0);
const maintenanceItemDisplay = computed(() => {
  const data = viewData.value;
  if (!data) return '';
  return `${data.maintenanceItem}${data.qTimeTarget ? ' Q-T 대상' : ''}`;
});
const EMPTY_CURRENT_PROCESS: ESheetCurrentProcessSummary = {
  bay: '',
  operationName: '',
  moveInTime: '',
  realRecipe: '',
  recipe: '',
  machine: '',
  recipeDetails: '',
  machineDetails: '',
};
const currentProcess = computed(
  () => viewData.value?.currentProcessSummary ?? EMPTY_CURRENT_PROCESS,
);
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
    LOT_STATUS: viewData.value?.lotStatusCode ?? '',
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
  if (tab === 'M' && viewData.value?.maskActionAvailable) void openMaskLocation();
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

function enqueueNotice(title: string, message: string): void {
  notices.value.push({ title, message });
}

function dismissNotice(): void {
  notices.value.shift();
}

function handleNoticeOpenChange(open: boolean): void {
  if (!open) dismissNotice();
}

function showDetails(title: string, message: string): void {
  enqueueNotice(title, message);
}

// Android registers these double-tap dialogs only while the current LOT is not moved in.
function showCurrentProcessDetails(title: string, content: string): void {
  if (content) enqueueNotice(title, content);
}

function showHoldComment(): void {
  enqueueNotice('HOLD COMMENT', viewData.value?.holdComment ?? '');
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
    const processItems = Array.isArray(messageBody.ESHEETITEMS) ? messageBody.ESHEETITEMS : [];
    // Android fills the LOT header and M action before reporting an empty process list.
    const mapped = mapESheetInfo({ ...messageBody, ESHEETITEMS: processItems });
    viewData.value = mapped;
    if (processItems.length === 0) {
      showErrorDialog('ESHEETITEMS가 존재하지 않습니다.');
      return;
    }
    selectedProcessId.value = mapped.currentProcessId;
    if (route.path === `/${ROUTE.esheet}` && route.query.lotId !== normalizedLotId) {
      await router.replace({ query: { ...route.query, lotId: normalizedLotId } });
    }
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
  const lotId = action.payload.LOTID || lotInput.value.trim();

  if (action.id === DRAW_MENU_ACTION_ID.moveIn) {
    void router.push({ name: 'move-in', params: { lotId } });
    return;
  }
  if (action.id === DRAW_MENU_ACTION_ID.moveOut) {
    void router.push({ path: `/${ROUTE.moveOut}`, query: { lotId } });
    return;
  }
  if (action.id === DRAW_MENU_ACTION_ID.batch) {
    void router.push({ path: `/${ROUTE.batch}` });
    return;
  }
  if (action.id === DRAW_MENU_ACTION_ID.rework) {
    void router.push({ path: `/${ROUTE.rework}`, query: { LOTID: lotId } });
    return;
  }
  if (action.id === DRAW_MENU_ACTION_ID.split) {
    void router.push({ path: `/${ROUTE.split}`, query: { lotId } });
    return;
  }
  if (action.id === DRAW_MENU_ACTION_ID.lotStatus) {
    void router.push({ path: `/${ROUTE.lotStatus}`, query: { LOTID: lotId } });
    return;
  }
  if (action.id === DRAW_MENU_ACTION_ID.rcpSearch) {
    void router.push({ path: `/${ROUTE.rcpInquire}`, query: { lotId } });
    return;
  }
  if (action.id === DRAW_MENU_ACTION_ID.sampleRelease) {
    void router.push({ path: `/${ROUTE.sampleRelease}`, query: { LOTID: lotId } });
    return;
  }

  if (action.id === DRAW_MENU_ACTION_ID.furnaceAuto) {
    void openFurnaceKj(lotId);
    return;
  }

  if (action.id === DRAW_MENU_ACTION_ID.auto) {
    void router.push({
      path: `/${ROUTE.remoteMachineSelect}`,
      query: { LOTID: lotId },
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
  if (action.id === DRAW_MENU_ACTION_ID.comment) {
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
    void router.push({
      path: `/${ROUTE.remoteRamco}`,
      query: {
        lotId,
      },
    });
    return;
  }
}

function openComment(row: ESheetProcessRow): void {
  void router.push({
    path: `/${ROUTE.commentList}`,
    query: {
      lotId: lotInput.value.trim(),
      operation: row.operation,
      subOperation: row.subOperation,
      processStep: row.name,
      operSequence: row.operSequence,
      facility: viewData.value?.facility ?? '',
    },
  });
}

async function openWaferList(): Promise<void> {
  if (!lotInput.value.trim()) return;

  try {
    const response = await fetchESheetWaferList(lotInput.value.trim());
    if (!response.ok) return;

    waferSelectStore.start({
      EDITABLE: 'N',
      EXISTWAFERLIST: response.data ?? '',
      LOTID: lotInput.value.trim(),
      CATEGORY: '',
    });
    await router.push({ path: `/${ROUTE.waferSelect}` });
  } catch {
    // Android does not show a dialog when GETWAFER fails.
  }
}

async function openMaskLocation(): Promise<void> {
  const reticleList = viewData.value?.maskActionAvailable ? viewData.value.reticleList : '';
  if (!reticleList || isActionLoading.value) return;

  isActionLoading.value = true;
  try {
    const response = await fetchESheetMaskInfo(reticleList, DeviceInfo.facility);
    if (!response.ok) {
      enqueueNotice('에  러', response.message ?? '마스크 위치정보를 조회하지 못했습니다.');
      return;
    }

    // Android launches the dialogs from the last row, so row 0 ends up on top and is seen first.
    maskQueue.value = [...(response.data ?? [])];
    isMaskLocationOpen.value = maskQueue.value.length > 0;
  } catch (error) {
    enqueueNotice(
      '에  러',
      error instanceof Error ? error.message : '마스크 위치정보를 조회하지 못했습니다.',
    );
  } finally {
    isActionLoading.value = false;
  }
}

function advanceMaskInfo(): void {
  maskQueue.value.shift();
  maskDialogKey.value += 1;
  if (maskQueue.value.length === 0) isMaskLocationOpen.value = false;
}

function checkMotherLot(): void {
  if (!lotInput.value.trim()) {
    showErrorDialog('LOT NO를 입력하세요');
    return;
  }
  if (!viewData.value?.jobCode) {
    showErrorDialog('LOT을 조회후 실행하셔야 합니다.');
    return;
  }
  if (!viewData.value.rootLotName) {
    showErrorDialog('ROOT LOTNAME이 확인되지 않습니다.');
    return;
  }
  enqueueNotice('알  림', `ROOT LOTNAME : ${viewData.value.rootLotName} `);
}

async function checkPcmRecipe(): Promise<void> {
  if (isActionLoading.value) return;
  isActionLoading.value = true;
  try {
    const response = await fetchESheetPcmReworkRecipe(lotInput.value.trim());
    if (!response.ok) {
      enqueueNotice('에  러', response.message ?? 'PCM 조회에 실패하였습니다.');
      return;
    }

    const result = response.data;
    if (!result) return;
    if (result.PCMREQPLIST) enqueueNotice('PCM EQPLIST', result.PCMREQPLIST);
    if (result.RECIPELIST) enqueueNotice('PCM Recipe', result.RECIPELIST);
    if (result.PCMRESULT) enqueueNotice('PCM 결과', result.PCMRESULT);
  } catch (error) {
    enqueueNotice('에  러', error instanceof Error ? error.message : 'PCM 조회에 실패하였습니다.');
  } finally {
    isActionLoading.value = false;
  }
}

async function checkFutureActions(): Promise<void> {
  const row = futureOperation.value;
  if (!row?.operation || !row.subOperation) {
    enqueueNotice('확  인', '공정을 선택해야 합니다.');
    return;
  }
  if (isActionLoading.value) return;

  isActionLoading.value = true;
  try {
    const response = await fetchESheetFutureActions(
      lotInput.value.trim(),
      row.operation,
      row.subOperation,
    );
    enqueueNotice(
      'FUTURE HOLD/SKIP',
      response.ok && response.data ? response.data : '설정된 FUTURE HOLD/SKIP이 없습니다.',
    );
  } catch {
    enqueueNotice('FUTURE HOLD/SKIP', '설정된 FUTURE HOLD/SKIP이 없습니다.');
  } finally {
    isActionLoading.value = false;
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
      await router.push({ path: `/${ROUTE.remoteFurnaceKj}`, query: { lotId } });
      return;
    }
    if (response.data.CNT === 'KEC') {
      await router.push({ path: `/${ROUTE.remoteFurnaceKec}`, query: { LOTID: lotId } });
      return;
    }
    await router.push({ path: `/${ROUTE.furnaceRemote}`, query: { LOTID: lotId } });
  } catch (error) {
    showErrorDialog(error instanceof Error ? error.message : 'Furnace 구분 조회에 실패하였습니다.');
  } finally {
    isLoading.value = false;
  }
}

function recordFutureOperation(row: ESheetProcessRow): void {
  futureOperation.value = { operation: row.operation, subOperation: row.subOperation };
}

function goBack(): void {
  router.back();
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
:global(html),
:global(body),
:global(#q-app) {
  min-width: 0;
  min-height: 100%;
}

:global(body) {
  margin: 0;
  overflow-x: hidden;
}

.esheet {
  /*
   * Android state colors (ESheetActivity setStateColor). Figma has no equivalent states and
   * design-tokens.css has no matching values, so they stay local to this screen.
   */
  --esheet-alert-text: #ffff00;
  --esheet-qtime-background: #ff0000;
  --esheet-real-recipe-background: #f90716;
  --esheet-engr2-warning-background: #ffff00;
  --esheet-job-code-green: #adff2f;
  --esheet-job-code-orange: #ff8c00;
  --esheet-job-code-cyan: #00ffff;
  --esheet-lot-type-green: #00ff00;
  --esheet-lot-type-orange: #ff8000;
  --esheet-lot-type-yellow: #ffff00;
  --esheet-lot-type-cyan: #7effff;
  --esheet-lot-status-rework: #000000;
  --esheet-lot-status-hold: #ff0000;
  --esheet-lot-status-run: #0000ff;
  --esheet-state-text-dark: #000000;
  --esheet-state-text-light: #ffffff;
}

/* Cards stack 8px apart; the process card takes the remaining height so the page never scrolls. */
.esheet :deep(.ds-screen__content) {
  gap: var(--spacing-space-1);
  padding-block: var(--spacing-space-0);
}

.summary-grid,
.lot-card,
.process-card,
.details-card {
  min-width: 0;
  align-items: stretch;
  /* Figma draws the 1px card stroke inside its 8px padding. */
  padding: calc(var(--spacing-space-1) - 1px);
}

.summary-grid__fields,
.mode-tabs,
.lot-card__pair,
.details-card__pair {
  display: grid;
  gap: var(--spacing-space-1);
}

.summary-grid__fields,
.mode-tabs {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.lot-card__pair,
.details-card__pair {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.summary-grid__search,
.lot-number {
  display: flex;
  align-items: center;
  gap: var(--spacing-space-1);
}

.summary-input,
.detail-field,
.lot-card__field {
  width: 100%;
  min-width: 0;
}

.lot-search,
.mode-tabs {
  min-width: 0;
  flex: 1 1 0;
}

/* Android red background with yellow text: a non-empty real recipe and the Q-time 정비 항목. */
.esheet-field--alert {
  --ds-input-control-background: var(--esheet-real-recipe-background);
  --ds-input-control-color: var(--esheet-alert-text);
}

/* Android shrinks the Q-time 정비 항목 text (16sp to 12sp) so "Q-T 대상" fits. */
.summary-grid .esheet-field--alert {
  --ds-input-control-background: var(--esheet-qtime-background);
  --ds-input-control-font-size: var(--font-size-14px);
  --ds-input-control-line-height: var(--line-height-20px);
}

.detail-field--engr2-warning {
  --ds-input-control-background: var(--esheet-engr2-warning-background);
}

/* BAY, JOB CODE and the status chips share one row (Figma 60 : 107 : chips). */
.lot-card__summary {
  display: grid;
  grid-template-columns: minmax(0, 60fr) minmax(0, 107fr) auto;
  align-items: center;
  gap: var(--spacing-space-0);
}

.lot-card__stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-space-0);
}

.status-row {
  display: flex;
  min-height: var(--height-32px);
  align-items: center;
  gap: var(--spacing-space-0);
}

.status-chip {
  display: inline-flex;
  min-width: var(--height-32px);
  min-height: var(--height-32px);
  align-items: center;
  justify-content: center;
  padding: var(--spacing-space-0) var(--spacing-space-1);
  border: 1px solid var(--border-border-primary);
  border-radius: var(--radius-full);
  color: var(--text-text-primary);
  background: var(--background-background-primary);
  font-family: inherit;
  font-size: var(--font-size-12px);
  font-weight: var(--weight-font-medium);
  line-height: var(--line-height-16px);
  white-space: nowrap;
}

.status-chip--priority-green,
.status-chip--priority-orange,
.status-chip--priority-yellow,
.status-chip--priority-cyan,
.status-chip--lot-status-rework,
.status-chip--lot-status-hold,
.status-chip--lot-status-run {
  border-color: var(--esheet-state-background);
  color: var(--esheet-state-text, var(--esheet-state-text-dark));
  background: var(--esheet-state-background);
}

.status-chip--priority-green {
  --esheet-state-background: var(--esheet-lot-type-green);
}

.status-chip--priority-orange {
  --esheet-state-background: var(--esheet-lot-type-orange);
  --esheet-state-text: var(--esheet-state-text-light);
}

.status-chip--priority-yellow {
  --esheet-state-background: var(--esheet-lot-type-yellow);
}

.status-chip--priority-cyan {
  --esheet-state-background: var(--esheet-lot-type-cyan);
}

.status-chip--lot-status-rework {
  --esheet-state-background: var(--esheet-lot-status-rework);
  --esheet-state-text: var(--esheet-state-text-light);
}

.status-chip--lot-status-hold {
  --esheet-state-background: var(--esheet-lot-status-hold);
  --esheet-state-text: var(--esheet-state-text-light);
}

.status-chip--lot-status-run {
  --esheet-state-background: var(--esheet-lot-status-run);
  --esheet-state-text: var(--esheet-state-text-light);
}

.lot-card__job-code--green,
.lot-card__job-code--orange,
.lot-card__job-code--cyan {
  --ds-input-control-color: var(--esheet-state-text-dark);
}

.lot-card__job-code--green {
  --ds-input-control-background: var(--esheet-job-code-green);
}

.lot-card__job-code--orange {
  --ds-input-control-background: var(--esheet-job-code-orange);
}

.lot-card__job-code--cyan {
  --ds-input-control-background: var(--esheet-job-code-cyan);
}

/* Below ~550px of other content the grid keeps its header and one row; the content scrolls. */
.process-card {
  min-height: calc(2 * var(--height-40px) + 2 * var(--spacing-space-1));
  flex: 1 1 0;
  overflow: hidden;
}

/* 제품 takes the row; the 공정번호 checkbox and automotive icon keep their own width. */
.lot-number > * {
  flex: none;
}

.lot-number > .detail-field {
  flex: 1 1 auto;
}

.automotive-indicator {
  display: inline-flex;
  color: var(--icon-icon-brand);
  font-size: var(--component-icon-size-md);
  line-height: 1;
}

.automotive-indicator--safe-launch {
  color: var(--semantic-red-200);
}

:global(.esheet-error-dialog .ds-modal__title),
:global(.esheet-notice-dialog .ds-modal__title) {
  white-space: pre;
}

.esheet-error-dialog__message,
.esheet-notice-dialog__message {
  margin: 0;
  white-space: pre-wrap;
}

.esheet-error-dialog__actions,
.esheet-notice-dialog__actions {
  display: flex;
  justify-content: center;
}

:global(.esheet-mask-location-modal .ds-modal__body) {
  max-height: calc(100dvh - 24px);
  padding: 0;
  overflow-y: auto;
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
