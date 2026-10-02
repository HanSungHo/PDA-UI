import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import processInquireService, {
  createDemoMeasureInfo,
} from '../services/mock-process-inquire.service';
import type { MeasureRow, ProcessInquireForm } from '../types/process-inquire.types';
import { useConfirmModal } from './useConfirmModal';

const defaultForm: ProcessInquireForm = {
  lotNo: '',
  job: '',
  currentProcess: '',
  productName: '',
  quantity: '',
  currentSlot: '',
  currentWf: '',
  semSlot: '',
  semWf: '',
};

export interface ProcessInquireRouteParams {
  LOTID?: string;
  OPERATION?: string;
  ISSKIP?: string;
  REWORKSKIP?: string;
}

export interface ProcessInquireResult {
  FINISH?: string;
  CURRENTSTEP?: string;
  RECIPE?: string;
  EQPGROUP?: string;
  CHANGEEQPGROUP?: string;
  PROCESSSTEP?: string;
  COMMENTQTY?: string;
  NRWCOMMENTQTY?: string;
  SUBOPERATION?: string;
  SCOPESUB?: string;
}
export interface UseProcessInquireOptions {
  onComplete?: (result: ProcessInquireResult) => void;
}
export type WaferSelectTarget = 'currentSlot' | 'currentWf' | 'semSlot' | 'semWf';

export interface WaferSelectPayload {
  lotId: string;
  existingWaferList: string;
  fixedCount: number;
  target: WaferSelectTarget;
}

