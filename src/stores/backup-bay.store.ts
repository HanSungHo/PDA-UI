import { defineStore } from 'pinia';
import { webviewBridge } from 'src/platform/android/webview-bridge';
import { backupBayService, parseLegacyBarcodeLot } from 'src/services/backup-bay.service';
import type { AlertState, BackupBayRowItem } from 'src/types/backup-bay.types';
import { ref } from 'vue';

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];

function createInitialRows(): BackupBayRowItem[] {
  return Array.from({ length: 7 }, (_, i) => ({
    id: i + 1,
    lotId: '',
    selectedFloor: '',
    selectedBay: '',
    bayOptions: [],
    jobCode: '',
    quantity: '',
    processName: '',
    isValid: false,
  }));
}

export const useBackupBayStore = defineStore('backupBay', () => {
  const floorList = ref<string[]>([]);
  const rows = ref<BackupBayRowItem[]>(createInitialRows());
  const isLoading = ref<boolean>(false);
  const isExecuting = ref<boolean>(false);
  const allowDirectInput = ref<boolean>(false); // Strict legacy mode by default; can toggle in UI for dev

  const alertState = ref<AlertState>({
    open: false,
    title: '',
    message: '',
    type: 'info',
  });

  function showAlert(title: string, message: string, type: 'info' | 'error' | 'success' = 'error') {
    alertState.value = {
      open: true,
      title,
      message,
      type,
    };
  }

  function closeAlert() {
    alertState.value.open = false;
  }

  /**
   * Initialize dialog data: fetches floors and initial bay options
   */
  async function initDialog() {
    isLoading.value = true;
    try {
      const floors = await backupBayService.fetchFloors();
      floorList.value = floors;

      if (floors.length > 0) {
        const defaultFloor = floors[0];
        const bays = await backupBayService.fetchBays(defaultFloor);

        rows.value.forEach((row) => {
          if (!row.selectedFloor) {
            row.selectedFloor = defaultFloor;
            row.bayOptions = [...bays];
          }
        });
      }
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Change Floor on row (BB-BR-003 & BB-BR-004)
   */
  async function setFloor(rowIndex: number, floor: string) {
    if (!rows.value[rowIndex]) return;

    rows.value[rowIndex].selectedFloor = floor;
    const bays = await backupBayService.fetchBays(floor);
    rows.value[rowIndex].bayOptions = bays;

    if (!bays.includes(rows.value[rowIndex].selectedBay)) {
      rows.value[rowIndex].selectedBay = '';
    }

    // BB-BR-003: Row 1 automatically cascades floor to rows 2..7
    if (rowIndex === 0) {
      for (let i = 1; i < rows.value.length; i++) {
        rows.value[i].selectedFloor = floor;
        rows.value[i].bayOptions = [...bays];
        if (!bays.includes(rows.value[i].selectedBay)) {
          rows.value[i].selectedBay = '';
        }
      }
    }
  }

  /**
   * Change Bay on row (BB-BR-005)
   */
  function setBay(rowIndex: number, bay: string) {
    if (!rows.value[rowIndex]) return;

    rows.value[rowIndex].selectedBay = bay;

    // BB-BR-005: Row 1 cascades bay to any row having the same floor
    if (rowIndex === 0) {
      const firstFloor = rows.value[0].selectedFloor;
      for (let i = 1; i < rows.value.length; i++) {
        if (rows.value[i].selectedFloor === firstFloor) {
          rows.value[i].selectedBay = bay;
        }
      }
    }
  }

  /**
   * Clears read-only info columns for a row
   */
  function clearRowInfo(rowIndex: number) {
    if (!rows.value[rowIndex]) return;
    rows.value[rowIndex].jobCode = '';
    rows.value[rowIndex].quantity = '';
    rows.value[rowIndex].processName = '';
    rows.value[rowIndex].isValid = false;
  }

  /**
   * Validates duplicate LOT IDs across all 7 rows (BB-BR-008)
   */
  function checkDuplicateLot(lotId: string, currentRowIndex: number): boolean {
    const duplicate = rows.value.some(
      (r, idx) => idx !== currentRowIndex && r.lotId.trim().toUpperCase() === lotId.toUpperCase(),
    );

    if (duplicate) {
      showAlert('Duplicate Lot ID Check', 'The same Lot ID already exists.');
      return false;
    }

    return true;
  }

  /**
   * Process Lot Scan / Enter input for a row
   */
  async function processLotInput(
    rowIndex: number,
    rawInput: string,
  ): Promise<{ success: boolean; focusIndex: number }> {
    if (!rows.value[rowIndex]) return { success: false, focusIndex: rowIndex };

    clearRowInfo(rowIndex);

    // BB-BR-006: Empty input check
    if (!rawInput || !rawInput.trim()) {
      showAlert('Error', 'Please enter a LOT NO.');
      return { success: false, focusIndex: rowIndex };
    }

    let parsedLot = '';

    // Check barcode styling (BB-BR-007)
    if (rawInput.startsWith(' ')) {
      const parseResult = parseLegacyBarcodeLot(rawInput);
      if (!parseResult.isValid) {
        rows.value[rowIndex].lotId = '';
        showAlert('Error', parseResult.error || 'READING ERROR: Please scan the LOT number.');
        return { success: false, focusIndex: rowIndex };
      }
      parsedLot = parseResult.lotId;
    } else if (allowDirectInput.value) {
      // In dev mode with direct input enabled, allow raw lot ID
      parsedLot = rawInput.trim();
    } else {
      // Strict legacy behavior: requires leading space
      rows.value[rowIndex].lotId = '';
      showAlert('Error', 'READING ERROR: Please scan the LOT number.');
      return { success: false, focusIndex: rowIndex };
    }

    const normalizedLot = parsedLot.toUpperCase();

    // BB-BR-008: Check duplicate
    if (!checkDuplicateLot(normalizedLot, rowIndex)) {
      rows.value[rowIndex].lotId = '';
      return { success: false, focusIndex: rowIndex };
    }

    // BB-BR-009: Inquire LOT details & interlocks
    isLoading.value = true;
    try {
      const lotInfo = await backupBayService.fetchLotInfo(normalizedLot);

      // BB-BR-010: Interlock RUN check
      if (lotInfo.lotProcessState === 'RUN') {
        rows.value[rowIndex].lotId = '';
        showAlert(
          'Error',
          `LOT (${normalizedLot}) has been moved in and\nthe BACKUP BAY cannot be changed.`,
        );
        return { success: false, focusIndex: rowIndex };
      }

      // BB-BR-011: Interlock OnHold check
      if (lotInfo.lotHoldState === 'OnHold') {
        rows.value[rowIndex].lotId = '';
        showAlert(
          'Error',
          `LOT (${normalizedLot}) is on HOLD and\nthe BACKUP BAY cannot be changed.`,
        );
        return { success: false, focusIndex: rowIndex };
      }

      // BB-BR-012: Interlock R       ccheck
      if (lotInfo.lotState !== 'Released') {
        rows.value[rowIndex].lotId = '';
        showAlert(
          'Error',
          `If LOT (${normalizedLot}) is not in R       cstate,\nthe BACKUP BAY cannot be changed.`,
        );
        return { success: false, focusIndex: rowIndex };
      }

      // BB-BR-013: Fill row details and advance focus to next row
      rows.value[rowIndex].lotId = normalizedLot;
      rows.value[rowIndex].jobCode = lotInfo.jobCode;
      rows.value[rowIndex].quantity = lotInfo.productQuantity;
      rows.value[rowIndex].processName = lotInfo.operationDescription;
      rows.value[rowIndex].isValid = true;

      const nextFocus = Math.min(rowIndex + 1, 6);
      return { success: true, focusIndex: nextFocus };
    } catch {
      rows.value[rowIndex].lotId = '';
      showAlert('Error', `Fail  cto retrieve details for LOT (${normalizedLot}).`);
      return { success: false, focusIndex: rowIndex };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Execute batch update (BB-BR-014 & BB-BR-015)
   */
  async function executeRun(): Promise<{ success: boolean; count?: number }> {
    // Check if at least 1 LOT is entered
    const hasAnyLot = rows.value.some((r) => r.lotId.trim().length > 0);
    if (!hasAnyLot) {
      showAlert('Error', 'No information has been entered.');
      return { success: false };
    }

    // Check that every row with a LOT has a BAY selected
    for (let i = 0; i < rows.value.length; i++) {
      const row = rows.value[i];
      if (row.lotId.trim().length > 0 && !row.selectedBay) {
        showAlert('Error', `The ${ORDINALS[i]} LOT has no BAY assigned.`);
        return { success: false };
      }
    }

    isExecuting.value = true;
    try {
      const records = rows.value
        .filter((r) => r.lotId.trim().length > 0 && r.selectedBay)
        .map((r) => ({
          lotId: r.lotId.trim(),
          bay: r.selectedBay,
          operatorId: webviewBridge.getOperatorId(),
        }));

      const result = await backupBayService.executeInFactory(records);

      showAlert('Complete', `${result.successCount} LOTs were completed.`, 'success');
      clearAll();

      return { success: true, count: result.successCount };
    } catch {
      showAlert('Error', 'Transaction fail  con server.');
      return { success: false };
    } finally {
      isExecuting.value = false;
    }
  }

  /**
   * Clears LOT inputs and info for all 7 rows
   */
  function clearAll() {
    rows.value.forEach((row) => {
      row.lotId = '';
      row.jobCode = '';
      row.quantity = '';
      row.processName = '';
      row.isValid = false;
    });
  }

  return {
    floorList,
    rows,
    isLoading,
    isExecuting,
    allowDirectInput,
    alertState,
    showAlert,
    closeAlert,
    initDialog,
    setFloor,
    setBay,
    clearRowInfo,
    checkDuplicateLot,
    processLotInput,
    executeRun,
    clearAll,
  };
});
