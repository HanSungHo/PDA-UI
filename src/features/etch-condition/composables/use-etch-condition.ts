import { COMMON_FIELD } from 'src/constants/common-strings';
import { barcodeStyleLotId } from 'src/utils/barcode-style';
import { computed, ref } from 'vue';

import { fetchEtchCondition } from '../services/etch-condition.service';
import type {
  EtchConditionDialog,
  EtchConditionGridKind,
  EtchConditionResult,
  EtchConditionRow,
} from '../types/etch-condition.types';

// ETCHActivity spinner items after its leading blank entry, which is the default selection.
export const ETCH_MACHINES = [
  '4E03-21',
  '4E03-22',
  '4E03-23',
  '4E03-24',
  '5E03-21',
  '5E03-22',
  '5E03-23',
  '5E03-24',
  '5E03-25',
] as const;

const PROGRESS_TIME_COLUMN = '진행 TIME';

interface Context {
  /** Focuses the LOT field; `select` mirrors editLotNo.selectAll(). */
  focusLot: (select: boolean) => void;
}

function gridKindOf(processType: string): EtchConditionGridKind {
  if (processType === 'eMAX CT' || processType === 'DPS POLY') return 'chamber';
  if (processType === 'TE8500') return 'te8500';
  return 'none';
}

/** Android shows ResponseDataToJsonUtil.getErrorMessage (ERRMSG, or the exception message) as is. */
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useEtchCondition(context: Context) {
  const lotNo = ref('');
  const machine = ref('');
  const operRecipe = ref('');
  const comment = ref('');
  const gridKind = ref<EtchConditionGridKind>('none');
  const rows = ref<EtchConditionRow[]>([]);
  const loading = ref(false);
  const dialogs = ref<EtchConditionDialog[]>([]);
  const activeDialog = computed(() => dialogs.value[0]);
  // Android selects the LOT text after an error; a dialog defers that until it closes.
  let selectLotOnClose = false;

  function show(title: string, message: string): void {
    dialogs.value.push({ title, message });
  }

  function closeDialog(): void {
    dialogs.value.shift();
    if (dialogs.value.length > 0) return;
    context.focusLot(selectLotOnClose);
    selectLotOnClose = false;
  }

  /** ETCHActivity.clearInfo */
  function clearInfo(): void {
    rows.value = [];
    gridKind.value = 'none';
    operRecipe.value = '';
    comment.value = '';
  }

  function updateLot(value: string): void {
    // editLotNo uses InputFilter.AllCaps.
    lotNo.value = value.toUpperCase();
  }

  function showResult(result: EtchConditionResult): void {
    if (result.hmEen) show('EEN', result.hmEen);
    operRecipe.value = result.operDesc;

    if (!result.comm2nd) {
      if (result.para2nd) comment.value = `${result.para2nd} : ${result.value2nd} 추가 반영`;
    } else {
      comment.value = result.comm2nd;
    }

    if (result.rows.length < 1) return;
    const kind = gridKindOf(result.processType);
    if (kind === 'none') return;
    gridKind.value = kind;
    rows.value = result.rows;

    if (kind !== 'te8500') return;
    const progressTime = result.rows.find((row) => row.COL === PROGRESS_TIME_COLUMN);
    if (!progressTime) return;
    comment.value = `진행 TIME [ ${progressTime.VALUE ?? ''} 초 ]`;
    if (dialogs.value.length > 0) selectLotOnClose = true;
    else context.focusLot(true);
  }

  /** ETCHActivity.getLotInfo, run by the search button and by a valid scan. */
  async function search(): Promise<void> {
    // MessageSender.send shows a modal LoadingBar, so Android takes no second search meanwhile.
    if (loading.value) return;
    clearInfo();

    if (!lotNo.value) {
      show('ERROR', 'LOT을 입력하여 주세요.');
      return;
    }

    loading.value = true;
    let result: EtchConditionResult;
    try {
      result = await fetchEtchCondition(lotNo.value, machine.value);
    } catch (error) {
      selectLotOnClose = true;
      show(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorText(error));
      return;
    } finally {
      loading.value = false;
    }
    showResult(result);
  }

  /** The editor action: parse the scanner barcode, then search only when it holds a LOT. */
  async function scanLot(): Promise<void> {
    if (loading.value) return;
    clearInfo();
    const { isValid, parsedId } = barcodeStyleLotId(lotNo.value);
    lotNo.value = parsedId;
    if (isValid) await search();
  }

  return {
    lotNo,
    machine,
    operRecipe,
    comment,
    gridKind,
    rows,
    loading,
    activeDialog,
    closeDialog,
    updateLot,
    search,
    scanLot,
  };
}
