import { defineStore } from 'pinia';
import type { BaseOption } from 'src/components/base/dropdown-list';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { DeviceInfo } from 'src/constants/device-info';
import { useMainStore } from 'src/features/main/stores/main.store';
import { CommonUtil } from 'src/utils/common-util';
import { ref } from 'vue';

import { machineStatusDetailService } from '../services/machine-status-detail.service';
import type {
  EqpDownCodeItem,
  EqpDownCommentItem,
  EqpStatusItem,
  MachineStatusDetailAlertDialog,
  MachineStatusDetailConfirmDialog,
} from '../types/machine-status-detail.types';

/**
 * Normalizes XML-to-JSON list structures (`{ ITEM: [...] }`, `{ ITEM: {...} }`, or `[...]`)
 * into a typed array, mirroring legacy `response.getContentList(jsonObject, COMMON_FIELD.ITEM)`.
 */
export function extractItemList<T>(container: unknown): T[] {
  if (!container) return [];
  if (Array.isArray(container)) return container as T[];
  if (typeof container === 'object') {
    const item = (container as Record<string, unknown>)[COMMON_FIELD.ITEM];
    if (!item) return [];
    if (Array.isArray(item)) return item as T[];
    if (typeof item === 'object') return [item as T];
  }
  return [];
}

interface QueuedDialog {
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  confirmText?: string | undefined;
  cancelText?: string | undefined;
  onConfirm?: (() => void | Promise<void>) | undefined;
  onCancel?: (() => void | Promise<void>) | undefined;
}

