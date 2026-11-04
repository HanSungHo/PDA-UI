import { COMMON_FIELD } from 'src/constants/common-strings';
import { useMainStore } from 'src/features/main/stores/main.store';
import { okDialog } from 'src/services/ok-dialog.service';
import { barcodeStyleLotId } from 'src/utils/barcode-style';
import { reactive } from 'vue';

import { GetCabinetInfo, SetGasusage } from '../services/gas.service';

interface MessageRecord {
  [key: string]: unknown;
}

/** Focus and keyboard side effects owned by the page (legacy requestFocus/hideKeyboard). */
export interface GasUi {
  hideKeyboard(): void;
  focusCabinet(): void;
  focusPressure(): void;
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

function isBlank(value: string): boolean {
  return value.replace(/ /g, '') === '';
}

// Legacy OkDialog.show is synchronous: the code after it runs only once OK is pressed.
async function showError(message: string): Promise<void> {
  await okDialog.show(COMMON_FIELD.TXTDIALOGTITLE_ERROR, message, COMMON_FIELD.BTNOKSTR);
}

export function useGas(ui: GasUi) {
  const mainStore = useMainStore();
  const state = reactive({
    editCabinetNo: '',
    txtCabinet: '',
    txtGas: '',
    txtPressure: '',
    txtWeight: '',
    editPressure: '',
    editWeight: '',
    editComment: '',
    weightEnabled: true,
    loading: false,
  });

  async function getData(): Promise<void> {
    if (state.loading) return;
    // Legacy focuses edit_pressure right after launching the coroutine, before any response;
    // the coroutine body then hides the keyboard of the focused view (edit_pressure).
    ui.focusPressure();
    ui.hideKeyboard();

    if (isBlank(state.editCabinetNo)) {
      await showError('CABINET NO가 확인되지 않습니다.');
      ui.focusCabinet();
      return;
    }

    state.loading = true;
    try {
      const response = await GetCabinetInfo(state.editCabinetNo);
      if (!response.isSuccessFul) return;

      // Legacy reads ITEMS[0] unguarded; an empty list leaves every field untouched.
      const [item] = getRecords(response.messageBody.ITEMS);
      if (!item) return;

      state.txtCabinet = getText(item, 'CABINET');
      state.txtGas = getText(item, 'GAS');
      state.txtPressure = getText(response.messageBody, 'PRESSURE');
      state.txtWeight = getText(response.messageBody, 'WEIGHT');
      state.weightEnabled = getText(item, 'TYPE') === 'Y';
      state.editPressure = '';
      state.editWeight = '';
    } catch {
      // Legacy transport/parse failures are silent.
    } finally {
      state.loading = false;
    }
  }

  async function setData(): Promise<void> {
    if (state.loading) return;
    ui.hideKeyboard();

    if (isBlank(state.txtCabinet)) return showError('CABINET NO가 확인되지 않습니다.');
    if (isBlank(state.txtGas)) return showError('GAS가 확인되지 않습니다.');
    if (isBlank(state.editPressure)) return showError('압력값을 입력 해야합니다.');
    if (state.weightEnabled && isBlank(state.editWeight)) {
      return showError('무게를 입력 해야합니다.');
    }

    state.loading = true;
    let isSuccessFul = false;
    try {
      const response = await SetGasusage(
        state.txtCabinet,
        mainStore.operatorId,
        state.editPressure,
        state.editWeight,
        state.editComment,
      );
      isSuccessFul = response.isSuccessFul;
    } catch {
      // Legacy transport failures are silent.
    } finally {
      state.loading = false;
    }
    if (!isSuccessFul) return;

    await okDialog.show(
      COMMON_FIELD.TXTDIALOGTITLE_INFORM,
      'Data가 입력되었습니다.',
      COMMON_FIELD.BTNOKSTR,
    );
    // COMMENT is intentionally kept (legacy clearData() call is commented out).
    const refresh = getData();
    ui.focusCabinet();
    await refresh;
  }

  function clearData(): void {
    state.txtCabinet = '';
    state.txtGas = '';
    state.editPressure = '';
    state.editWeight = '';
    ui.focusCabinet();
    state.editComment = '';
  }

  /**
   * Physical Enter (key up): valid barcode searches, invalid clears the form. The browser has no
   * separate IME "Done" action (legacy EVENT-01), so only this path is mapped.
   */
  async function onCabinetEnter(): Promise<void> {
    const barcode = barcodeStyleLotId(state.editCabinetNo);
    state.editCabinetNo = barcode.parsedId;
    if (barcode.isValid) await getData();
    else clearData();
  }

  return { state, getData, setData, clearData, onCabinetEnter };
}
