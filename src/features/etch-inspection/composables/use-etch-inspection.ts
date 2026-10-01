import { COMMON_FIELD } from 'src/constants/common-strings';
import { useMainStore } from 'src/features/main/stores/main.store';
import { type ComponentPublicInstance, computed, nextTick, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import * as etchInspectionService from '../services/etch-inspection.service';

interface LotInputExpose {
  focus(): void;
  select(): void;
}

function stringValue(value: unknown): string {
  if (Array.isArray(value)) return stringValue(value[0]);
  if (typeof value === 'string' || typeof value === 'number') return String(value);

  return '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseLotBarcode(value: string): string {
  if (!value.startsWith(' ')) return '';

  let returnLotId = value.replace(' ', '');
  if (returnLotId.startsWith('$')) {
    returnLotId = value.replace('$', '').trimStart();
  }

  if (!returnLotId) return '';

  return returnLotId.slice(0, -1).toUpperCase();
}

export function useEtchInspection() {
  const route = useRoute();
  const router = useRouter();
  const mainStore = useMainStore();

  const LOTID = ref(stringValue(route.query.LOTID || route.query.lotId).toUpperCase());
  const txtViewLotname = ref('');
  const OldOperation = ref('');
  const OldOperationDesc = ref('');
  const oldMachine = ref('');
  const NowOperation = ref('');
  const NowOperationDesc = ref('');
  const sInspDate = ref('');
  const sproduct = ref('');
  const txtInspectionComment = ref('');
  const loading = ref(false);
  const dialogTitle = ref('');
  const dialogMessage = ref('');
  const dialogMode = ref<'alert' | 'confirm' | ''>('');
  const dialogAfterClose = ref<(() => void) | undefined>();
  const lotInputRef = ref<LotInputExpose | null>(null);
  const canExecute = computed(() => txtViewLotname.value !== '');

  function setLotInputRef(element: Element | ComponentPublicInstance | null): void {
    lotInputRef.value = element as LotInputExpose | null;
  }

  async function selectLotInput(): Promise<void> {
    await nextTick();
    lotInputRef.value?.focus();
    lotInputRef.value?.select();
  }

  function showAlert(title: string, message: string, afterClose?: () => void): void {
    dialogTitle.value = title;
    dialogMessage.value = message;
    dialogMode.value = 'alert';
    dialogAfterClose.value = afterClose;
  }

  function closeDialog(): void {
    const callback = dialogAfterClose.value;
    dialogAfterClose.value = undefined;
    dialogMode.value = '';
    callback?.();
  }

  function cancelDialog(): void {
    dialogAfterClose.value = undefined;
    dialogMode.value = '';
  }

  function clearData(): void {
    LOTID.value = '';
    txtViewLotname.value = '';
    OldOperation.value = '';
    OldOperationDesc.value = '';
    oldMachine.value = '';
    NowOperation.value = '';
    NowOperationDesc.value = '';
    sInspDate.value = '';
    sproduct.value = '';
    txtInspectionComment.value = '';
  }

  function updateLotInput(value: string | number | undefined): void {
    LOTID.value = stringValue(value).toUpperCase();
  }

  async function searchData(lotId = LOTID.value): Promise<void> {
    if (loading.value) return;

    loading.value = true;
    clearData();

    try {
      if (!lotId) {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'LOT ID을 입력하세요');
        return;
      }

      const response = await etchInspectionService.searchData(lotId);
      if (!response.success || !response.data) {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, response.errorMessage);
        void selectLotInput();
        return;
      }

      txtViewLotname.value = lotId;
      OldOperation.value = response.data.OLDPROCESSOPERATIONNAME;
      OldOperationDesc.value = response.data.OLDOPERATIONDESCRIPTION;
      oldMachine.value = response.data.OLDMACHINENAME;
      NowOperation.value = response.data.NOWPROCESSOPERATIONNAME;
      NowOperationDesc.value = response.data.NOWOPERATIONDESCRIPTION;
      sInspDate.value = response.data.INSPDATE;
      sproduct.value = response.data.PRODUCTSPECNAME;
    } catch (error: unknown) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorMessage(error));
      void selectLotInput();
    } finally {
      loading.value = false;
    }
  }

  async function handleLotEnter(): Promise<void> {
    const returnLotId = parseLotBarcode(LOTID.value);
    LOTID.value = returnLotId;

    if (!returnLotId) {
      clearData();
      showAlert('READING ERROR', 'LOT#를 읽어주세요.');
      return;
    }

    await searchData(returnLotId);
  }

  function vibrate(): void {
    if ('vibrate' in navigator) navigator.vibrate(200);
  }

  function execution(): void {
    if (loading.value) return;

    if (!txtViewLotname.value) {
      vibrate();
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'LotName이 확인되지 않습니다..');
      return;
    }

    if (sInspDate.value) {
      dialogTitle.value = COMMON_FIELD.TXTDIALOGTITLE_INFORM;
      dialogMessage.value = `[${OldOperation.value}] 공정의 검사 이력이 있습니다. 삭제 후 다시 입력 하시겠습니까?`;
      dialogMode.value = 'confirm';
      return;
    }

    void confirmExecution();
  }

  async function confirmExecution(): Promise<void> {
    if (loading.value || !txtViewLotname.value) return;

    dialogMode.value = '';
    loading.value = true;

    try {
      const response = await etchInspectionService.execution({
        facility: mainStore.facility,
        lotId: txtViewLotname.value,
        product: sproduct.value,
        oldOperation: OldOperation.value,
        oldOperationDesc: OldOperationDesc.value,
        oldMachine: oldMachine.value,
        operatorId: mainStore.operatorId,
        comment: txtInspectionComment.value,
      });

      if (!response.success) {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, response.errorMessage);
        return;
      }

      clearData();
      void selectLotInput();
    } catch (error: unknown) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorMessage(error));
    } finally {
      loading.value = false;
    }
  }

  function close(): void {
    router.back();
  }

  onMounted(() => {
    if (LOTID.value) void searchData(LOTID.value);
  });

  return {
    LOTID,
    txtViewLotname,
    OldOperation,
    OldOperationDesc,
    oldMachine,
    NowOperation,
    NowOperationDesc,
    sInspDate,
    sproduct,
    txtInspectionComment,
    loading,
    canExecute,
    dialogTitle,
    dialogMessage,
    dialogMode,
    lotInputRef,
    setLotInputRef,
    updateLotInput,
    searchData,
    handleLotEnter,
    execution,
    confirmExecution,
    clearData,
    close,
    closeDialog,
    cancelDialog,
  };
}
