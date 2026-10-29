import { COMMON_FIELD } from 'src/constants/common-strings';
import { useMainStore } from 'src/features/main/stores/main.store';
import { normalizeApiError } from 'src/services/api-error';
import { barcodeStyleLotId } from 'src/utils/barcode-style';
import { reactive } from 'vue';

import { ComPareWaferType, getWaferTYpe } from '../services/wafer-code-check.service';

interface MessageRecord {
  [key: string]: unknown;
}

interface WaferDialog {
  kind: 'alert' | 'confirm';
  title: string;
  message: string;
  focusTarget?: 'initial' | 'run';
  onAcknowledge?: () => void;
}

function isRecord(value: unknown): value is MessageRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRecords(value: unknown): MessageRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];
  if (Object.prototype.hasOwnProperty.call(value, 'ITEM')) return getRecords(value.ITEM);
  return Object.keys(value).length > 0 ? [value] : [];
}

function getText(record: MessageRecord, key: string): string {
  const value = record[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export function useWafercodecheck() {
  const mainStore = useMainStore();
  const state = reactive({
    editRunBoxNo: '',
    editInitialboxNo: '',
    txtInitialName: '',
    txtLotName: '',
    txtWaferName: '',
    selectedReason: undefined as string | undefined,
    reasonOptions: [] as Array<{ label: string; value: string }>,
    reasonEnabled: false,
    loading: false,
    dialog: null as WaferDialog | null,
  });

  function openAlert(
    title: string,
    message: string,
    focusTarget?: WaferDialog['focusTarget'],
    onAcknowledge?: () => void,
  ) {
    state.dialog = { kind: 'alert', title, message, focusTarget, onAcknowledge };
  }

  function clearWaferInfo() {
    state.txtLotName = '';
    state.txtWaferName = '';
    state.selectedReason = undefined;
    state.reasonOptions = [];
    state.reasonEnabled = false;
  }

  function getinitialInfo(): boolean {
    if (!state.editInitialboxNo) {
      openAlert('ERROR', 'INITIAL BOX 이름을입력하여 주세요.', 'initial');
    }

    state.txtInitialName = state.editInitialboxNo;
    state.editInitialboxNo = '';
    return true;
  }

  async function getWaferInfo(): Promise<boolean> {
    if (state.loading) return false;

    clearWaferInfo();
    if (!state.editRunBoxNo) {
      openAlert('ERROR', 'RUN NAME을 입력하여 주세요.', 'run');
    }

    state.loading = true;
    try {
      const response = await getWaferTYpe(state.editRunBoxNo);
      if (!response.isSuccessFul) {
        state.editRunBoxNo = '';
        openAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, response.errorMessage, 'run');
        return false;
      }

      const items = getRecords(response.messageBody.ITEMS);
      if (items.length === 0) {
        state.editRunBoxNo = '';
        return false;
      }

      const waferInfo = items[0];
      state.txtLotName = getText(waferInfo, 'LOTNAME');
      state.txtWaferName = getText(waferInfo, 'WAFERTYPE');
      state.reasonOptions = getRecords(response.messageBody.COMMNETLIST)
        .map((item) => getText(item, 'TYPEVALUE'))
        .filter(Boolean)
        .map((value) => ({ label: value, value }));
      state.selectedReason = undefined;
      state.reasonEnabled = true;
      state.editRunBoxNo = '';
      return true;
    } catch (error) {
      state.editRunBoxNo = '';
      openAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, normalizeApiError(error).message, 'run');
      return false;
    } finally {
      state.loading = false;
    }
  }

  async function handleRunEnter(): Promise<boolean> {
    if (state.loading) return false;
    const barcode = barcodeStyleLotId(state.editRunBoxNo);
    state.editRunBoxNo = barcode.parsedId;
    if (!barcode.isValid) {
      clearWaferInfo();
      return false;
    }
    return getWaferInfo();
  }

  async function compareWaferType(): Promise<void> {
    if (!state.txtLotName) {
      openAlert('ERROR', 'RUN NAME이 확인되지 않습니다.', 'run');
      return;
    }
    if (!state.txtWaferName) {
      openAlert('ERROR', 'WAFERTYPE이 확인되지 않습니다.', 'run');
      return;
    }

    state.loading = true;
    try {
      const response = await ComPareWaferType(
        state.txtLotName,
        state.txtWaferName,
        state.txtInitialName,
        state.selectedReason ?? '',
        mainStore.operatorId,
      );
      if (!response.isSuccessFul) {
        openAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, response.errorMessage, 'run');
        return;
      }

      if (getText(response.messageBody, 'COMPARERESULT') === 'NG') {
        openAlert('확 인', 'WAFER자재 확인에 실패 하였습니다.', 'run');
        return;
      }

      openAlert('확 인', '정상처리 되었습니다.', 'run', () => {
        state.txtLotName = '';
        state.txtInitialName = '';
        state.txtWaferName = '';
        state.selectedReason = undefined;
        state.reasonEnabled = false;
      });
    } catch (error) {
      openAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, normalizeApiError(error).message, 'run');
    } finally {
      state.loading = false;
    }
  }

  async function executewf(): Promise<void> {
    if (state.loading) return;

    if (!state.txtInitialName && !state.reasonEnabled) {
      state.dialog = {
        kind: 'confirm',
        title: COMMON_FIELD.TXTDIALOGTITLE_INFORM,
        message: 'INITIALBOX내용이 확인되지 않습니다.\n진행 하시겠습니까?',
      };
      return;
    }

    await compareWaferType();
  }

  async function confirmExecution(): Promise<void> {
    state.dialog = null;
    await compareWaferType();
  }

  function acknowledgeDialog(): WaferDialog['focusTarget'] {
    const currentDialog = state.dialog;
    state.dialog = null;
    currentDialog?.onAcknowledge?.();
    return currentDialog?.focusTarget;
  }

  function cancelDialog() {
    state.dialog = null;
  }

  return {
    state,
    getinitialInfo,
    getWaferInfo,
    handleRunEnter,
    executewf,
    confirmExecution,
    acknowledgeDialog,
    cancelDialog,
  };
}
