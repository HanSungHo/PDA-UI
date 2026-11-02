import { COMMON_FIELD } from 'src/constants/common-strings';
import { useMainStore } from 'src/features/main/stores/main.store';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { prChangeService } from '../services/pr-change.service';
import type {
  PrChangeDialog,
  PrChangeRadioType,
  PrChangeServiceResult,
} from '../types/pr-change.types';
import {
  extractPrInfo,
  isValidDateLength,
  isValidPrLength,
  stripPumpBarcode,
} from '../utils/pr-change.util';

export type PrChangeFocusField =
  | 'editPumpId'
  | 'editCurrentPr'
  | 'editChangePr'
  | 'editInDate'
  | 'editOutPr';

const MSG_RECEIVE_FAILED = 'MSG 수신에 실패하였습니다.\n잠시후 시도해 주시기 바랍니다.';

/**
 * Port of hifos2 PRChangeActivity. Function and variable names intentionally follow the
 * legacy Kotlin source so both implementations can be reviewed side by side.
 */
export function usePrChange() {
  const router = useRouter();
  const mainStore = useMainStore();

  // legacy: viewBinding.edit* (EditText)
  const editPumpId = ref('');
  const editCurrentPr = ref('');
  const editChangePr = ref('');
  const editInDate = ref('');
  const editOutPr = ref('');
  const editUserId = ref('');

  // legacy: EditText.isEnabled
  const editCurrentPrEnabled = ref(true);
  const editInDateEnabled = ref(true);
  const editOutPrEnabled = ref(true);
  const editUserIdEnabled = ref(true);

  // legacy: viewBinding.txt* (TextView)
  const txtPumpName = ref('');
  const txtProductNameMaster = ref('');
  const txtVendorMaster = ref('');
  const txtPrIdMaster = ref('');
  const txtPrId = ref('');
  const txtVendor = ref('');
  const txtProductName = ref('');
  const txtViscosity = ref('');
  const txtExpDate = ref('');
  const txtLotNo = ref('');

  // legacy: viewBinding.btnChange.isEnabled
  const btnChangeEnabled = ref(false);

  // legacy: private vars
  let m_sEQPID = '';
  let m_sTIME = '';
  let currentFlag = false;
  let m_Flag = false;
  const b_Leak = ref(false);

  const loading = ref(false);
  const dialog = ref<PrChangeDialog | null>(null);
  const confirmDialog = ref<PrChangeDialog | null>(null);
  const focusRequest = ref<{ field: PrChangeFocusField; seq: number } | null>(null);
  let focusSeq = 0;
  let resolveConfirm: ((value: boolean) => void) | undefined;

  function requestFocus(field: PrChangeFocusField): void {
    focusRequest.value = { field, seq: ++focusSeq };
  }

  /** legacy: OkDialog.show(...) */
  function showOkDialog(title: string, message: string): void {
    dialog.value = { title, message };
  }

  function closeOkDialog(): void {
    dialog.value = null;
  }

  /** legacy: OkCancelDialog.show(...) resolving to RETURN_CODE_OK (true) / RETURN_CODE_CANCEL (false). */
  function showOkCancelDialog(title: string, message: string): Promise<boolean> {
    confirmDialog.value = { title, message };
    return new Promise<boolean>((resolve) => {
      resolveConfirm = resolve;
    });
  }

  function answerConfirmDialog(accepted: boolean): void {
    confirmDialog.value = null;
    resolveConfirm?.(accepted);
    resolveConfirm = undefined;
  }

  /** legacy: MessageSender.send wrapped by the LoadingBar. */
  async function sendWithLoading(
    request: () => Promise<PrChangeServiceResult>,
  ): Promise<PrChangeServiceResult> {
    loading.value = true;
    try {
      return await request();
    } finally {
      loading.value = false;
    }
  }

  function showErrorDialog(errorMessage: string): void {
    showOkDialog(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorMessage);
  }

  function getBarcodePrId(): boolean {
    const returnPrId = stripPumpBarcode(editPumpId.value);
    if (returnPrId === null) {
      showOkDialog('READING ERROR', '조회하실 PUMP를 읽어주세요.');
      editPumpId.value = '';
      return false;
    }
    editPumpId.value = returnPrId;
    return true;
  }

  function checkPrLength(pr: 'editCurrentPr' | 'editChangePr' | 'editOutPr'): boolean {
    const target = { editCurrentPr, editChangePr, editOutPr }[pr];
    if (!isValidPrLength(target.value)) {
      target.value = '';
      requestFocus(pr);
      showOkDialog(
        'READING ERROR',
        'BARCODE형식이 일치하지 않습니다. PR병의 BARCODE를 다시 읽어주세요.',
      );
      return false;
    }
    return true;
  }

  function checkDateLength(): boolean {
    if (!isValidDateLength(editInDate.value)) {
      editInDate.value = '';
      requestFocus('editInDate');
      showOkDialog(
        'READING ERROR',
        '날짜형식이 일치하지 않습니다. 상온입고 BARCODE를 다시 읽어주세요.',
      );
      return false;
    }
    return true;
  }

  async function getPRInfo(): Promise<void> {
    if (!m_Flag) {
      showOkDialog(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '현재 PR을 먼저 조회하시기 바랍니다.');
      editChangePr.value = '';
      return;
    }

    const prMap = extractPrInfo(editChangePr.value);

    // legacy MessageFactoryUtil.prInfo(eqpId, pumpName, prId, prLot, vIsCosity, validate) is called
    // with (…, PRID, VISCOSITY, PRLOTNO, VALIDATE), so prLot carries the viscosity and vice versa.
    const message = await sendWithLoading(() =>
      prChangeService.prInfo({
        eqpId: m_sEQPID,
        pumpName: txtPumpName.value,
        prId: prMap.PRID,
        prLot: prMap.VISCOSITY,
        viscosity: prMap.PRLOTNO,
        validate: prMap.VALIDATE,
      }),
    );

    if (message.isSuccessFul) {
      const body = message.messageBody;
      m_sTIME = body.TIME ?? '';

      txtPrId.value = body.PRID ?? '';
      txtVendor.value = body.PRCOMP ?? '';
      txtProductName.value = body.PRDESC ?? '';
      // legacy assigns prMap["PRID"] to txtViscosity; kept for behavioural parity.
      txtViscosity.value = prMap.PRID;
      txtLotNo.value = prMap.PRLOTNO;
      txtExpDate.value = prMap.VALIDATE;

      if (!currentFlag) {
        btnChangeEnabled.value = true;
      } else {
        requestFocus('editInDate');
      }
    } else {
      editChangePr.value = '';
      showErrorDialog(message.errorMessage);
    }
  }

  async function getComparePRInfo(): Promise<void> {
    const prMap = extractPrInfo(editOutPr.value);

    const message = await sendWithLoading(() =>
      prChangeService.comparePrInfo({
        eqpId: m_sEQPID,
        pumpName: txtPumpName.value,
        prId: prMap.PRID,
        prLot: prMap.PRLOTNO,
        viscosity: prMap.VISCOSITY,
        time: m_sTIME,
        banJangId: editUserId.value,
      }),
    );

    if (message.isSuccessFul) {
      const sConfrimPR = message.messageBody.PRID ?? '';

      if (sConfrimPR === '') {
        showErrorDialog(MSG_RECEIVE_FAILED);
      } else {
        btnChangeEnabled.value = true;
      }
    } else {
      editOutPr.value = '';
      showErrorDialog(message.errorMessage);
    }
  }

  async function getPumpStats(): Promise<void> {
    const message = await sendWithLoading(() =>
      prChangeService.pumpStatus({ pumpId: editPumpId.value }),
    );

    if (message.isSuccessFul) {
      const body = message.messageBody;

      m_sEQPID = body.EQPID ?? '';
      txtPumpName.value = body.PUMPNAME ?? '';
      txtVendorMaster.value = body.PRCOMP ?? '';
      txtProductNameMaster.value = body.PRDESC ?? '';
      txtPrIdMaster.value = body.PRID ?? '';

      if ((body.FLAG ?? '') === '1') {
        editCurrentPrEnabled.value = true;
        requestFocus('editCurrentPr');
        currentFlag = true;
        m_Flag = false;
      } else {
        editCurrentPr.value = '이전 사용 이력 없음';
        editCurrentPrEnabled.value = false;
        editInDateEnabled.value = false;
        editOutPrEnabled.value = false;
        editUserIdEnabled.value = false;
        requestFocus('editChangePr');
        currentFlag = false;
        m_Flag = true;
      }
    } else {
      m_Flag = false;
      editPumpId.value = '';
      showErrorDialog(message.errorMessage);
    }
  }

  async function getCurrentPrInfo(): Promise<void> {
    if (m_sEQPID === '') {
      showOkDialog(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'PUMP를 먼저 조회하시기 바랍니다.');
      requestFocus('editPumpId');
      return;
    }

    const prMap = extractPrInfo(editCurrentPr.value);

    const message = await sendWithLoading(() =>
      prChangeService.currentPrInfo({
        eqpId: m_sEQPID,
        pumpName: txtPumpName.value,
        prId: prMap.PRID,
        prLot: prMap.PRLOTNO,
        viscosity: prMap.VISCOSITY,
      }),
    );

    if (message.isSuccessFul) {
      const sConfrimPR = message.messageBody.PRID ?? '';

      if (sConfrimPR === '') {
        m_Flag = false;
        showErrorDialog(MSG_RECEIVE_FAILED);
      } else {
        m_Flag = true;
        requestFocus('editChangePr');
      }
    } else {
      editCurrentPr.value = '';
      m_Flag = false;
      showErrorDialog(message.errorMessage);
    }
  }

  async function prChange(): Promise<void> {
    if (!b_Leak.value) {
      const accepted = await showOkCancelDialog(
        COMMON_FIELD.TXTDIALOGTITLE_INFORM,
        'PR LEAK 이상이 없습니다. 계속 진행하시겠습니까?',
      );
      if (!accepted) return;
    }

    const message = await sendWithLoading(() =>
      prChangeService.prChange({
        eqpId: m_sEQPID,
        pumpName: txtPumpName.value,
        prId: txtPrId.value,
        prDesc: txtProductName.value,
        prComp: txtVendor.value,
        viscosity: txtViscosity.value,
        prLot: txtLotNo.value,
        validateTime: txtExpDate.value,
        userId: mainStore.operatorId,
        userName: mainStore.operatorName,
        leak: String(b_Leak.value),
        inDate: editInDate.value,
      }),
    );

    if (message.isSuccessFul) {
      showOkDialog(COMMON_FIELD.TXTDIALOGTITLE_OK, '교체되었습니다.');
      clearData();
    } else {
      showErrorDialog(message.errorMessage);
    }
  }

  function clearData(): void {
    editUserId.value = '';
    editPumpId.value = '';
    editOutPr.value = '';
    editChangePr.value = '';
    editCurrentPr.value = '';
    editInDate.value = '';
    txtPumpName.value = '';
    txtVendorMaster.value = '';
    txtVendor.value = '';
    txtPrIdMaster.value = '';
    txtPrId.value = '';
    txtProductNameMaster.value = '';
    txtLotNo.value = '';
    txtExpDate.value = '';
    txtViscosity.value = '';
    b_Leak.value = false;

    requestFocus('editPumpId');
  }

  function checkedRadioButton(radioType: PrChangeRadioType): void {
    b_Leak.value = radioType === 'LEAK_Y';
  }

  /** legacy: editPumpId IME_ACTION_DONE / ENTER listener. */
  function onPumpIdEditorAction(): void {
    if (getBarcodePrId()) void getPumpStats();
  }

  /** legacy: editCurrentPr IME_ACTION_DONE / ENTER listener. */
  function onCurrentPrEditorAction(): void {
    if (checkPrLength('editCurrentPr')) void getCurrentPrInfo();
  }

  /** legacy: editChangePr IME_ACTION_DONE / ENTER listener. */
  function onChangePrEditorAction(): void {
    if (checkPrLength('editChangePr')) void getPRInfo();
  }

  /** legacy: editInDate IME_ACTION_DONE / ENTER listener. */
  function onInDateEditorAction(): void {
    if (checkDateLength()) requestFocus('editOutPr');
  }

  /** legacy: editOutPr IME_ACTION_DONE / ENTER listener. */
  function onOutPrEditorAction(): void {
    if (checkPrLength('editOutPr')) void getComparePRInfo();
  }

  /** legacy: btnCancel -> finish() */
  function finish(): void {
    router.back();
  }

  return {
    editPumpId,
    editCurrentPr,
    editChangePr,
    editInDate,
    editOutPr,
    editUserId,
    editCurrentPrEnabled,
    editInDateEnabled,
    editOutPrEnabled,
    editUserIdEnabled,
    txtPumpName,
    txtProductNameMaster,
    txtVendorMaster,
    txtPrIdMaster,
    txtPrId,
    txtVendor,
    txtProductName,
    txtViscosity,
    txtExpDate,
    txtLotNo,
    btnChangeEnabled,
    b_Leak,
    loading,
    dialog,
    confirmDialog,
    focusRequest,
    closeOkDialog,
    answerConfirmDialog,
    getPumpStats,
    getCurrentPrInfo,
    getPRInfo,
    getComparePRInfo,
    prChange,
    clearData,
    checkedRadioButton,
    onPumpIdEditorAction,
    onCurrentPrEditorAction,
    onChangePrEditorAction,
    onInDateEditorAction,
    onOutPrEditorAction,
    finish,
  };
}