export function useProcessInquire(options: UseProcessInquireOptions = {}) {
  const route = useRoute();
  const router = useRouter();
  const { alert, confirm } = useConfirmModal();

  const form = reactive<ProcessInquireForm>({
    ...defaultForm,
  });

  const rows = ref<MeasureRow[]>([]);

  const m_sOperation = ref('');
  const m_sSubOperation = ref('');
  const m_sMulitOperation = ref('');
  const m_sRecipe = ref('');
  const m_sEqpGroup = ref('');
  const m_sChangeEqpGroup = ref('');
  const m_sProcessStep = ref('');
  const m_sCommentQty = ref('');
  const m_sWorkedCommentQty = ref('');
  const m_isSkip = ref('N');
  const m_reworkSkip = ref('N');
  const m_moveInIng = ref(false);

  const slotEnabledWaferList = ref('');

  const slotList =
    'Slot.01,Slot.02,Slot.03,Slot.04,Slot.05,' +
    'Slot.06,Slot.07,Slot.08,Slot.09,Slot.10,' +
    'Slot.11,Slot.12,Slot.13,Slot.14,Slot.15,' +
    'Slot.16,Slot.17,Slot.18,Slot.19,Slot.20,' +
    'Slot.21,Slot.22,Slot.23,Slot.24,Slot.25';

  const isLoading = ref(false);
  const isSubmitting = ref(false);
  const errorMessage = ref('');
  const scopeSubstitution = ref(false);
  const skipCurrentProcess = ref(false);

  function getWaferSelectPayload(target: WaferSelectTarget): WaferSelectPayload {
    const isSlot = target === 'currentSlot' || target === 'semSlot';

    const existingWaferList = isSlot ? slotList : slotEnabledWaferList.value;

    return {
      lotId: form.lotNo,
      existingWaferList,
      fixedCount: existingWaferList.split(',').filter(Boolean).length,
      target,
    };
  }
  function getRouteString(key: keyof ProcessInquireRouteParams): string {
    const value = route.query[key];

    if (Array.isArray(value)) {
      return value[0]?.toString() ?? '';
    }

    return value?.toString() ?? '';
  }

  function initializeFromPreviousScreen(): void {
    const lotId = getRouteString('LOTID');
    const operationValue = getRouteString('OPERATION');
    const isSkip = getRouteString('ISSKIP');
    const reworkSkip = getRouteString('REWORKSKIP');

    if (lotId !== '') {
      form.lotNo = lotId;
      m_sOperation.value = operationValue;
      m_isSkip.value = isSkip !== '' ? isSkip : 'N';
      m_reworkSkip.value = reworkSkip !== '' ? reworkSkip : 'N';
      return;
    }

    form.lotNo = '';
    m_sOperation.value = '';
    m_isSkip.value = 'N';
    m_reworkSkip.value = 'N';
  }

  const isCurrentOperationSkipEnabled = computed(() => m_isSkip.value !== 'N');

  const selectedRows = computed(() => rows.value.filter((row) => row.status === 'Y'));

  function selectMeasure(): void {
    rows.value = rows.value.map((row) => ({
      ...row,
      status: row.status === 'C' ? 'C' : row.status === 'Y' ? 'Y' : 'N',
    }));

    const selectedRow = rows.value.find((row) => row.status === 'Y');

    if (selectedRow) {
      m_sSubOperation.value = selectedRow.subOperation ?? '';
      m_sProcessStep.value = selectedRow.processName ?? '';
    }
  }

  function toggleMeasureRow(row: MeasureRow): void {
    if (m_moveInIng.value) {
      return;
    }

    if (row.status === 'C') {
      return;
    }

    if (row.status === 'N') {
      rows.value = rows.value.map((item) => {
        if (item.id !== row.id) {
          return item;
        }

        return {
          ...item,
          status: 'Y',
        };
      });

      m_sSubOperation.value = row.subOperation ?? '';
      m_sProcessStep.value = row.processName ?? '';

      return;
    }

    if (row.status === 'Y') {
      rows.value = rows.value.map((item) => {
        if (item.id !== row.id) {
          return item;
        }

        return {
          ...item,
          status: 'N',
        };
      });

      m_sSubOperation.value = '';
      m_sProcessStep.value = '';
    }
  }

  async function getMeasureInfo(): Promise<void> {
    rows.value = [];
    skipCurrentProcess.value = false;
    isLoading.value = true;
    errorMessage.value = '';

    try {
      const lotId = form.lotNo;
      const response = await processInquireService.getMeasureInfo(lotId);
      const messageBody = response.data;

      if (messageBody?.measureItems && messageBody.measureItems.length > 0) {
        const sProduct = messageBody.product ?? '';
        const sOperation = messageBody.operation ?? '';
        const sSubOperation = messageBody.subOperation ?? '';
        const sPhotoJobCode = messageBody.photoJobCode ?? '';
        const sProcessStep = messageBody.processStep ?? '';
        const sQty = messageBody.quantity ?? '';
        const sSlotList = messageBody.slotList ?? '';
        const sWaferList = messageBody.waferList ?? '';
        const sSEMSlotList = messageBody.semSlotList ?? '';
        const sSEMWaferList = messageBody.semWaferList ?? '';

        form.job = sPhotoJobCode;
        form.currentProcess = `${sProcessStep}(${sOperation}${sSubOperation})`;
        form.productName = sProduct;
        form.quantity = sQty;
        form.currentSlot = sSlotList;
        form.currentWf = sWaferList;
        form.semSlot = sSEMSlotList;
        form.semWf = sSEMWaferList;

        rows.value = messageBody.measureItems.map((item: MeasureRow) => ({
          ...item,
          status: item.status === 'Y' ? 'C' : (item.status ?? 'N'),
        }));

        selectMeasure();
        return;
      }

      rows.value = createDemoMeasureInfo(form).measureItems;
    } catch {
      rows.value = createDemoMeasureInfo(form).measureItems;
      errorMessage.value = '서버 연결에 실패하여 기본 목록을 불러왔습니다.';
    } finally {
      isLoading.value = false;
    }
  }

  async function getSlotInfo(): Promise<void> {
    try {
      const response = await processInquireService.getSlotInfo(form.lotNo);

      slotEnabledWaferList.value = response.data?.waferList ?? '';
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : 'Slot 정보를 가져오지 못했습니다.';
    }
  }

  async function btnOk(): Promise<void> {
    if (m_moveInIng.value) {
      return;
    }

    let selectedCount = 0;

    for (const row of rows.value) {
      if (row.status === 'Y') {
        selectedCount++;
      }
    }

    if (selectedCount === 0) {
      errorMessage.value = '계측할 공정을 선택하세요.';
      await alert('계측할 공정을 선택하세요.');
      return;
    }

    if (skipCurrentProcess.value) {
      await checkDiCycle();
      return;
    }

    if (selectedCount > 1) {
      errorMessage.value = '계측할 공정을 하나만 선택하세요.';
      await alert('계측할 공정을 하나만 선택하세요.');
      return;
    }

    const result = await measuerSet();
    if (result) finishWithResult(result);
  }

  async function checkDiCycle(): Promise<void> {
    try {
      const selectedOps = selectedRows.value.map(
        (row) => `${m_sOperation.value}-${row.subOperation}`,
      );

      const response = await processInquireService.checkDiCycle(
        form.lotNo,
        m_sOperation.value,
        selectedOps,
      );

      const messageBody = response.data;
      const sDICYCLE = messageBody?.diCycle ?? '';

      if (sDICYCLE === 'Y') {
        const itemList = messageBody?.items ?? [];

        const photoOperType = itemList
          .map((item) => item?.PHOTOOPERTYPE ?? '')
          .filter(Boolean)
          .join(' ');

        const shouldSkip = await confirm(
          `계측 대상 LOT 입니다.(${photoOperType})\n` + '측정 없이 SKIP 하시겠습니까?',
        );

        if (!shouldSkip) {
          return;
        }
      } else {
        const shouldSkip = await confirm('선택한 공정을 SKIP 하시겠습니까?');

        if (!shouldSkip) {
          return;
        }
      }

      await moveIn();
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'DI Cycle 확인에 실패했습니다.';

      await alert(errorMessage.value);
    }
  }

  async function measuerSet(): Promise<ProcessInquireResult | undefined> {
    let sSubOperation = '';

    for (const row of rows.value) {
      if (row.status === 'Y') {
        sSubOperation = row.subOperation ?? '';
      }
    }

    isSubmitting.value = true;
    errorMessage.value = '';

    try {
      const response = await processInquireService.submitMeasureSet({
        lotId: form.lotNo,
        facility: 'KFAB',
        operation: m_sOperation.value,
        subOperation: sSubOperation,
        qty: form.quantity,
        slotList: form.currentSlot,
        waferList: form.currentWf,
        semSlotList: form.semSlot,
        semWaferList: form.semWf,
      });

      const messageBody = response.data;

      const sRecipe = messageBody?.RECIPE ?? '';
      const sEqpGroup = messageBody?.EQPGROUP ?? '';
      const sChangeEqpGroup = messageBody?.CHANGEEQPGROUP ?? '';
      const sProcessStep = messageBody?.PROCESSSTEP ?? '';
      const sCommentQty = messageBody?.COMMENTQTY ?? '';
      const sWorkedCommentQty = messageBody?.NRWCOMMENTQTY ?? '';

      const sCurrentStep = `${sProcessStep}(${m_sOperation.value}${sSubOperation})`;

      m_sRecipe.value = sRecipe;
      m_sEqpGroup.value = sEqpGroup;
      m_sChangeEqpGroup.value = sChangeEqpGroup;
      m_sProcessStep.value = sProcessStep;
      m_sCommentQty.value = sCommentQty;
      m_sWorkedCommentQty.value = sWorkedCommentQty;
      m_sSubOperation.value = sSubOperation;

      const returnIntent: ProcessInquireResult = {
        CURRENTSTEP: sCurrentStep,
        RECIPE: sRecipe,
        EQPGROUP: sEqpGroup,
        CHANGEEQPGROUP: sChangeEqpGroup,
        PROCESSSTEP: sProcessStep,
        COMMENTQTY: sCommentQty,
        NRWCOMMENTQTY: sWorkedCommentQty,
        SUBOPERATION: sSubOperation,
      };

      if (m_sProcessStep.value === 'VI' && scopeSubstitution.value) {
        returnIntent.SCOPESUB = 'Y';
      }

      return returnIntent;
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : '측정 정보 전송에 실패했습니다.';

      await alert(errorMessage.value);
      return undefined;
    } finally {
      isSubmitting.value = false;
    }
  }

  async function moveIn(): Promise<void> {
    m_moveInIng.value = true;

    let subOperation = '';
    let completedFlag = true;

    for (const row of rows.value) {
      if (row.status !== 'C') {
        completedFlag = false;
      }

      if (subOperation === '' && row.status === 'Y') {
        subOperation = row.subOperation ?? '';
      }
    }

    if (completedFlag) {
      m_moveInIng.value = false;
      finishWithResult({ FINISH: 'Y' });
      return;
    }

    if (subOperation === '') {
      m_moveInIng.value = false;
      await getMeasureInfo();
      return;
    }

    try {
      const response = await processInquireService.moveIn({
        lotId: form.lotNo,
        facility: 'KFAB',
        operation: m_sOperation.value,
        subOperation,
        qty: form.quantity,
        reworkSkip: m_reworkSkip.value,
      });

      if (response.status >= 200 && response.status < 300) {
        rows.value = rows.value.map((row) => {
          if (row.subOperation !== subOperation) {
            return row;
          }

          return {
            ...row,
            status: 'C',
          };
        });

        await delay(1000);
        await moveIn();
        return;
      }

      throw new Error('MOVE IN 요청에 실패하였습니다.');
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : 'MOVE IN 요청에 실패하였습니다.';

      await alert(`MOVE IN 실패\n${errorMessage.value}`);

      m_moveInIng.value = false;
    }
  }

  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  async function initialize(): Promise<void> {
    initializeFromPreviousScreen();

    await Promise.all([getMeasureInfo(), getSlotInfo()]);
  }

  function finishWithResult(result: ProcessInquireResult): void {
    if (options.onComplete) {
      options.onComplete(result);
      return;
    }

    window.history.replaceState(
      {
        ...window.history.state,
        processInquireResult: result,
      },
      '',
    );

    router.back();
  }

  const operation = computed({
    get: () => m_sOperation.value,
    set: (value: string) => {
      m_sOperation.value = value;
    },
  });

  const processStep = computed({
    get: () => m_sProcessStep.value,
    set: (value: string) => {
      m_sProcessStep.value = value;
    },
  });

  const currentSubOperation = computed({
    get: () => m_sSubOperation.value,
    set: (value: string) => {
      m_sSubOperation.value = value;
    },
  });

  async function loadMeasureInfo(): Promise<void> {
    await getMeasureInfo();
  }

  async function loadSlotInfo(): Promise<void> {
    await getSlotInfo();
  }

  async function confirmSkipProcess(): Promise<boolean> {
    try {
      const selectedOps = selectedRows.value.map(
        (row) => `${m_sOperation.value}-${row.subOperation}`,
      );

      const response = await processInquireService.checkDiCycle(
        form.lotNo,
        m_sOperation.value,
        selectedOps,
      );

      if (response.data?.diCycle === 'Y') {
        return confirm('계측 대상 LOT 입니다.\n' + '측정 없이 SKIP 하시겠습니까?');
      }

      return confirm('선택한 공정을 SKIP 하시겠습니까?');
    } catch {
      return confirm('선택한 공정을 SKIP 하시겠습니까?');
    }
  }

  async function submitCurrentMeasure(): Promise<void> {
    await btnOk();
  }

  async function runMoveInProcess(): Promise<void> {
    await moveIn();
  }

  return {
    form,
    rows,
    selectedRows,
    m_sOperation,
    m_isSkip,
    m_reworkSkip,
    m_sSubOperation,
    m_sMulitOperation,
    m_sRecipe,
    m_sEqpGroup,
    m_sChangeEqpGroup,
    m_sProcessStep,
    m_sCommentQty,
    m_sWorkedCommentQty,
    m_moveInIng,
    skipCurrentProcess,
    scopeSubstitution,
    isCurrentOperationSkipEnabled,
    slotEnabledWaferList,
    slotList,
    isLoading,
    isSubmitting,
    errorMessage,
    operation,
    processStep,
    currentSubOperation,
    initializeFromPreviousScreen,
    initialize,
    getMeasureInfo,
    getSlotInfo,
    selectMeasure,
    toggleMeasureRow,
    btnOk,
    checkDiCycle,
    measuerSet,
    moveIn,
    finishWithResult,
    loadMeasureInfo,
    loadSlotInfo,
    confirmSkipProcess,
    submitCurrentMeasure,
    runMoveInProcess,
    getWaferSelectPayload,
  };
}

export default useProcessInquire;
