import { storeToRefs } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { ROUTE } from 'src/constants/routes';
import { useMachineStatusStore } from 'src/features/machine-status/stores/machine-status.store';
import { useMainStore } from 'src/features/main/stores/main.store';
import { okDialog } from 'src/services/ok-dialog.service';
import { barcodeStyleEqpId } from 'src/utils/barcode-style';
import { computed, nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';

import { machineStatusService } from '../services/machine-status.service';
import { toItemArray } from '../utils/item-list';

interface BayOption {
  value: string;
  label: string;
}

export function useMachineStatus() {
  const router = useRouter();
  const mainStore = useMainStore();
  const machineStatusStore = useMachineStatusStore();
  const { bays, selectedBay, eqpId, rows, isLoading, hasLoadedBays } =
    storeToRefs(machineStatusStore);

  const bayOptions = computed<BayOption[]>(() =>
    bays.value.map((item) => ({ value: item.BAY, label: item.BAY })),
  );

  const eqpInputRef = ref<{ focus: () => void; select: () => void } | null>(null);

  /** Legacy editEqpId.requestFocus() + selectAll(). */
  async function focusEqpInput(): Promise<void> {
    await nextTick();
    eqpInputRef.value?.focus();
    eqpInputRef.value?.select();
  }

  function showError(message: string): void {
    void okDialog.show(COMMON_FIELD.TXTDIALOGTITLE_ERROR, message, COMMON_FIELD.BTNOKSTR);
  }

  /** Legacy clearData(): clears the equipment input and the grid. */
  function clearData(): void {
    eqpId.value = '';
    rows.value = [];
  }

  /** Legacy setBaySpinner(): clears data then loads BAY list for AREA/FACILITY. */
  async function loadBays(): Promise<void> {
    clearData();
    isLoading.value = true;
    try {
      if (!mainStore.isSettingReady || !mainStore.mobileServerName) {
        await mainStore.initMain();
      }
      const result = await machineStatusService.areaBayInfo(mainStore.area, mainStore.facility);
      if (!result.ok) {
        bays.value = [];
        hasLoadedBays.value = true;
        showError(result.message);
        return;
      }
      bays.value = toItemArray(result.data.BAYS);
      hasLoadedBays.value = true;
      void focusEqpInput();
    } catch (error) {
      bays.value = [];
      showError(error instanceof Error ? error.message : String(error));
    } finally {
      isLoading.value = false;
    }
  }

  function handleBayChange(value: unknown): void {
    const bay = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    selectedBay.value = bay || null;
  }

  /** Legacy setEQPList(): returns when no BAY is selected, otherwise loads equipment rows. */
  async function loadEqpList(): Promise<void> {
    if (!selectedBay.value) return;
    clearData();
    isLoading.value = true;
    try {
      const result = await machineStatusService.bayEqpInfo(selectedBay.value, mainStore.facility);
      if (!result.ok) {
        showError(result.message);
        return;
      }
      rows.value = toItemArray(result.data.EQPITEMS);
    } catch (error) {
      showError(error instanceof Error ? error.message : String(error));
    } finally {
      isLoading.value = false;
    }
  }

  /** Legacy single tap on a grid row: fills the equipment input. */
  function handleRowSelect(row: Record<string, unknown>): void {
    eqpId.value = typeof row.EQPID === 'string' ? row.EQPID : '';
  }

  function openDetail(targetEqpId: string): void {
    void router.push({ name: ROUTE.machineStatusDetail, query: { EQPID: targetEqpId } });
  }

  /** Legacy double tap on a grid row: opens detail for that equipment. */
  function handleRowDoubleClick(row: Record<string, unknown>): void {
    // Legacy: the tap fills editEqpId first, then showDetailMachine() reads that input.
    handleRowSelect(row);
    handleDetailClick();
  }

  /** Legacy IME DONE / ENTER on the equipment input: barcode check, then detail. */
  function handleEqpEnter(): void {
    const { isValid, parsedId } = barcodeStyleEqpId(eqpId.value);
    if (isValid) {
      // Legacy BarcodeStyle.eqpId: editEqpId.setText(returnEqpId), so the input keeps the parsed ID.
      eqpId.value = parsedId;
      openDetail(parsedId);
    } else {
      clearData();
    }
    void focusEqpInput();
  }

  /** Legacy showDetailMachine(): empty input shows an alert, otherwise opens detail with the raw value. */
  function handleDetailClick(): void {
    if (!eqpId.value) {
      showError('장비를 입력해주세요');
      return;
    }
    openDetail(eqpId.value);
    void focusEqpInput();
  }

  function handleClose(): void {
    machineStatusStore.resetState();
    if (router.options.history.state.back) {
      router.back();
    } else {
      void router.replace(`/${ROUTE.main}`);
    }
  }

  return {
    bayOptions,
    selectedBay,
    eqpId,
    rows,
    isLoading,
    hasLoadedBays,
    eqpInputRef,
    loadBays,
    handleBayChange,
    loadEqpList,
    handleRowSelect,
    handleRowDoubleClick,
    handleEqpEnter,
    handleDetailClick,
    handleClose,
    consumeDetailResult: machineStatusStore.consumeDetailResult,
    resetState: machineStatusStore.resetState,
  };
}
