import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { DeviceInfo } from '~/constants/deviceinfo';
import { barcodeStyleLotId } from '~/utils/barcode-style';

import * as splitService from '../services/split.service';
import {
  DIALOG_TITLE_ERROR,
  MAX_SPLIT_COUNT,
  SPLIT_MESSAGES,
  type SplitChildRow,
  type WaferSelectPayload,
} from '../types/split.types';

// ==================================================================================
// Pure helpers ported 1:1 from SplitActivity.kt's private methods / BarcodeStyle.kt.
// Kept as plain (non-exported) functions in this same file so the whole screen's
// logic lives in one place, mirroring the original single-class Activity.
// ==================================================================================

/** Child LOT name suffix. Kotlin: addGridRow -> case "LOT NO" */
function buildChildLotSuffix(
  childLotSeq: number,
  isEtch: boolean,
): { suffix: string; overflow: boolean } {
  if (isEtch) {
    if (childLotSeq === 0) return { suffix: 'SE1', overflow: false };
    if (childLotSeq === 99) return { suffix: '', overflow: true };
    return { suffix: `SE${childLotSeq + 1}`, overflow: false };
  }

  if (childLotSeq > 8) {
    // N9 -> NA forced; from there: 'N' + char(65 + seq - 9) (10 -> NB, 11 -> NC, ...)
    if (childLotSeq === 9) return { suffix: 'NA', overflow: false };
    return { suffix: `N${String.fromCharCode(65 + (childLotSeq - 9))}`, overflow: false };
  }
  return { suffix: `N${childLotSeq + 1}`, overflow: false };
}

/** Prefix: if the parent LOT is longer than 7 chars, take the first 7 chars */
function buildChildLotPrefix(parentLotNo: string): string {
  return parentLotNo.length > 7 ? parentLotNo.substring(0, 7) : parentLotNo;
}

/**
 * executeSplit - PASS 1: trim + uppercase (written back into the row), empty check,
 * duplicate check against the IMMEDIATELY PRECEDING row only.
 * Legacy only compares against the previous row => kept as-is.
 * This function has a side effect (writes back), matching the Android build, and stops
 * at the first error.
 */
function normalizeAndCheckLotNos(rows: SplitChildRow[]): string | null {
  let beforeLotNo = '';
  for (const row of rows) {
    const childLotNo = row.lotNo.trim();
    row.lotNo = childLotNo.toUpperCase();

    if (childLotNo.length === 0) return SPLIT_MESSAGES.childLotRequired;

    if (childLotNo.toUpperCase() === beforeLotNo) return SPLIT_MESSAGES.duplicatedLotNo;
    beforeLotNo = childLotNo.toUpperCase();
  }
  return null;
}

/** executeSplit - PASS 2: validate each row. Returns the first error message or null */
function validateChildRows(params: {
  rows: SplitChildRow[];
  parentLotNo: string;
  rootLotName: string;
}): string | null {
  const { rows, parentLotNo, rootLotName } = params;

  for (const row of rows) {
    const lotNo = row.lotNo;

    if (row.wafers.length === 0) return SPLIT_MESSAGES.waferRequired;
    if (lotNo === parentLotNo) return SPLIT_MESSAGES.sameAsParent;

    // Lot Naming Rule (requested by the planning team, effective 2008/01/01)
    if (lotNo.includes(' ')) return SPLIT_MESSAGES.lotNameHasSpace;

    if (rootLotName.length === 7) {
      if (lotNo.includes('-')) return SPLIT_MESSAGES.lotNameHasHyphen;
      if (lotNo.length !== 9) return SPLIT_MESSAGES.lotNameLength9;

      for (let i = 0; i < lotNo.length; i++) {
        const ch = lotNo.charAt(i);
        const code = lotNo.charCodeAt(i);
        if (i === 7) {
          // legacy: 64..91 (looser than A-Z = 65..90) -> kept as-is
          if (code < 64 || code > 91) return SPLIT_MESSAGES.lotName8thMustBeLetter(ch);
        } else {
          // legacy: 65..91 or 47..58 (looser than A-Z / 0-9) -> kept as-is
          const isLetter = code >= 65 && code <= 91;
          const isDigit = code >= 47 && code <= 58;
          if (!isLetter && !isDigit) return SPLIT_MESSAGES.lotNameInvalidChar(ch);
        }
      }
    } else if (!lotNo.includes('-') && lotNo.length === 7) {
      return SPLIT_MESSAGES.oldLotNameRule;
    }
  }
  return null;
}

/** Total child-LOT wafer count must not exceed the parent LOT quantity (less is fine) */
function validateTotalQty(rows: SplitChildRow[], originalQty: number): string | null {
  const total = rows.reduce((sum, r) => sum + r.wafers.length, 0);
  return total > originalQty ? SPLIT_MESSAGES.overParentQty : null;
}

