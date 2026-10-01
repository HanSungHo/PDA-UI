import { ApiError } from 'src/services/api-error';
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// ASSUMPTION: mirrors legacy DeviceInfo (FACILITY / OPERATOR_ID / OPERATOR_NAME).
// Swap for the project's actual device/auth store.
import { DeviceInfo } from '~/constants/deviceinfo';

import {
  fetchAreaBayInfo,
  fetchBayStockerInfo,
  fetchReworkInfo,
  submitRework,
} from '../services/rework.service';
import { useReworkStore } from '../stores/rework.store';
import type { SpinnerItem } from '../types/rework.types';

const ERROR_TITLE = 'Error'; // legacy: GetString.TXTDIALOGTITLE_ERROR
const GENERIC_ERROR_MESSAGE = '알 수 없는 오류가 발생했습니다.';

export function useRework() {
  const route = useRoute();
  const router = useRouter();
  const deviceInfo = DeviceInfo;
  const reworkStore = useReworkStore();

  // ---- display fields (legacy: viewBinding.txt*) ----
  const lotNo = ref('');
  const eqpId = ref('');
  const product = ref('');
  const currentOperation = ref('');
  const operator = ref('');
  const qty = ref('');
  const comment = ref('');

  // ---- rework code (legacy: spinner_rework_code) ----
  // Options list is BaseOption[] ({value,label}); the selected model is just
  // the primitive `value` (BaseDropdownValue), matched against the list when needed.
  const reworkCodeList = ref<SpinnerItem[]>([]);
  const selectedReworkCode = ref<string | undefined>(undefined);

  // ---- carry / bay / stk (legacy: chk_carry, spinner_bay, spinner_stk) ----
  const isCarryChecked = ref(false);
  const isCarryEnabled = ref(false); // legacy default: disabled in XML
  const bayList = ref<SpinnerItem[]>([]);
  const selectedBay = ref<string | undefined>(undefined);
  const stkList = ref<SpinnerItem[]>([]);
  const selectedStk = ref<string | undefined>(undefined);
  const isBayStkEnabled = ref(false); // legacy: set disabled in onCreate

  // ---- ok button (legacy: btn_ok) ----
  const isOkEnabled = ref(false); // legacy default: disabled in XML

  // legacy: spinnerBayFirst — skips the automatic first onItemSelected firing
  const spinnerBayFirst = ref(0);

  // legacy: searchOperation / searchSubOperation, saved from REWORKINFO, resent in REWORK
  const searchOperation = ref('');
  const searchSubOperation = ref('');

  // legacy: OkDialog.show(...) — now wired to BaseModal
  const messageModalOpen = ref(false);
  const messageModal = reactive({
    title: ERROR_TITLE,
    message: '',
  });
  function showError(message: string) {
    messageModal.title = ERROR_TITLE;
    messageModal.message = message;
    messageModalOpen.value = true;
  }
  function closeMessageModal() {
    messageModalOpen.value = false;
  }
  // ApiError carries the user-facing message; anything else falls back to a generic message
  function toErrorMessage(err: unknown): string {
    return err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
  }

  const isBusy = ref(false); // guards executeRework against double submit

  // legacy: clearInfo()
  function clearInfo() {
    eqpId.value = '';
    product.value = '';
    currentOperation.value = '';
    qty.value = '';
    operator.value = '';

    searchOperation.value = '';
    searchSubOperation.value = '';

    reworkCodeList.value = [];
    selectedReworkCode.value = undefined;

    isCarryEnabled.value = false;
    isOkEnabled.value = false;
  }

  // legacy: setData(lotId)
  async function setData(lotId: string) {
    clearInfo();

    try {
      const info = await fetchReworkInfo({ lotId, facility: deviceInfo.FACILITY });
      const currentStep = `${info.processStep}(${info.operation}${info.subOperation})`;

      eqpId.value = info.eqpId;
      product.value = info.product;
      currentOperation.value = currentStep;
      qty.value = info.qty;
      operator.value = `${deviceInfo.OPERATOR_NAME}(${deviceInfo.OPERATOR_ID})`;

      searchOperation.value = info.operation;
      searchSubOperation.value = info.subOperation;
      reworkCodeList.value = info.reworkCodes;

      // hidden rule: info + rework code list stay populated even if the
      // blocking checks below fail — only carry/OK enablement is gated
      if (info.state !== 'WIP') {
        showError(`${info.state} 입니다. REWORK할 수 없습니다.`);
        return;
      }

      if (info.holdStatus === 'ONHOLD') {
        showError('HOLD된 LOT입니다. REWORK할 수 없습니다.');
        return;
      }

      isCarryEnabled.value = true;
      isOkEnabled.value = true;
    } catch (err) {
      showError(toErrorMessage(err));
    }
  }

  // legacy: setBayList()
  async function setBayList() {
    try {
      const { bays } = await fetchAreaBayInfo({ facility: deviceInfo.FACILITY });
      bayList.value = bays;
    } catch (err) {
      showError(toErrorMessage(err));
    }
  }

  // legacy: setSTKList()
  async function setSTKList() {
    stkList.value = [];

    if (!selectedBay.value) {
      showError('BAY를 선택하세요.');
      return;
    }

    try {
      const { stockers } = await fetchBayStockerInfo({
        bay: selectedBay.value,
        facility: deviceInfo.FACILITY,
      });
      stkList.value = stockers;
    } catch (err) {
      showError(toErrorMessage(err));
    }
  }

  // legacy: checkChangeListener (chk_carry OnCheckedChangeListener)
  watch(isCarryChecked, (checked) => {
    if (checked) {
      isBayStkEnabled.value = true;
      void setBayList();
    } else {
      isBayStkEnabled.value = false;
      bayList.value = [];
      stkList.value = [];
      selectedBay.value = undefined;
      selectedStk.value = undefined;
      spinnerBayFirst.value = 0;
    }
  });

  // legacy: selectItemListener (spinner_bay OnItemSelectedListener) — loads
  // STK only from the second selection onward, skipping the automatic first fire
  watch(selectedBay, () => {
    spinnerBayFirst.value += 1;
    if (spinnerBayFirst.value > 1) {
      void setSTKList();
    }
  });

  // legacy: onEditorActionListener (IME_ACTION_DONE on edit_comment)
  function onCommentEnter(event: KeyboardEvent) {
    (event.target as HTMLElement | null)?.blur();
  }

  // legacy: executeRework()
  async function executeRework() {
    if (isBusy.value) return; // legacy: OnSingleClickListener debounce

    if (!selectedReworkCode.value) {
      showError('REWORK코드를 선택하세요.');
      return;
    }

    if (isCarryChecked.value) {
      if (!selectedBay.value) {
        showError('BAY를 선택하세요.');
        return;
      }
      if (!selectedStk.value) {
        showError('STOCKER를 선택하세요.');
        return;
      }
    }

    const isCarry = isCarryChecked.value ? 'Y' : 'N';
    const bay = isCarry === 'Y' ? (selectedBay.value ?? '') : '';
    const stocker = isCarry === 'Y' ? (selectedStk.value ?? '') : '';

    isBusy.value = true;
    try {
      await submitRework({
        lotId: lotNo.value,
        facility: deviceInfo.FACILITY,
        eqpId: eqpId.value,
        reworkCode: selectedReworkCode.value,
        comment: comment.value,
        operatorId: deviceInfo.OPERATOR_ID,
        operation: searchOperation.value,
        subOperation: searchSubOperation.value,
        isCarry,
        bay,
        stocker,
        qty: qty.value,
      });

      // legacy: setResult(RESULT_OK); finish()
      reworkStore.complete({ status: 'ok', lotId: lotNo.value });
      router.back();
    } catch (err) {
      showError(toErrorMessage(err));
    } finally {
      isBusy.value = false;
    }
  }

  // legacy: onSingleClickListener -> btn_cancel -> finish() (RESULT_CANCELED)
  function handleCancel() {
    reworkStore.cancel(lotNo.value);
    router.back();
  }

  // legacy: onCreate() — read intent extra LOTID and kick off setData
  async function init() {
    isBayStkEnabled.value = false; // legacy: spinnerBay/Stk.isEnabled = false
    // Previous caller's result from an earlier Rework session must not leak
    // into this one — the caller is expected to read it right after router.back().
    reworkStore.clearResult();

    const lotId = route.query.LOTID as string | undefined;
    if (lotId && lotId.length > 0) {
      lotNo.value = lotId;
      await setData(lotId);
    }
  }

  const isReworkCodeSelected = computed(() => selectedReworkCode.value !== undefined);

  return {
    // fields
    lotNo,
    eqpId,
    product,
    currentOperation,
    operator,
    qty,
    comment,
    // rework code
    reworkCodeList,
    selectedReworkCode,
    isReworkCodeSelected,
    // carry / bay / stk
    isCarryChecked,
    isCarryEnabled,
    isBayStkEnabled,
    bayList,
    selectedBay,
    stkList,
    selectedStk,
    // ok button
    isOkEnabled,
    isBusy,
    // dialog
    messageModalOpen,
    messageModal,
    closeMessageModal,
    // actions
    init,
    onCommentEnter,
    executeRework,
    handleCancel,
  };
}