export const useMachineStatusDetailStore = defineStore('machine-status-detail', () => {
  const mainStore = useMainStore();

  // Form and display states
  const eqpId = ref<string>('');
  const facility = ref<string>('');
  const mainStatus = ref<string>('');
  const subStatus = ref<string>('');
  const finalWorkTime = ref<string>('');
  const fdcState = ref<string>('');
  const operator = ref<string>('');

  // Editable states (COMMENT, 장비상태, DOWN CODE, Chamber checkbox)
  const comment = ref<string>('');
  const commentOptions = ref<string[]>([]);
  const hasCommentAdapter = ref<boolean>(false);

  const statusOptions = ref<BaseOption[]>([]);
  const selectedEqpState = ref<string>('');

  const downCodeOptions = ref<BaseOption[]>([]);
  const selectedDownCode = ref<string>('');

  const isChamberChecked = ref<boolean>(false);

  // Activity-level internal variables mirroring MachineStatusDetailActivity.kt
  const oriEQPStatus = ref<string>('');
  const oriDownCode = ref<string>('');
  const mainState = ref<string>('');
  const chamberMachine = ref<string>('');
  const first = ref<boolean>(true);

  // UI control states
  const isLoading = ref<boolean>(false);
  const isCompleted = ref<boolean>(false);
  const focusTarget = ref<'eqp' | null>(null);

  // Sequential Dialog Queue handling
  const dialogQueue = ref<QueuedDialog[]>([]);

  const alertDialog = ref<MachineStatusDetailAlertDialog>({
    open: false,
    title: '',
    message: '',
  });

  const confirmDialog = ref<MachineStatusDetailConfirmDialog>({
    open: false,
    title: '',
    message: '',
    confirmText: COMMON_FIELD.BTNYESSTR,
    cancelText: COMMON_FIELD.BTNNOSTR,
  });

  function getEffectiveFacility(): string {
    return mainStore.facility || DeviceInfo.FACILITY;
  }

  function getEffectiveOperatorId(): string {
    if (mainStore.operatorId && mainStore.operatorId !== 'OPERATOR_ID') {
      return mainStore.operatorId;
    }
    return DeviceInfo.OPERATOR_ID;
  }

  function getEffectiveOperatorName(): string {
    if (mainStore.operatorName && mainStore.operatorName !== 'OPERATOR_NAME') {
      return mainStore.operatorName;
    }
    return DeviceInfo.OPERATOR_NAME;
  }

  function isAnyDialogOpen(): boolean {
    return alertDialog.value.open || confirmDialog.value.open;
  }

  function dequeueNextDialog(): void {
    if (dialogQueue.value.length === 0) {
      return;
    }

    const next = dialogQueue.value.shift()!;
    if (next.type === 'alert') {
      alertDialog.value = {
        open: true,
        title: next.title,
        message: next.message,
      };
    } else {
      confirmDialog.value = {
        open: true,
        title: next.title,
        message: next.message,
        confirmText: next.confirmText ?? COMMON_FIELD.BTNYESSTR,
        cancelText: next.cancelText ?? COMMON_FIELD.BTNNOSTR,
        onConfirm: next.onConfirm,
        onCancel: next.onCancel,
      };
    }
  }

  function showAlert(title: string, message: string): void {
    if (!isAnyDialogOpen()) {
      alertDialog.value = {
        open: true,
        title,
        message,
      };
    } else {
      dialogQueue.value.push({
        type: 'alert',
        title,
        message,
      });
    }
  }

  function closeAlert(): void {
    alertDialog.value = {
      open: false,
      title: '',
      message: '',
    };
    dequeueNextDialog();
  }

  function showConfirm(options: {
    title: string;
    message: string;
    confirmText?: string | undefined;
    cancelText?: string | undefined;
    onConfirm?: (() => void | Promise<void>) | undefined;
    onCancel?: (() => void | Promise<void>) | undefined;
  }): void {
    if (!isAnyDialogOpen()) {
      confirmDialog.value = {
        open: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? COMMON_FIELD.BTNYESSTR,
        cancelText: options.cancelText ?? COMMON_FIELD.BTNNOSTR,
        onConfirm: options.onConfirm,
        onCancel: options.onCancel,
      };
    } else {
      dialogQueue.value.push({
        type: 'confirm',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        onConfirm: options.onConfirm,
        onCancel: options.onCancel,
      });
    }
  }

  function closeConfirm(): void {
    confirmDialog.value = {
      open: false,
      title: '',
      message: '',
      confirmText: COMMON_FIELD.BTNYESSTR,
      cancelText: COMMON_FIELD.BTNNOSTR,
    };
  }

  async function acceptConfirm(): Promise<void> {
    const handler = confirmDialog.value.onConfirm;
    closeConfirm();
    if (handler) {
      await handler();
    }
    dequeueNextDialog();
  }

  async function cancelConfirm(): Promise<void> {
    const handler = confirmDialog.value.onCancel;
    closeConfirm();
    if (handler) {
      await handler();
    }
    dequeueNextDialog();
  }

  /**
   * Mirrors `clearInfo()` in `MachineStatusDetailActivity.kt`.
   */
  function clearInfo(): void {
    oriEQPStatus.value = '';
    oriDownCode.value = '';
    mainState.value = '';
    chamberMachine.value = '';

    facility.value = '';
    mainStatus.value = '';
    subStatus.value = '';
    finalWorkTime.value = '';
    fdcState.value = '';
    operator.value = '';

    comment.value = '';
    commentOptions.value = [];
    hasCommentAdapter.value = false;

    statusOptions.value = [];
    selectedEqpState.value = '';

    downCodeOptions.value = [];
    selectedDownCode.value = '';

    isChamberChecked.value = false;
  }

  /**
   * Resets entire store state on mount and unmount.
   * Ensures singleton Pinia store does not leak stale values or flags (`first = true`).
   */
  function resetState(): void {
    clearInfo();
    eqpId.value = '';
    first.value = true;
    isLoading.value = false;
    isCompleted.value = false;
    focusTarget.value = null;

    dialogQueue.value = [];
    alertDialog.value = {
      open: false,
      title: '',
      message: '',
    };
    confirmDialog.value = {
      open: false,
      title: '',
      message: '',
      confirmText: COMMON_FIELD.BTNYESSTR,
      cancelText: COMMON_FIELD.BTNNOSTR,
    };
  }

  /**
   * Mirrors `setStatusSpinner(statusList: JSONArray)` in `MachineStatusDetailActivity.kt`.
   */
  function setStatusSpinner(statusList: EqpStatusItem[]): void {
    const itemList: BaseOption[] = statusList.map((item) => {
      const status = item.EQPSTATUSCODE || '';
      const statusDesc = item.EQPSTATUSDESC || '';
      return {
        value: status,
        label: `${status}  ${statusDesc}`,
      };
    });

    statusOptions.value = itemList;
    selectedEqpState.value = '';
  }

  /**
   * Mirrors `setDownCodeSpinner(eqpStatus: String, currentEQPDownCode: String?)`
   * in `MachineStatusDetailActivity.kt`.
   */
  async function setDownCodeSpinner(
    eqpStatus: string,
    currentEQPDownCode: string | null,
  ): Promise<boolean> {
    const status = selectedEqpState.value
      ? selectedEqpState.value
      : (() => {
          const spaceIdx = eqpStatus.indexOf(' ');
          return spaceIdx >= 0 ? eqpStatus.substring(0, spaceIdx) : eqpStatus;
        })();

    try {
      const result = await machineStatusDetailService.eqpDownCode(
        getEffectiveFacility(),
        status,
        eqpId.value.trim(),
      );

      if (result.ok && result.data) {
        const rawList = extractItemList<EqpDownCodeItem>(result.data.DOWNCODEITEMS);
        const itemList: BaseOption[] = rawList.map((item) => {
          const downCode = item.EQPDOWNCODE || '';
          const downCodeDesc = item.EQPDOWNDESC || '';
          return {
            value: downCode,
            label: `${downCode}  ${downCodeDesc}`,
          };
        });

        downCodeOptions.value = itemList;
        selectedDownCode.value = '';

        if (first.value) {
          const currentItem = itemList.find((item) => item.label === currentEQPDownCode);
          if (currentItem) {
            selectedDownCode.value = String(currentItem.value);
          }
          first.value = false;
        } else if (status === 'R' || status === 'C') {
          if (itemList.length > 0 && itemList[0]) {
            selectedDownCode.value = String(itemList[0].value);
          }
        } else if (itemList.length === 1 && itemList[0]) {
          selectedDownCode.value = String(itemList[0].value);
        }

        return true;
      }

      showAlert(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        result.message || 'DownCode 조회에 실패했습니다.',
      );
      return false;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error occurred.';
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, msg);
      return false;
    }
  }

  /**
   * Mirrors `setCommentSpinner(downCode: String)` in `MachineStatusDetailActivity.kt`.
   */
  async function setCommentSpinner(downCode: string): Promise<boolean> {
    try {
      const result = await machineStatusDetailService.eqpDownComment(
        getEffectiveFacility(),
        downCode,
      );

      if (result.ok && result.data) {
        const rawList = extractItemList<EqpDownCommentItem>(result.data.DOWNCOMMENTITEMS);
        const itemList = rawList.map((item) => item.DOWNCOMMENT || '');

        commentOptions.value = itemList;
        hasCommentAdapter.value = true;

        if (itemList.length === 1 && itemList[0] !== undefined) {
          comment.value = itemList[0];
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Mirrors `setEQPInfo()` in `MachineStatusDetailActivity.kt`.
   */
  async function setEQPInfo(rawEqpId?: string): Promise<boolean> {
    CommonUtil.hideKeyboard();

    if (rawEqpId !== undefined) {
      eqpId.value = rawEqpId.trim().toUpperCase();
    }

    if (!eqpId.value.trim()) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'EQP ID를 입력하세요');
      focusTarget.value = 'eqp';
      return false;
    }

    clearInfo();
    isLoading.value = true;

    try {
      const result = await machineStatusDetailService.eqpStatus(
        eqpId.value.trim(),
        getEffectiveFacility(),
      );

      if (result.ok && result.data) {
        const data = result.data;
        const opName = getEffectiveOperatorName();
        const opId = getEffectiveOperatorId();

        facility.value = data.FACILITY || '';
        mainStatus.value = data.MAINSTATUS || '';
        subStatus.value = data.SUBSTATUS || '';
        finalWorkTime.value = data.FINALWORKTIME || '';
        fdcState.value = data.FDCDOWN || '';
        operator.value = `${opName}(${opId})`;

        const currentEQPStatus = `${data.EQPSTATUSCODE || ''}  ${data.EQPSTATUSDESC || ''}`;
        const currentEQPDownCode = `${data.DOWNCODE || ''}  ${data.DOWNDESC || ''}`;

        oriEQPStatus.value = currentEQPStatus;
        oriDownCode.value = data.DOWNCODE || '';
        mainState.value = data.MAINSTATUS || '';

        const statusList = extractItemList<EqpStatusItem>(data.STATUSITEMS);
        setStatusSpinner(statusList);
        await setDownCodeSpinner(currentEQPStatus, currentEQPDownCode);
        await setCommentSpinner(currentEQPDownCode);

        isLoading.value = false;
        focusTarget.value = 'eqp';
        return true;
      }

      isLoading.value = false;
      showAlert(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        result.message || '장비상태 조회에 실패했습니다.',
      );
      focusTarget.value = 'eqp';
      return false;
    } catch (error) {
      isLoading.value = false;
      const msg = error instanceof Error ? error.message : 'Unknown error occurred.';
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, msg);
      focusTarget.value = 'eqp';
      return false;
    }
  }

  /**
   * Mirrors `itemSelectedListener` for `R.id.spinner_eqp_state` in `MachineStatusDetailActivity.kt`.
   */
  async function selectEqpState(newStatusKey: string): Promise<void> {
    selectedEqpState.value = newStatusKey;
    downCodeOptions.value = [];
    selectedDownCode.value = '';
    comment.value = '';
    commentOptions.value = [];
    hasCommentAdapter.value = false;

    if (newStatusKey) {
      const selectedOpt = statusOptions.value.find((opt) => String(opt.value) === newStatusKey);
      const eqpStatusLabel = selectedOpt ? selectedOpt.label : newStatusKey;
      await setDownCodeSpinner(eqpStatusLabel, null);

      if (selectedDownCode.value) {
        await setCommentSpinner(selectedDownCode.value);
      }
    }
  }

  /**
   * Mirrors `itemSelectedListener` for `R.id.spinner_down_code` in `MachineStatusDetailActivity.kt`.
   */
  async function selectDownCode(newDownCodeKey: string): Promise<void> {
    selectedDownCode.value = newDownCodeKey;
    comment.value = '';
    commentOptions.value = [];
    hasCommentAdapter.value = false;

    if (newDownCodeKey) {
      await setCommentSpinner(newDownCodeKey);
    }
  }

  /**
   * Mirrors `checkedListener` for `R.id.chk_chamber` in `MachineStatusDetailActivity.kt`.
   */
  async function handleChamberChecked(isChecked: boolean): Promise<boolean> {
    isChamberChecked.value = isChecked;

    if (!isChecked) {
      chamberMachine.value = '';
      return true;
    }

    if (!mainState.value) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '조회된 장비 정보가 없습니다');
    }

    isLoading.value = true;
    try {
      const result = await machineStatusDetailService.checkChamber(
        getEffectiveFacility(),
        eqpId.value.trim(),
        mainState.value,
      );
      isLoading.value = false;

      if (result.ok && result.data) {
        const machineMsg = result.data.RMAG || '';
        const chamberMsg = result.data.CMAG || '';
        const changeFlag = result.data.CHANGEFLAG || '';
        const chamber = result.data.CHAMBER || '';

        chamberMachine.value = chamber;

        if (machineMsg) {
          isChamberChecked.value = false;
          chamberMachine.value = '';
          showAlert(COMMON_FIELD.TXTDIALOGTITLE_OK, machineMsg);
        }

        if (chamberMsg) {
          if (changeFlag === 'Y') {
            showConfirm({
              title: COMMON_FIELD.TXTDIALOGTITLE_OK,
              message: chamberMsg,
              confirmText: COMMON_FIELD.POSITIVEBTNSTR,
              cancelText: COMMON_FIELD.NEGATIVEBTNSTR,
              onConfirm: () => {
                // Keep chamberMachine and isChamberChecked = true
              },
              onCancel: () => {
                isChamberChecked.value = false;
                chamberMachine.value = '';
              },
            });
          } else {
            isChamberChecked.value = false;
            chamberMachine.value = '';
            showAlert(COMMON_FIELD.TXTDIALOGTITLE_OK, chamberMsg);
          }
        }
        return true;
      }

      showAlert(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        result.message || 'Chamber 확인에 실패했습니다.',
      );
      return false;
    } catch (error) {
      isLoading.value = false;
      const msg = error instanceof Error ? error.message : 'Unknown error occurred.';
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, msg);
      return false;
    }
  }

  /**
   * Mirrors `execute()` in `MachineStatusDetailActivity.kt`.
   */
  async function execute(): Promise<boolean> {
    const selectedStatusOpt = statusOptions.value.find(
      (opt) => String(opt.value) === selectedEqpState.value,
    );
    const eqpStatusCode = selectedStatusOpt ? selectedStatusOpt.label : selectedEqpState.value;

    const selectedDownOpt = downCodeOptions.value.find(
      (opt) => String(opt.value) === selectedDownCode.value,
    );
    const eqpDownCode = selectedDownOpt ? String(selectedDownOpt.value) : selectedDownCode.value;

    isLoading.value = true;
    try {
      const result = await machineStatusDetailService.changeEqpStatus({
        eqpId: eqpId.value.trim(),
        facility: getEffectiveFacility(),
        eqpStatusCode,
        eqpDownCode,
        comment: comment.value,
        operatorId: getEffectiveOperatorId(),
        operatorName: getEffectiveOperatorName(),
        changeChamber: chamberMachine.value,
      });
      isLoading.value = false;

      if (result.ok && result.data) {
        const sViaLoading = result.data.VAILOADING || '';
        if (sViaLoading !== '') {
          showAlert('정기 정검 도달', `[${sViaLoading}] VIA Loading W/F 진행 필요!`);
        }
        isCompleted.value = true;
        return true;
      }

      showAlert(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        result.message || '장비상태 변경에 실패했습니다.',
      );
      return false;
    } catch (error) {
      isLoading.value = false;
      const msg = error instanceof Error ? error.message : 'Unknown error occurred.';
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, msg);
      return false;
    }
  }

  function proceedToChangeConfirm(): boolean {
    const selectedStatusOpt = statusOptions.value.find(
      (opt) => String(opt.value) === selectedEqpState.value,
    );
    const selectedEQPStatusLabel = selectedStatusOpt
      ? selectedStatusOpt.label
      : selectedEqpState.value;

    const selectedDownOpt = downCodeOptions.value.find(
      (opt) => String(opt.value) === selectedDownCode.value,
    );
    const selectedDownCodeLabel = selectedDownOpt ? selectedDownOpt.label : selectedDownCode.value;
    const selectedDownCodeKey = selectedDownOpt
      ? String(selectedDownOpt.value)
      : selectedDownCode.value;

    // Android legacy parity:
    // Android checks: `oriEQPStatus != spinnerEqpState.selectedItem.toString() || oriDownCode != spinnerDownCode.selectedItem.toString()`
    // In Android, oriDownCode is code ('CA001') and selectedItem.toString() is 'CA001  DESC', so condition is true.
    const isStatusChanged = oriEQPStatus.value !== selectedEQPStatusLabel;
    const isDownCodeChanged = oriDownCode.value !== selectedDownCodeLabel;

    if (isStatusChanged || isDownCodeChanged) {
      const message =
        `상태: \n` +
        `${oriEQPStatus.value} → ${selectedEQPStatusLabel}\n` +
        `DownCode: \n` +
        `${oriDownCode.value} → ${selectedDownCodeKey}\n` +
        `로 변경하시겠습니까?   `;

      showConfirm({
        title: COMMON_FIELD.TXTDIALOGTITLE_OK,
        message,
        confirmText: COMMON_FIELD.BTNYESSTR,
        cancelText: COMMON_FIELD.BTNNOSTR,
        onConfirm: async () => {
          const opId = getEffectiveOperatorId();
          if (!opId || opId === 'OPERATOR_ID') {
            showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '로그인정보가 확인되지 않습니다.');
            return;
          }
          await execute();
        },
      });
      return true;
    }

    showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '변경된 내역이 없습니다');
    return false;
  }

  /**
   * Mirrors `changeData()` in `MachineStatusDetailActivity.kt`.
   */
  async function changeData(): Promise<boolean> {
    if (!selectedEqpState.value) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '장비상태를 선택하세요');
      return false;
    }

    if (!selectedDownCode.value) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'DOWNCODE를 선택하세요');
      return false;
    }

    if (hasCommentAdapter.value && !comment.value) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'COMMENT를 입력하세요');
      return false;
    }

    const selectedDownOpt = downCodeOptions.value.find(
      (opt) => String(opt.value) === selectedDownCode.value,
    );
    const downCodeLabel = selectedDownOpt ? selectedDownOpt.label : selectedDownCode.value;

    isLoading.value = true;
    try {
      const result = await machineStatusDetailService.checkNonLot({
        eqpId: eqpId.value.trim(),
        facility: getEffectiveFacility(),
        finalTime: finalWorkTime.value,
        operatorId: getEffectiveOperatorId(),
        downCode: downCodeLabel,
      });
      isLoading.value = false;

      if (result.ok && result.data) {
        const data = result.data;
        const nonLotCheck = data.NONLOTCHECK || '';
        const nonLotResult = data.NONLOTRESULT || '';
        const massage = data.NONLOTMESSGE || '';
        const hMessage = data.NONLOTHMESSGE || '';

        if (nonLotCheck === 'Y') {
          if (nonLotResult === 'N') {
            showAlert(hMessage, massage);
            return false;
          }

          showConfirm({
            title: hMessage,
            message: massage,
            confirmText: COMMON_FIELD.BTNYESSTR,
            cancelText: COMMON_FIELD.BTNNOSTR,
            onConfirm: () => {
              proceedToChangeConfirm();
            },
          });
          return true;
        }

        return proceedToChangeConfirm();
      }

      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, result.message || 'NONLOT 확인에 실패했습니다.');
      return false;
    } catch (error) {
      isLoading.value = false;
      const msg = error instanceof Error ? error.message : 'Unknown error occurred.';
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, msg);
      return false;
    }
  }

  return {
    eqpId,
    facility,
    mainStatus,
    subStatus,
    finalWorkTime,
    fdcState,
    operator,
    comment,
    commentOptions,
    hasCommentAdapter,
    statusOptions,
    selectedEqpState,
    downCodeOptions,
    selectedDownCode,
    isChamberChecked,
    oriEQPStatus,
    oriDownCode,
    mainState,
    chamberMachine,
    first,
    isLoading,
    isCompleted,
    focusTarget,
    dialogQueue,
    alertDialog,
    confirmDialog,
    showAlert,
    closeAlert,
    showConfirm,
    closeConfirm,
    acceptConfirm,
    cancelConfirm,
    clearInfo,
    resetState,
    setStatusSpinner,
    setDownCodeSpinner,
    setCommentSpinner,
    setEQPInfo,
    selectEqpState,
    selectDownCode,
    handleChamberChecked,
    changeData,
    proceedToChangeConfirm,
    execute,
  };
});