// ==================================================================================
// useSplitPage — replaces SplitActivity.kt as a single composable: state, business
// rules, dialogs, and navigation all live here, mirroring the original single class.
// ==================================================================================
export function useSplitPage() {
  const route = useRoute();
  const router = useRouter();

  // TODO: replace with the real source of DeviceInfo.FACILITY / DeviceInfo.OPERATOR_ID (auth store, runtime config...)
  const deviceInfo = DeviceInfo;

  // ------------------------------------------------------------------ state
  // (maps to SplitActivity's views + member fields)
  const lotNo = ref(''); // edit_lot_no
  const product = ref(''); // txt_product_name
  const originalQty = ref<number | null>(null); // txt_original_qty
  const currentOperation = ref(''); // txt_current_operation
  const comment = ref(''); // edit_comment
  const isEtch = ref(false); // chk_etch
  // spinner_child_count: Android's Spinner always defaults to position 0 (value 1), even while
  // disabled, so childCount starts at 1 (not unset) to match that default selection 1:1.
  const childCount = ref<number | undefined>(1);

  const rows = ref<SplitChildRow[]>([]); // mainbody grid
  const selectedRowId = ref<number | null>(null); // currentSelectedRow

  const enableWafer = ref<string[]>([]);
  const searchRootLotName = ref('');
  const searchOperation = ref('');
  const searchSubOperation = ref('');
  const childLotSeq = ref(0); // childlotseq

  // control enabled state
  const canChangeCount = ref(false); // spinner
  const canSplit = ref(false); // btn_split
  const canOk = ref(false); // btn_ok
  const canWafer = ref(false); // btn_wafer

  let rowSeq = 0;

  const childCountOptions = Array.from({ length: MAX_SPLIT_COUNT }, (_, i) => ({
    label: String(i + 1),
    value: i + 1,
  }));

  /** AllCaps filter on edit_lot_no */
  const lotNoModel = computed({
    get: () => lotNo.value,
    set: (v: string) => {
      lotNo.value = v.toUpperCase();
    },
  });

  // ---------------------------------------------------------------- getters
  const selectedRow = computed(() => rows.value.find((r) => r.id === selectedRowId.value) ?? null);

  /** changeRemainQty(): remaining = original - total wafers assigned */
  const remainQty = computed(() => {
    const assigned = rows.value.reduce((sum, r) => sum + r.wafers.length, 0);
    return (originalQty.value ?? 0) - assigned;
  });

  const originalQtyText = computed(() =>
    originalQty.value === null ? '' : String(originalQty.value),
  );
  const remainQtyText = computed(() => (originalQty.value === null ? '' : String(remainQty.value)));

  // ------------------------------------------------------------------ refs
  /** wraps the parent LOT's BaseInputField, used to focus + selectAll */
  const lotInputWrapper = ref<HTMLElement | null>(null);

  const waferDialogOpen = ref(false);
  const waferDialogPayload = ref<WaferSelectPayload | null>(null);

  /** OnSingleClickListener: blocks repeated taps while an action is in flight */
  const busy = ref(false);

  // ---------------------------------------------- error dialog (OkDialog.show)
  const errorOpen = ref(false);
  const errorTitle = ref<string>(DIALOG_TITLE_ERROR);
  const errorMessage = ref('');
  let errorResolver: (() => void) | null = null;

  /** Shows the OK-only BaseModal; Promise resolves when OK is tapped (mirrors OkDialog.show) */
  function showError(message: string, title: string = DIALOG_TITLE_ERROR): Promise<void> {
    errorTitle.value = title;
    errorMessage.value = message;
    errorOpen.value = true;
    return new Promise((resolve) => {
      errorResolver = resolve;
    });
  }

  function closeError(): void {
    errorOpen.value = false;
    errorResolver?.();
    errorResolver = null;
  }

  // --------------------------------------------------------------- helpers
  async function guard(fn: () => Promise<void> | void): Promise<void> {
    if (busy.value) return;
    busy.value = true;
    try {
      await fn();
    } finally {
      busy.value = false;
    }
  }

  function focusLotInput(): void {
    const el = lotInputWrapper.value?.querySelector('input');
    el?.focus();
    el?.select();
  }

  function hideKeyboard(): void {
    (document.activeElement as HTMLElement | null)?.blur();
  }

  async function showWarnings(warnings: string[]): Promise<void> {
    for (const w of warnings) await showError(w);
  }

  // ---------------------------------------------------------------- actions
  /** clearInfo() — does NOT reset lotNo or isEtch (matches legacy) */
  function clearInfo(): void {
    product.value = '';
    originalQty.value = null;
    currentOperation.value = '';
    comment.value = '';

    rows.value = [];
    selectedRowId.value = null;

    childCount.value = 1; // spinnerChildCount.setSelection(0, false) -> always back to value 1
    canChangeCount.value = false;
    canSplit.value = false;
    canOk.value = false;
    canWafer.value = false;

    enableWafer.value = [];
    searchRootLotName.value = '';
    searchOperation.value = '';
    searchSubOperation.value = '';
    childLotSeq.value = 0;
  }

  /** Full reset (used when entering/leaving the screen) */
  function resetAll(): void {
    clearInfo();
    lotNo.value = '';
    isEtch.value = false;
  }

  /** setLotInfo() */
  async function searchLot(): Promise<void> {
    hideKeyboard();
    clearInfo();

    const lotId = lotNo.value;
    const res = await splitService.fetchLotInfo(lotId, deviceInfo.FACILITY);
    if (!res.ok) {
      await showError(res.message);
      focusLotInput();
      return;
    }

    const info = res.data;
    searchRootLotName.value = info.rootLotName;
    searchOperation.value = info.operation;
    searchSubOperation.value = info.subOperation;
    enableWafer.value = info.waferList;
    childLotSeq.value = info.childLotSequence;

    // displayed BEFORE the rule checks (matches legacy: a blocked LOT still shows its info)
    product.value = info.product;
    originalQty.value = info.quantity;
    currentOperation.value = `${info.processStep}(${info.operation}${info.subOperation})`;

    // if (status == "RUN") ... commented out in the Android build -> skipped here too

    if (info.state !== 'WIP') {
      await showError(SPLIT_MESSAGES.notWip(info.state));
      return;
    }
    if (info.holdStatus === 'ONHOLD') {
      await showError(SPLIT_MESSAGES.onHold);
      return;
    }
    if (info.batchId.length > 0) {
      await showError(SPLIT_MESSAGES.inBatch);
      return;
    }
    if (info.sampleFlag === 'S') {
      await showError(SPLIT_MESSAGES.sampleLot(lotId));
      return;
    }

    canChangeCount.value = true;
    canSplit.value = true;
    canOk.value = true;
  }

  /**
   * Enter on the LOT field. Merges both Android branches (IME_ACTION_DONE + scanner ENTER key)
   * since they run identical logic. A keyboard-wedge scanner also fires a keyup Enter.
   *
   * Both branches call BarcodeStyle(this).lotId(editLotId), which only accepts text wrapped
   * in the scanner's envelope (leading space + trailing terminator char). A manually typed
   * value without that envelope is rejected and the screen is cleared, matching legacy 1:1.
   */
  function onLotSubmit(): Promise<void> {
    return guard(async () => {
      const { isValid, parsedId } = barcodeStyleLotId(lotNo.value);
      lotNo.value = parsedId; // editLotId.setText(returnLotId)

      if (!isValid) {
        clearInfo();
        return;
      }
      await searchLot();
    });
  }

  /** addGridRow(count) — returns any warnings (Sequence > 99 dialog) */
  function addRows(count: number): string[] {
    const warnings: string[] = [];

    for (let i = 0; i < count; i++) {
      const { suffix, overflow } = buildChildLotSuffix(childLotSeq.value, isEtch.value);
      if (overflow) warnings.push(SPLIT_MESSAGES.childSeqOverflow);

      rows.value.push({
        id: ++rowSeq,
        lotNo: buildChildLotPrefix(lotNo.value) + suffix,
        wafers: [],
        product: product.value,
      });
      childLotSeq.value += 1;
    }
    return warnings;
  }

  /** removeGridRow(count) — wafers from removed rows return to the parent LOT automatically (remainQty is computed) */
  function removeRows(count: number): void {
    rows.value.splice(rows.value.length - count, count);
    childLotSeq.value -= count;
  }

  /** setSplitGrid() — SPLIT button handler */
  function onSplitClick(): Promise<void> {
    return guard(async () => {
      const count = childCount.value;

      if (count === undefined) {
        await showError(SPLIT_MESSAGES.childCountRequired);
        return;
      }
      if (count < 1) {
        await showError(SPLIT_MESSAGES.childCountTooSmall);
        return;
      }
      if (count > MAX_SPLIT_COUNT) {
        await showError(SPLIT_MESSAGES.childCountTooLarge);
        return;
      }

      const warnings = rows.value.length < count ? addRows(count - rows.value.length) : [];
      if (rows.value.length > count) removeRows(rows.value.length - count);

      selectedRowId.value = rows.value[0]?.id ?? null;
      canWafer.value = rows.value.length > 0;
      await showWarnings(warnings);
    });
  }

  function selectRow(rowId: number): void {
    selectedRowId.value = rowId;
  }

  /** executeWaferSelect() — prepares the extras for the wafer selection screen */
  async function openWaferSelect(): Promise<void> {
    const row = selectedRow.value;
    if (!row) {
      await showError(SPLIT_MESSAGES.selectRowForWafer);
      return;
    }

    const disableWaferList = rows.value.filter((r) => r.id !== row.id).flatMap((r) => r.wafers);

    waferDialogPayload.value = {
      lotId: lotNo.value,
      fixedCount: remainQty.value + row.wafers.length,
      existWaferList: [...enableWafer.value],
      disableWaferList,
      selectWaferList: [...row.wafers],
    };
    waferDialogOpen.value = true;
  }

  function onWaferClick(): Promise<void> {
    return guard(openWaferSelect);
  }

  /** Double-tap on the WAFER cell: select the row first, then open the dialog */
  function onRowDoubleClick(rowId: number): Promise<void> {
    selectRow(rowId);
    return guard(openWaferSelect);
  }

  /** RESULT_OK from WaferSelect: updates WAFER + N + remaining (remainQty is computed) */
  function onWaferConfirm(wafers: string[]): void {
    const row = selectedRow.value;
    if (row) row.wafers = [...wafers];
    waferDialogOpen.value = false;
  }

  /** cancelled without confirming: nothing changes */
  function onWaferCancel(): void {
    waferDialogOpen.value = false;
  }

  /** checkCustomerLot() — customer = '' when the LOT doesn't belong to a customer */
  async function checkCustomer(): Promise<
    { ok: true; customer: string } | { ok: false; message: string }
  > {
    const res = await splitService.fetchCustomer(product.value);
    if (!res.ok) return { ok: false, message: res.message };
    return { ok: true, customer: res.data };
  }

  // ------------------------------------------------------------- 확인 button
  /** executeSplit() — validation steps A..D, stops at the first error */
  function onOkClick(): Promise<void> {
    return guard(async () => {
      if (rows.value.length <= 0) {
        await showError(SPLIT_MESSAGES.childLotRequired);
        return;
      }

      const lotNoError = normalizeAndCheckLotNos(rows.value);
      if (lotNoError) {
        await showError(lotNoError);
        return;
      }

      const rowError = validateChildRows({
        rows: rows.value,
        parentLotNo: lotNo.value,
        rootLotName: searchRootLotName.value,
      });
      if (rowError) {
        await showError(rowError);
        return;
      }

      const qtyError = validateTotalQty(rows.value, originalQty.value ?? 0);
      if (qtyError) {
        await showError(qtyError);
        return;
      }

      // checkCustomerLot()
      const customer = await checkCustomer();
      if (!customer.ok) {
        await showError(customer.message);
        focusLotInput();
        // legacy: a failed CALLCUSTOMER leaves check = false -> still proceeds
      } else if (customer.customer.length > 0) {
        await showError(SPLIT_MESSAGES.customerLot(customer.customer));
        return;
      }

      const res = await splitService.submitSplit({
        lotId: lotNo.value,
        facility: deviceInfo.FACILITY,
        qty: remainQty.value,
        operation: searchOperation.value,
        subOperation: searchSubOperation.value,
        product: product.value,
        operatorId: deviceInfo.OPERATOR_ID,
        items: rows.value.map((r) => ({
          splitLotId: r.lotNo,
          splitQty: r.wafers.length,
          splitProd: r.product,
          waferId: r.wafers.join(','),
        })),
        comment: comment.value,
      });

      if (res.ok) {
        router.back(); // finish()
        return;
      }
      await showError(res.message);
      focusLotInput();
    });
  }

  // ---------------------------------------------------------------- 취소 button
  function onCancel(): void {
    router.back(); // finish(), no confirmation prompt
  }

  // -------------------------------------------------------------- lifecycle
  onMounted(async () => {
    resetAll();

    // Intent extra "LOTID": pre-fill and search immediately, WITHOUT BarcodeStyle (matches legacy)
    const lotIdQuery = route.query.lotId;
    const lotId = Array.isArray(lotIdQuery) ? lotIdQuery[0] : lotIdQuery;
    if (lotId) {
      lotNo.value = lotId.toUpperCase();
      await guard(searchLot);
    }
  });

  onBeforeUnmount(() => resetAll());

  return {
    // state (for the template's `store.xxx` bindings)
    lotNo,
    product,
    originalQty,
    currentOperation,
    comment,
    isEtch,
    childCount,
    rows,
    selectedRowId,
    canChangeCount,
    canSplit,
    canOk,
    canWafer,
    selectedRow,
    originalQtyText,
    remainQtyText,
    // ui state
    busy,
    lotInputWrapper,
    lotNoModel,
    childCountOptions,
    errorOpen,
    errorTitle,
    errorMessage,
    waferDialogOpen,
    waferDialogPayload,
    // actions
    closeError,
    selectRow,
    onLotSubmit,
    onSplitClick,
    onWaferClick,
    onRowDoubleClick,
    onWaferConfirm,
    onWaferCancel,
    onOkClick,
    onCancel,
  };
}
