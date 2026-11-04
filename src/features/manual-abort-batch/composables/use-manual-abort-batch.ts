import { COMMON_FIELD } from 'src/constants/common-strings';
import { DeviceInfo } from 'src/constants/device-info';
import { barcodeStyleEqpId, barcodeStyleLotId } from 'src/utils/barcode-style';
import { computed, ref } from 'vue';

import { fetchRemanualLot, saveRemanual } from '../services/manual-abort-batch.service';
import type {
  ManualAbortBatchDialog,
  ManualAbortBatchField,
  ManualAbortBatchRow,
} from '../types/manual-abort-batch.types';

interface Context {
  focus: (field: ManualAbortBatchField) => void;
  /** setResult(RESULT_OK) + finish() after a successful save. */
  close: () => void;
}

/** Android shows ResponseDataToJsonUtil.getErrorMessage (ERRMSG, or the exception message) as is. */
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useManualAbortBatch(context: Context) {
  const lotId = ref('');
  const eqpId = ref('');
  const recipe = ref('');
  const rows = ref<ManualAbortBatchRow[]>([]);
  // btnReManul starts disabled and is enabled by the first LOT lookup that succeeds.
  const canSave = ref(false);
  const loading = ref(false);
  const dialogs = ref<ManualAbortBatchDialog[]>([]);
  const activeDialog = computed(() => dialogs.value[0]);
  // Android focuses the empty field behind the dialog; the modal holds focus, so wait for it.
  let focusOnClose: ManualAbortBatchField | undefined;

  function show(message: string): void {
    dialogs.value.push({ title: COMMON_FIELD.TXTDIALOGTITLE_ERROR, message });
  }

  function closeDialog(): void {
    dialogs.value.shift();
    if (dialogs.value.length > 0 || !focusOnClose) return;
    context.focus(focusOnClose);
    focusOnClose = undefined;
  }

  // txt_lot, txt_eqp and txt_recipe use InputFilter.AllCaps.
  function updateLot(value: string): void {
    lotId.value = value.toUpperCase();
  }

  function updateEqp(value: string): void {
    eqpId.value = value.toUpperCase();
  }

  function updateRecipe(value: string): void {
    recipe.value = value.toUpperCase();
  }

  /** ManualAbortBatchActivity.getBatchLOTInfo */
  async function loadLot(lot: string): Promise<void> {
    if (!lot) return;
    rows.value = [];
    loading.value = true;
    try {
      rows.value = await fetchRemanualLot(lot);
      // Android enables btn_reManual and focuses txt_eqp only when the lookup succeeds.
      canSave.value = true;
      context.focus('eqp');
    } catch (error) {
      show(errorText(error));
    } finally {
      loading.value = false;
    }
  }

  /** txt_lot editor action: a valid LOT barcode runs getBatchLOTInfo. */
  async function scanLot(): Promise<void> {
    // MessageSender.send shows a modal LoadingBar, so Android takes no input meanwhile.
    if (loading.value) return;
    const { isValid, parsedId } = barcodeStyleLotId(lotId.value);
    lotId.value = parsedId;
    if (isValid) await loadLot(parsedId);
  }

  /** txt_eqp editor action: a valid equipment barcode moves on to RECIPE. */
  function scanEqp(): void {
    if (loading.value) return;
    const { isValid, parsedId } = barcodeStyleEqpId(eqpId.value);
    eqpId.value = parsedId;
    if (isValid) context.focus('recipe');
  }

  function requireValue(value: string, message: string, field: ManualAbortBatchField): boolean {
    if (value) return true;
    focusOnClose = field;
    show(message);
    return false;
  }

  /** ManualAbortBatchActivity.rebatchManualSave */
  async function save(): Promise<void> {
    if (loading.value || !canSave.value) return;
    if (!requireValue(lotId.value, 'LOT을 입력하세요.', 'lot')) return;
    if (!requireValue(eqpId.value, '장비를 입력하세요.', 'eqp')) return;
    if (!requireValue(recipe.value, 'Recipe를 입력하세요.', 'recipe')) return;

    loading.value = true;
    try {
      await saveRemanual({
        lotId: lotId.value,
        eqpId: eqpId.value,
        rcpId: recipe.value,
        userId: DeviceInfo.OPERATOR_ID,
      });
    } catch (error) {
      show(errorText(error));
      return;
    } finally {
      loading.value = false;
    }
    context.close();
  }

  return {
    lotId,
    eqpId,
    recipe,
    rows,
    canSave,
    loading,
    activeDialog,
    closeDialog,
    updateLot,
    updateEqp,
    updateRecipe,
    scanLot,
    scanEqp,
    save,
  };
}
