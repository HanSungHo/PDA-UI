import { COMMON_FIELD } from 'src/constants/common-strings';
import { ROUTE } from 'src/constants/routes';
import { useMainStore } from 'src/features/main/stores/main.store';
import { okCancelDialog, RETURN_CODE_OK } from 'src/services/ok-cancel-dialog.service';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { lotStatusByBayService } from '../services/lot-status-by-bay.service';
import type {
  LotStatusByBayDialog,
  LotStatusByBayPort,
  LotStatusByBayRow,
  LotStatusByBayServiceResult,
} from '../types/lot-status-by-bay.types';

/** legacy MyGestureListener: at most six rows can be selected for 출고. */
export const MAX_SELECTED_ROW_COUNT = 6;
/** legacy setSTKSpinner appends this item to every stocker list. */
export const STK_ALL = '모두';

const MSG_NO_DATA = '조회된 데이터가 없습니다.';

/**
 * Port of hifos2 LotStatusByBayActivity. Function and variable names intentionally follow the
 * legacy Kotlin source so both implementations can be reviewed side by side.
 */
export function useLotStatusByBay() {
  const router = useRouter();
  const mainStore = useMainStore();

  // legacy: viewBinding.spinnerBay / spinnerStk (null selectedItem = InitSpinnerAdapter row 0)
  const spinnerBayItems = ref<string[]>([]);
  const spinnerBaySelectedItem = ref<string | null>(null);
  const spinnerSTKItems = ref<string[]>([]);
  const spinnerStkSelectedItem = ref<string | null>(null);

  // legacy: viewBinding.editJob
  const editJob = ref('');

  // legacy: viewBinding.mainBody; null while it has no CTMainLayout child (childCount == 0)
  const gridList = ref<LotStatusByBayRow[] | null>(null);
  const selectedRowCount = ref(0);
  const selectedRowList = ref<number[]>([]);

  // legacy: viewBinding.radioOneOut / radioTwoOut
  const checkedPort = ref<LotStatusByBayPort>('OUT');

  // legacy: Button.isEnabled. activity_lot_status_by_bay.xml disables btn_stocker_out, btn_carry
  // and both radio buttons, and the Activity never enables them (btnCarry is commented out in
  // buttonEnable), so only btnEsheet changes state.
  const btnEsheetEnabled = ref(false);
  const btnStockerOutEnabled = false;
  const btnCarryEnabled = false;
  const radioPortEnabled = false;

  const loading = ref(false);
  const dialog = ref<LotStatusByBayDialog | null>(null);
  // legacy: viewBinding.editJob.selectAll() after a search request
  const selectAllRequest = ref(0);

  const hasGridData = computed(() => gridList.value !== null);

  /** legacy: OkDialog.show(...) */
  function showOkDialog(title: string, message: string): void {
    dialog.value = { title, message };
  }

  function closeOkDialog(): void {
    dialog.value = null;
  }

  function showErrorDialog(errorMessage: string): void {
    showOkDialog(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorMessage);
  }

  /** legacy: MessageSender.send wrapped by the LoadingBar. */
  async function sendWithLoading<T>(
    request: () => Promise<LotStatusByBayServiceResult<T>>,
  ): Promise<LotStatusByBayServiceResult<T>> {
    loading.value = true;
    try {
      return await request();
    } finally {
      loading.value = false;
    }
  }

  function selectedRows(): LotStatusByBayRow[] {
    const rows = gridList.value ?? [];
    return [...selectedRowList.value]
      .sort((a, b) => a - b)
      .map((row) => rows[row])
      .filter((row): row is LotStatusByBayRow => row !== undefined);
  }

  function buttonEnable(state: boolean): void {
    checkedPort.value = 'OUT';
    btnEsheetEnabled.value = state;
  }

  async function setSpinnerBay(): Promise<void> {
    const message = await sendWithLoading(() =>
      lotStatusByBayService.areaBayInfo({ area: mainStore.area, facility: mainStore.facility }),
    );

    if (message.isSuccessFul) {
      setBaySpinner(message.messageBody);
    } else {
      showErrorDialog(message.errorMessage);
    }
  }

  /** Setting the adapter selects the empty row 0, which fires onItemSelected -> setSpinnerSTK. */
  function setBaySpinner(itemList: string[]): void {
    spinnerBayItems.value = itemList;
    spinnerBaySelectedItem.value = null;
    void setSpinnerSTK();
  }

  function clearData(): void {
    spinnerSTKItems.value = [];
    spinnerStkSelectedItem.value = null;
    editJob.value = '';
    gridList.value = null;

    buttonEnable(false);
  }

  async function setSpinnerSTK(): Promise<void> {
    clearData();

    const bay = spinnerBaySelectedItem.value;
    if (bay === null) return;

    const message = await sendWithLoading(() =>
      lotStatusByBayService.bayStockerInfo({ bay, facility: mainStore.facility }),
    );

    if (message.isSuccessFul) {
      setSTKSpinner(message.messageBody);
    } else {
      showErrorDialog(message.errorMessage);
    }
  }

  /** setSelection(1, false) selects the first stocker, or 모두 when the bay has none. */
  function setSTKSpinner(itemList: string[]): void {
    spinnerSTKItems.value = [...itemList, STK_ALL];
    spinnerStkSelectedItem.value = spinnerSTKItems.value[0] ?? null;
  }

  function clearGridData(): void {
    gridList.value = null;
    selectedRowCount.value = 0;
    selectedRowList.value = [];
  }

  async function searchLotList(): Promise<void> {
    clearGridData();

    const bay = spinnerBaySelectedItem.value;
    if (bay === null) {
      showErrorDialog('BAY를 선택해주세요');
      return;
    }

    const stk = spinnerStkSelectedItem.value;
    if (stk === null) {
      showErrorDialog('STK를 선택해주세요');
      return;
    }

    const message = await sendWithLoading(() =>
      lotStatusByBayService.blstInfo({
        bay,
        stk,
        job: editJob.value,
        facility: mainStore.facility,
      }),
    );

    if (message.isSuccessFul) {
      gridList.value = message.messageBody;
    } else {
      showErrorDialog(message.errorMessage);
    }
  }

  /** legacy: MyGestureListener.onSingleTapUp on a grid row. */
  function onSingleTapUp(rowIndex: number): void {
    const isSelected = selectedRowList.value.includes(rowIndex);

    if (!isSelected && selectedRowCount.value + 1 > MAX_SELECTED_ROW_COUNT) {
      showErrorDialog('최대 6개까지 지정할수 있습니다.');
      return;
    }

    if (isSelected) {
      selectedRowCount.value--;
      selectedRowList.value = selectedRowList.value.filter((row) => row !== rowIndex);
    } else {
      selectedRowCount.value++;
      selectedRowList.value = [...selectedRowList.value, rowIndex];
    }

    buttonEnable(selectedRowCount.value === 1);
  }

  /** legacy: btnSelectedCancel */
  function selectedCancel(): void {
    if (!hasGridData.value) return;

    selectedRowList.value = [];
    selectedRowCount.value = 0;
    buttonEnable(false);
  }

  /**
   * btnEsheet stays enabled after a new search clears the selection, so this guard is reachable.
   * The legacy Activity shows the dialog and then reads selectedRowList[0] anyway (and crashes on
   * the empty list); here it stops after the dialog.
   */
  function executeEsheet(): void {
    if (selectedRowCount.value !== 1) {
      showErrorDialog('eSheet조회는 한개의 LOT만 선택하세요.');
      return;
    }

    const lotName = selectedRows()[0]?.LOTID ?? '';
    void router.push({ path: `/${ROUTE.esheet}`, query: { lotId: lotName } });
  }

  async function executeSTKout(): Promise<void> {
    if (!hasGridData.value) {
      showErrorDialog(MSG_NO_DATA);
      return;
    }

    const lotIdList: string[] = [];

    for (const rowData of selectedRows()) {
      if (rowData.LOC_TYPE !== 'S') {
        showErrorDialog(`LOT NO [${rowData.LOTID}]는 STOCKER내에 있지 않습니다`);
        return;
      }

      lotIdList.push(`    ${rowData.LOTID}`);
    }

    const out = checkedPort.value;
    const message = ['LOT NO:', ...lotIdList, `를 ${out} PORT로 출고 하시겠습니까?`].join('\n');

    const returnCode = await okCancelDialog.show(
      COMMON_FIELD.TXTDIALOGTITLE_OK,
      message,
      COMMON_FIELD.POSITIVEBTNSTR,
      COMMON_FIELD.NEGATIVEBTNSTR,
    );

    if (returnCode === RETURN_CODE_OK) {
      await stockerOut();
    }
  }

  async function stockerOut(): Promise<void> {
    const port = checkedPort.value;
    const items = selectedRows().map((rowData) => ({
      lotId: rowData.LOTID,
      stockerId: rowData.LOCATION,
    }));

    const message = await sendWithLoading(() =>
      lotStatusByBayService.stockOut({ facility: mainStore.facility, port, items }),
    );

    if (message.isSuccessFul) {
      await searchLotList();
    } else {
      showErrorDialog(message.errorMessage);
    }
  }

  function executeCarry(): void {
    if (!hasGridData.value) {
      showErrorDialog(MSG_NO_DATA);
      return;
    }

    const rowData = selectedRows()[0];
    if (!rowData) return;

    if (rowData.LOC_TYPE !== 'S') {
      showErrorDialog('현재 LOT이 STOCKER내에 있지 않습니다.\nSTOCKER에 입고후 반송하세요.');
      return;
    }

    void router.push({ path: `/${ROUTE.reTransfer}`, query: { LOTID: rowData.LOTID } });
  }

  /** legacy: itemSelectedListener for spinnerBay (fires only when the selection changes). */
  function onBaySelected(bay: string): void {
    if (bay === spinnerBaySelectedItem.value) return;
    spinnerBaySelectedItem.value = bay;
    void setSpinnerSTK();
  }

  /** legacy: btnSearchLot and the editJob IME_ACTION_DONE / barcode ENTER listener. */
  function onSearchLot(): void {
    void searchLotList();
    selectAllRequest.value++;
  }

  /** legacy: btnBayClose -> finish() */
  function finish(): void {
    router.back();
  }

  return {
    spinnerBayItems,
    spinnerBaySelectedItem,
    spinnerSTKItems,
    spinnerStkSelectedItem,
    editJob,
    gridList,
    selectedRowCount,
    selectedRowList,
    checkedPort,
    btnEsheetEnabled,
    btnStockerOutEnabled,
    btnCarryEnabled,
    radioPortEnabled,
    loading,
    dialog,
    selectAllRequest,
    closeOkDialog,
    setSpinnerBay,
    setSpinnerSTK,
    searchLotList,
    onSingleTapUp,
    selectedCancel,
    executeEsheet,
    executeSTKout,
    stockerOut,
    executeCarry,
    onBaySelected,
    onSearchLot,
    finish,
  };
}
