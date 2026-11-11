import { COMMON_FIELD } from 'src/constants/common-strings';
import { ROUTE } from 'src/constants/routes';
import { okDialog } from 'src/services/ok-dialog.service';
import { barcodeStyleEqpId } from 'src/utils/barcode-style';
import { ref } from 'vue';

import { xrfEqpTypeCheck } from '../services/remote-meas-main.service';
import type { RemoteMeasMainTarget } from '../types/remote-meas-main.types';

interface Context {
  /** CommonUtil.hideKeyboard(this, currentFocus) */
  hideKeyboard: () => void;
  /** activityFactoryResultLauncher.launch(intent) with the "Eqpid" extra. */
  launch: (target: RemoteMeasMainTarget, Eqpid: string) => void;
}

/** Android shows ResponseDataToJsonUtil.getErrorMessage (ERRMSG, or the exception message) as is. */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function showError(message: string): void {
  void okDialog.show(COMMON_FIELD.TXTDIALOGTITLE_ERROR, message, COMMON_FIELD.BTNOKSTR);
}

/** RemoteMeasMainActivity */
export function useRemoteMeasMain(context: Context) {
  /** txt_machine (InputFilter.AllCaps) */
  const txtMachine = ref('');
  /** MessageSender.send shows a modal LoadingBar while the request runs. */
  const loading = ref(false);

  let mainEqpId = '';
  let mainModel = '';

  function clearEqpInfo(): void {
    mainEqpId = '';
    mainModel = '';
  }

  function showAITActivity(Eqpid: string): void {
    context.launch(ROUTE.remoteAit, Eqpid);
  }

  function showXRFActivity(Eqpid: string): void {
    context.launch(ROUTE.remoteXrf, Eqpid);
  }

  function showAEGISActivity(Eqpid: string): void {
    context.launch(ROUTE.remoteAegis, Eqpid);
  }

  async function checkEqpType(): Promise<void> {
    // The LoadingBar is modal, so Android takes no input while XRFEQPTYPECHECK runs.
    if (loading.value) return;
    // Android calls clearEqpInfo() right after mainScope.launch, which only queues the coroutine
    // on the main looper, so the clear runs before the body below.
    clearEqpInfo();

    context.hideKeyboard();

    if (!txtMachine.value) {
      showError('장비명을 입력하여 주세요.');
      return;
    }

    loading.value = true;
    try {
      const itemsListJSON = await xrfEqpTypeCheck(txtMachine.value);
      for (const items of itemsListJSON) {
        mainModel = items.MODEL;
        mainEqpId = items.MAINEQPID;
      }
    } catch (error) {
      showError(getErrorMessage(error));
      return;
    } finally {
      loading.value = false;
    }

    if (mainModel.includes('AIT')) {
      showAITActivity(mainEqpId);
    } else if (mainModel.includes('AEGIS')) {
      showAEGISActivity(mainEqpId);
    } else {
      showXRFActivity(mainEqpId);
    }
  }

  function updateTxtMachine(value: string): void {
    txtMachine.value = value.toUpperCase();
  }

  /**
   * editorActionListener, IME_ACTION_DONE (keyboard): checkEqpType runs on the typed text; the
   * BarcodeStyle check is commented out for this branch on Android.
   */
  function onEditorAction(): void {
    void checkEqpType();
  }

  /** editorActionListener, KEYCODE_ENTER without an IME action (barcode scanner). */
  function onBarcodeEnter(): void {
    if (loading.value) return;
    const { isValid, parsedId } = barcodeStyleEqpId(txtMachine.value);
    txtMachine.value = parsedId;
    if (isValid) void checkEqpType();
  }

  return {
    txtMachine,
    loading,
    updateTxtMachine,
    clearEqpInfo,
    checkEqpType,
    onEditorAction,
    onBarcodeEnter,
  };
}
