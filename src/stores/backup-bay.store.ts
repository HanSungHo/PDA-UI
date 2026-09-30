import { defineStore } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { backupBayService, parseLegacyBarcodeLot } from 'src/services/backup-bay.service';
import type { AlertState, BackupBayRowItem } from 'src/types/backup-bay.types';
import { ref } from 'vue';

/** Legacy HiFOS ordinals for BAY-not-assigned alerts (BackupBayDialogActivity.kt). */
const ORDINALS = ['첫번째', '두번째', '세번째', '네번째', '다섯번째', '여섯번째', '일곱번째'];

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
      showAlert('동일 LotId 확인', '동일한 LotId가 존재합니다.');
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
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'LOT NO를 입력하세요');
      return { success: false, focusIndex: rowIndex };
    }

    let parsedLot = '';

    // Check barcode styling (BB-BR-007)
    if (rawInput.startsWith(' ')) {
      const parseResult = parseLegacyBarcodeLot(rawInput);
      if (!parseResult.isValid) {
        rows.value[rowIndex].lotId = '';
        showAlert('READING ERROR', parseResult.error || 'LOT#를 읽어주세요.');
        return { success: false, focusIndex: rowIndex };
      }
      parsedLot = parseResult.lotId;
    } else if (allowDirectInput.value) {
      // In dev mode with direct input enabled, allow raw lot ID
      parsedLot = rawInput.trim();
    } else {
      // Strict legacy behavior: requires leading space
      rows.value[rowIndex].lotId = '';
      showAlert('READING ERROR', 'LOT#를 읽어주세요.');
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
          COMMON_FIELD.TXTDIALOGTITLE_ERROR,
          `Move In 된 Lot(${normalizedLot})은\nBACKUP BAY를 변경할수 없습니다.`,
        );
        return { success: false, focusIndex: rowIndex };
      }

      // BB-BR-011: Interlock OnHold check
      if (lotInfo.lotHoldState === 'OnHold') {
        rows.value[rowIndex].lotId = '';
        showAlert(
          COMMON_FIELD.TXTDIALOGTITLE_ERROR,
          `Hold 된 Lot(${normalizedLot})은\nBACKUP BAY를 변경할수 없습니다.`,
        );
        return { success: false, focusIndex: rowIndex };
      }

      // BB-BR-012: Interlock Released check
      if (lotInfo.lotState !== 'Released') {
        rows.value[rowIndex].lotId = '';
        showAlert(
          COMMON_FIELD.TXTDIALOGTITLE_ERROR,
          `Lot(${normalizedLot})이 Released 상태가 아니면\nBACKUP BAY를 변경할수 없습니다.`,
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
    } catch (err: unknown) {
      rows.value[rowIndex].lotId = '';
      const errorMsg = err instanceof Error ? err.message : '';
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorMsg);
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
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '입력된 정보가 없습니다.');
      return { success: false };
    }

    // Check that every row with a LOT has a BAY selected
    for (let i = 0; i < rows.value.length; i++) {
      const row = rows.value[i];
      if (row.lotId.trim().length > 0 && !row.selectedBay) {
        showAlert(
          COMMON_FIELD.TXTDIALOGTITLE_ERROR,
          `${ORDINALS[i]} LOT의 BAY가 지정되지 않았습니다.`,
        );
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
          operatorId: 'SYSTEM',
        }));

      const result = await backupBayService.executeInFactory(records);

      showAlert('완료', `${result.successCount} 개의 LOT이 완료 되었습니다`, 'success');
      clearAll();

      return { success: true, count: result.successCount };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '';
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorMsg);
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
