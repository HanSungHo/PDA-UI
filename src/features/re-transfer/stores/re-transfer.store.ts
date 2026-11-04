import { defineStore } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { DeviceInfo } from 'src/constants/device-info';
import { useMainStore } from 'src/features/main/stores/main.store';
import { okDialog } from 'src/services/ok-dialog.service';
import { CommonUtil } from 'src/utils/common-util';
import { ref } from 'vue';

import { reTransferService } from '../services/re-transfer.service';

export const useReTransferStore = defineStore('reTransfer', () => {
  const mainStore = useMainStore();

  const lotId = ref('');
  const currentStk = ref('');

  const fabs = ref<string[]>([]);
  const selectedFab = ref<string | null>(null);

  const bays = ref<string[]>([]);
  const selectedBay = ref<string | null>(null);

  const stockers = ref<string[]>([]);
  const selectedStocker = ref<string | null>(null);

  const ports = ref<string[]>([]);
  const selectedPort = ref<string | null>(null);

  const pdas = ref<string[]>([]);
  const selectedPda = ref<string | null>(null);

  const isLoading = ref(false);
  const focusTarget = ref<'lot' | null>(null);

  function getEffectiveFacility(): string {
    return mainStore.facility || DeviceInfo.FACILITY;
  }

  async function showAlert(title: string, message: string): Promise<void> {
    await okDialog.show(title, message, COMMON_FIELD.BTNOKSTR);
  }

  /**
   * Mirrors `clearInfo()` in `ReTransferActivity.kt`.
   */
  function clearInfo(): void {
    currentStk.value = '';
    fabs.value = [];
    selectedFab.value = null;
    bays.value = [];
    selectedBay.value = null;
    stockers.value = [];
    selectedStocker.value = null;
    ports.value = [];
    selectedPort.value = null;
    pdas.value = [];
    selectedPda.value = null;
  }

  /**
   * Resets entire store state on mount and unmount so singleton store state
   * does not leak across screen navigations.
   */
  function resetState(): void {
    clearInfo();
    lotId.value = '';
    isLoading.value = false;
    focusTarget.value = null;
  }

  /**
   * Mirrors `getCarryInfo(lotId: String)` in `ReTransferActivity.kt`.
   */
  async function fetchCarryInfo(lotIdInput?: string): Promise<boolean> {
    clearInfo();
    CommonUtil.hideKeyboard();

    if (lotIdInput !== undefined) {
      lotId.value = lotIdInput.trim();
    }

    const cleanLotId = lotId.value.trim();
    if (!cleanLotId) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'LOT NO를 입력해주세요');
      focusTarget.value = 'lot';
      return false;
    }

    isLoading.value = true;
    let result: Awaited<ReturnType<typeof reTransferService.getCarryInfo>>;

    try {
      result = await reTransferService.getCarryInfo(cleanLotId, getEffectiveFacility());
    } finally {
      isLoading.value = false;
    }

    if (!result.ok || !result.data) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, result.message || '');
      focusTarget.value = 'lot';
      return false;
    }

    currentStk.value = result.data.currentStk;
    fabs.value = result.data.fabs;
    ports.value = result.data.ports;

    if (
      result.data.outPortIndex !== undefined &&
      result.data.ports[result.data.outPortIndex] !== undefined
    ) {
      selectedPort.value = result.data.ports[result.data.outPortIndex] ?? null;
    }

    if (result.data.fabs.includes('FAB4')) {
      selectedFab.value = 'FAB4';
    }

    focusTarget.value = 'lot';
    return true;
  }

  /**
   * Mirrors `setNextBay()` in `ReTransferActivity.kt`.
   */
  async function selectFab(fab: string): Promise<void> {
    selectedFab.value = fab || null;
    bays.value = [];
    selectedBay.value = null;
    stockers.value = [];
    selectedStocker.value = null;
    pdas.value = [];
    selectedPda.value = null;

    if (!fab) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '다음 FAB을 선택해주세요.');
      return;
    }

    isLoading.value = true;
    let result: Awaited<ReturnType<typeof reTransferService.getFabBayInfo>>;
    try {
      result = await reTransferService.getFabBayInfo(fab);
    } finally {
      isLoading.value = false;
    }

    if (!result.ok || !result.data) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, result.message || '');
      return;
    }

    bays.value = result.data.bays;
  }

  /**
   * Mirrors `setNextSTK()` and `setPDAList()` in `ReTransferActivity.kt`.
   */
  async function selectBay(bay: string): Promise<void> {
    selectedBay.value = bay || null;
    stockers.value = [];
    selectedStocker.value = null;
    pdas.value = [];
    selectedPda.value = null;

    if (!selectedFab.value) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '다음 FAB을 선택해주세요');
      return;
    }

    if (!bay) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '다음 BAY를 선택해주세요');
      return;
    }

    isLoading.value = true;
    let stkResult: Awaited<ReturnType<typeof reTransferService.getBayStockerInfo>>;
    let pdaResult: Awaited<ReturnType<typeof reTransferService.getPdaList>>;
    try {
      [stkResult, pdaResult] = await Promise.all([
        reTransferService.getBayStockerInfo(bay, selectedFab.value),
        reTransferService.getPdaList(bay, getEffectiveFacility()),
      ]);
    } finally {
      isLoading.value = false;
    }

    if (stkResult.ok && stkResult.data) {
      stockers.value = stkResult.data.stockers;
    }

    if (pdaResult.ok && pdaResult.data) {
      pdas.value = pdaResult.data.pdas;
      // Legacy InitSpinnerAdapter has EXTRA = 1 (position 0 = null, position 1 = index 0 = '지정안함')
      if (pdas.value.length > 0) {
        selectedPda.value = pdas.value[0] ?? null;
      }
    }

    if (!stkResult.ok || !stkResult.data) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, stkResult.message || '');
    }

    if (!pdaResult.ok || !pdaResult.data) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, pdaResult.message || '');
    }
  }

  /**
   * Mirrors `executeCarry()` in `ReTransferActivity.kt`.
   */
  async function executeCarry(): Promise<boolean> {
    if (!lotId.value || !lotId.value.trim()) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'LOT NO를 입력하세요.');
      return false;
    }

    if (!currentStk.value || !currentStk.value.trim()) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'LOT이 STOCKER내에 없습니다.');
      return false;
    }

    if (!selectedFab.value) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '반송할 FAB을 선택하세요.');
      return false;
    }

    if (!selectedBay.value) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '반송할 BAY를 선택하세요.');
      return false;
    }

    if (!selectedStocker.value) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '반송할 STOCKER를 선택하세요.');
      return false;
    }

    if (!selectedPort.value) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '출고할 PORT를 선택하세요.');
      return false;
    }

    if (!selectedPda.value) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '반송여부를 알려줄 PDA를 선택하세요.');
      return false;
    }

    let currentStkToSend = currentStk.value;
    if (currentStkToSend === '지정안함') {
      currentStkToSend = '';
    }

    isLoading.value = true;
    let result: Awaited<ReturnType<typeof reTransferService.executeCarry>>;
    try {
      result = await reTransferService.executeCarry({
        lotId: lotId.value,
        facility: getEffectiveFacility(),
        nextFab: selectedFab.value,
        nextBay: selectedBay.value,
        nextStocker: selectedStocker.value,
        port: selectedPort.value,
        pda: selectedPda.value,
        currentStk: currentStkToSend,
      });
    } finally {
      isLoading.value = false;
    }

    if (!result.ok) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, result.message || '');
      return false;
    }

    // Legacy calls getCarryInfo(lotId) upon success
    await fetchCarryInfo(lotId.value);
    return true;
  }

  return {
    lotId,
    currentStk,
    fabs,
    selectedFab,
    bays,
    selectedBay,
    stockers,
    selectedStocker,
    ports,
    selectedPort,
    pdas,
    selectedPda,
    isLoading,
    focusTarget,
    showAlert,
    clearInfo,
    resetState,
    fetchCarryInfo,
    selectFab,
    selectBay,
    executeCarry,
  };
});
