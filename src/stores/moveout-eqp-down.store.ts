import { defineStore } from 'pinia';
import { moveOutEqpDownService } from 'src/services/moveout-eqp-down.service';
import type {
  ChamberItem,
  MoveOutEqpDownAlertState,
  RawChamberInput,
} from 'src/types/moveout-eqp-down.types';
import { computed, ref } from 'vue';

export interface SubmitDownResult {
  success: boolean;
  validationError?: boolean;
  mainDown?: boolean;
  downChambers?: string[];
  message?: string;
}

export const useMoveOutEqpDownStore = defineStore('moveOutEqpDown', () => {
  const machineName = ref<string>('');
  const isMainChecked = ref<boolean>(true);
  const chambers = ref<ChamberItem[]>([]);
  const isSelectAll = ref<boolean>(true);
  const isSubmitting = ref<boolean>(false);

  const alertState = ref<MoveOutEqpDownAlertState>({
    open: false,
    title: '',
    message: '',
    type: 'info',
  });

  const hasChambers = computed(() => chambers.value.length > 0);
  const enabledChambers = computed(() => chambers.value.filter((c) => c.enabled));
  const selectedChambers = computed(() => chambers.value.filter((c) => c.enabled && c.checked));
  const isValidSelection = computed(() => isMainChecked.value || selectedChambers.value.length > 0);

  function areAllEnabledChecked(): boolean {
    if (!isMainChecked.value) return false;
    for (const ch of chambers.value) {
      if (ch.enabled && !ch.checked) return false;
    }
    return true;
  }

  function showAlert(
    title: string,
    message: string,
    type: 'warning' | 'error' | 'info' = 'warning',
  ) {
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

  function init(machine: string, rawChambers: RawChamberInput[] = []) {
    machineName.value = machine;
    isMainChecked.value = true;

    chambers.value = (rawChambers || []).map((raw) => ({
      name: raw.CH,
      mesState: raw.MESSTATE,
      enabled: raw.MESSTATE === 'RUN',
      checked: raw.MESSTATE === 'RUN',
    }));

    isSelectAll.value = true;
    closeAlert();
  }

  function toggleSelectAll(checked: boolean) {
    isSelectAll.value = checked;

    if (checked) {
      isMainChecked.value = true;
      chambers.value.forEach((c) => {
        if (c.enabled) c.checked = true;
      });
    } else {
      isMainChecked.value = false;
      chambers.value.forEach((c) => {
        if (c.enabled) c.checked = false;
      });
    }
  }

  function toggleMain(checked: boolean) {
    isMainChecked.value = checked;
    if (!checked) {
      isSelectAll.value = false;
    } else if (areAllEnabledChecked()) {
      isSelectAll.value = true;
    }
  }

  function toggleChamber(index: number, checked: boolean) {
    const target = chambers.value[index];
    if (target && target.enabled) {
      target.checked = checked;
      if (!checked) {
        isSelectAll.value = false;
      } else if (areAllEnabledChecked()) {
        isSelectAll.value = true;
      }
    }
  }

  async function submitDown(context?: {
    facility?: string;
    operatorId?: string;
    operatorName?: string;
  }): Promise<SubmitDownResult> {
    const mainFlag = isMainChecked.value ? 'Y' : 'N';
    const downChambers = selectedChambers.value.map((c) => c.name);
    const chamberFlag = downChambers.length > 0;

    if (!chamberFlag && mainFlag === 'N') {
      showAlert('Warning', 'Select at least one equipment unit or chamber.', 'warning');
      return { success: false, validationError: true };
    }

    isSubmitting.value = true;

    try {
      const result = await moveOutEqpDownService.changeEqpStatus({
        machine: machineName.value,
        facility: context?.facility || 'FAB1',
        chamberList: downChambers,
        mainFlag,
        operatorId: context?.operatorId,
        operatorName: context?.operatorName,
      });

      if (!result.success) {
        showAlert('Error', result.errorDesc || 'Failed to change equipment status.', 'error');
        return {
          success: false,
          validationError: false,
          message: result.errorDesc,
        };
      }

      return {
        success: true,
        validationError: false,
        mainDown: mainFlag === 'Y',
        downChambers,
        message: result.message,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown network error';
      showAlert('Error', errorMsg, 'error');
      return {
        success: false,
        validationError: false,
        message: errorMsg,
      };
    } finally {
      isSubmitting.value = false;
    }
  }

  return {
    machineName,
    isMainChecked,
    chambers,
    isSelectAll,
    isSubmitting,
    alertState,
    hasChambers,
    enabledChambers,
    selectedChambers,
    isValidSelection,
    init,
    toggleSelectAll,
    toggleMain,
    toggleChamber,
    submitDown,
    showAlert,
    closeAlert,
  };
});
