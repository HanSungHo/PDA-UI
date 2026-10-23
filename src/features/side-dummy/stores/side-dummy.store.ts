import { defineStore } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { DeviceInfo } from 'src/constants/device-info';
import { useMainStore } from 'src/features/main/stores/main.store';
import { computed, ref } from 'vue';

import { sideDummyService } from '../services/side-dummy.service';
import type { SideDummyAlertDialog } from '../types/side-dummy.types';

export const useSideDummyStore = defineStore('side-dummy', () => {
  const mainStore = useMainStore();

  // Form input and detail states
  const eqpId = ref<string>('');
  const lotId = ref<string>('');
  const operId = ref<string>('');
  const operDesc = ref<string>('');
  const inDate = ref<string>('');
  const inUser = ref<string>('');

  // Internal temporary states holding operation metadata
  const searchOperId = ref<string>('');
  const searchOperDesc = ref<string>('');

  // UI control states
  const isLotDisabled = ref<boolean>(true);
  const isLotSearchEnabled = computed<boolean>(() => !isLotDisabled.value);
  const isBtnInEnabled = ref<boolean>(false);
  const isBtnOutEnabled = ref<boolean>(false);
  const isLoading = ref<boolean>(false);

  // Focus target helper to signal page component which input to focus/select
  const focusTarget = ref<'eqp' | 'lot' | null>(null);

  // Modal alert dialog state
  const alertDialog = ref<SideDummyAlertDialog>({
    open: false,
    title: '',
    message: '',
  });

  function showAlert(title: string, message: string): void {
    alertDialog.value = {
      open: true,
      title,
      message,
    };
  }

  function closeAlert(): void {
    alertDialog.value = {
      open: false,
      title: '',
      message: '',
    };
  }

  function clearEQPSearchInfo(): void {
    lotId.value = '';
    operId.value = '';
    operDesc.value = '';
    inDate.value = '';
    inUser.value = '';
  }

  function clearLotSearchInfo(): void {
    searchOperId.value = '';
    searchOperDesc.value = '';
  }

  function clearInfo(): void {
    clearEQPSearchInfo();
    clearLotSearchInfo();
    isLotDisabled.value = true;
    isBtnOutEnabled.value = false;
    isBtnInEnabled.value = false;
  }

  /**
   * Look up equipment information and evaluate whether a side dummy wafer is loaded.
   */
  async function getEqpInfo(rawEqpId?: string): Promise<boolean> {
    if (rawEqpId !== undefined) {
      eqpId.value = rawEqpId.trim().toUpperCase();
    }

    clearInfo();

    if (!eqpId.value.trim()) {
      showAlert('ERROR', '장비명을 입력하여 주세요.');
      focusTarget.value = 'eqp';
      return false;
    }

    isLoading.value = true;
    try {
      const result = await sideDummyService.selectEqp(eqpId.value.trim());
      isLoading.value = false;

      if (result.ok && result.data) {
        const data = result.data;
        const lotName = (data.LOTNAME || '').trim();
        const oper = data.PROCESSOPERATIONNAME || '';
        const desc = data.PODESC || '';

        operId.value = oper;
        operDesc.value = desc;
        searchOperId.value = oper;
        searchOperDesc.value = desc;
        inDate.value = data.IN_TIME || '';
        inUser.value = data.IN_USER || '';

        if (!lotName) {
          isLotDisabled.value = false;
          focusTarget.value = 'lot';
        } else {
          lotId.value = lotName;
          isBtnOutEnabled.value = true;
        }
        return true;
      }

      showAlert(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        result.message || 'Failed to retrieve equipment info.',
      );
      focusTarget.value = 'eqp';
      return false;
    } catch (error) {
      isLoading.value = false;
      const msg = error instanceof Error ? error.message : 'Unknown error occurred.';
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, msg);
      focusTarget.value = 'eqp';
      return false;
    }
  }

  /**
   * Look up lot information for dummy wafer insertion.
   */
  async function getLotInfo(rawLotId?: string): Promise<boolean> {
    if (rawLotId !== undefined) {
      lotId.value = rawLotId.trim().toUpperCase();
    }

    clearLotSearchInfo();

    if (!lotId.value.trim()) {
      showAlert('ERROR', 'LOT을 입력하여 주세요.');
      focusTarget.value = 'lot';
      return false;
    }

    isLoading.value = true;
    try {
      const result = await sideDummyService.selectLot(lotId.value.trim(), eqpId.value.trim());
      isLoading.value = false;

      if (result.ok && result.data) {
        const data = result.data;
        const oper = data.PROCESSOPERATIONNAME || '';
        const desc = data.PODESC || '';

        searchOperId.value = oper;
        searchOperDesc.value = desc;
        operId.value = oper;
        operDesc.value = desc;

        isBtnInEnabled.value = true;
        return true;
      }

      showAlert(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        result.message || 'Failed to retrieve LOT info.',
      );
      focusTarget.value = 'lot';
      return false;
    } catch (error) {
      isLoading.value = false;
      const msg = error instanceof Error ? error.message : 'Unknown error occurred.';
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, msg);
      focusTarget.value = 'lot';
      return false;
    }
  }

  /**
   * Execute IN or OUT transaction.
   */
  async function executeInOut(eventName: 'IN' | 'OUT'): Promise<boolean> {
    if (!eqpId.value.trim()) {
      showAlert('ERROR', '장비명을 입력하여 주세요.');
      focusTarget.value = 'eqp';
      return false;
    }

    if (!lotId.value.trim()) {
      showAlert('ERROR', 'LOT을 입력하여 주세요.');
      focusTarget.value = 'lot';
      return false;
    }

    isLoading.value = true;
    try {
      const operatorName = mainStore.operatorName || DeviceInfo.OPERATOR_NAME;
      const result = await sideDummyService.insertInOut({
        eventName,
        eqpId: eqpId.value.trim(),
        lotId: lotId.value.trim(),
        operId: searchOperId.value,
        operDesc: searchOperDesc.value,
        inUser: operatorName,
      });

      isLoading.value = false;

      if (result.ok) {
        clearEQPSearchInfo();
        isBtnInEnabled.value = false;
        isBtnOutEnabled.value = false;

        if (eventName === 'IN') {
          eqpId.value = '';
          focusTarget.value = 'eqp';
        } else if (eventName === 'OUT') {
          isLotDisabled.value = false;
          focusTarget.value = 'lot';
        }

        const ret = result.data?.RET || '';
        if (ret) {
          showAlert(COMMON_FIELD.TXTDIALOGTITLE_OK, ret);
        }
        return true;
      }

      showAlert(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        result.message || 'Side dummy transaction failed.',
      );
      return false;
    } catch (error) {
      isLoading.value = false;
      const msg = error instanceof Error ? error.message : 'Unknown error occurred.';
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, msg);
      return false;
    }
  }

  return {
    eqpId,
    lotId,
    operId,
    operDesc,
    inDate,
    inUser,
    searchOperId,
    searchOperDesc,
    isLotDisabled,
    isLotSearchEnabled,
    isBtnInEnabled,
    isBtnOutEnabled,
    isLoading,
    focusTarget,
    alertDialog,
    showAlert,
    closeAlert,
    clearInfo,
    clearEQPSearchInfo,
    clearLotSearchInfo,
    getEqpInfo,
    getLotInfo,
    executeInOut,
  };
});
