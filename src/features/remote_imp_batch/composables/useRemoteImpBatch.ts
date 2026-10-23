import { nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useMainStore } from '~/features/main';
import { barcodeStyleLotId } from '~/utils/barcode-style';

import { ERRORMSG_MSGBODY, remoteImpBatchService } from '../services/remote-imp-batch.service';
import type { DropdownOption, LotInfoBody, PortViewState } from '../types/remote-imp-batch.types';

export interface BaseInputComponentInstance {
  focus: () => void;
  [key: string]: unknown;
}

export function useRemoteImpBatch() {
  const route = useRoute();
  const router = useRouter();
  const mainStore = useMainStore();

  // --- UI controls & state mapping ---
  const txtIngMachine = ref<string>('');
  const txtRecipe = ref<string>('');

  const chkCarry = ref<boolean>(false);
  const selectedBay = ref<string>('');
  const selectedStk = ref<string>('');
  const bayOptions = ref<DropdownOption[]>([]);
  const stkOptions = ref<DropdownOption[]>([]);

  const isSpinnerBayEnabled = ref<boolean>(false);
  const isSpinnerStkEnabled = ref<boolean>(false);
  const isBtnStartEnabled = ref<boolean>(false);

  const editLot2Ref = ref<{ focus?: () => void } | null>(null);

  // --- Modal State & Controller ---
  const messageModalOpen = ref<boolean>(false);
  const messageModal = ref<{
    title: string;
    message: string;
    isConfirm: boolean;
  }>({
    title: '',
    message: '',
    isConfirm: false,
  });

  let confirmResolver: ((value: boolean) => void) | null = null;

  const createPortState = (id: 1 | 2): PortViewState => ({
    id,
    label: `PORT ${id}`,
    lotId: '',
    product: '',
    jobCode: '',
    operation: '',
    qty: '',
    searchOperation: '',
    searchSubOperation: '',
    searchOpType: '',
    searchProcessStep: '',
    searchOperSeq: '',
    isSearchDisabled: id === 1,
    isCommentEnabled: false,
    isReadonlyInput: id === 1,
  });

  const ports = ref<[PortViewState, PortViewState]>([createPortState(1), createPortState(2)]);

  // --- Dialog & Helper methods ---
  const showOkDialog = (title: string, message: string) => {
    messageModal.value = {
      title,
      message,
      isConfirm: false,
    };
    messageModalOpen.value = true;
  };

  const openRemoteRecipeDialog = (recipeList: string): Promise<boolean> => {
    messageModal.value = {
      title: '확인',
      message: `RECIPE [${recipeList}] 확인 후 진행하시겠습니까?`,
      isConfirm: true,
    };
    messageModalOpen.value = true;
    return new Promise<boolean>((resolve: (value: boolean) => void) => {
      confirmResolver = resolve;
    });
  };

  const handleModalConfirm = () => {
    messageModalOpen.value = false;
    if (confirmResolver) {
      confirmResolver(true);
      confirmResolver = null;
    }
  };

  const handleModalCancel = () => {
    messageModalOpen.value = false;
    if (confirmResolver) {
      confirmResolver(false);
      confirmResolver = null;
    }
  };

  const requestFocusEditLot2 = () => {
    void nextTick(() => {
      if (editLot2Ref.value && typeof editLot2Ref.value.focus === 'function') {
        editLot2Ref.value.focus();
      }
    });
  };

  // --- 1. initDisable() ---
  const initDisable = () => {
    ports.value[0].isCommentEnabled = false;
    ports.value[1].isCommentEnabled = false;
    isSpinnerBayEnabled.value = false;
    isSpinnerStkEnabled.value = false;
    isBtnStartEnabled.value = false;
    ports.value[0].isSearchDisabled = true;
  };

  // --- 2. memorizationRecipe() ---
  const memorizationRecipe = async () => {
    if (!txtRecipe.value) return;

    const recipe = txtRecipe.value;
    const lotId = ports.value[0].lotId;
    const chEqpId = txtIngMachine.value;

    const message = await remoteImpBatchService.memorization(chEqpId, recipe, lotId, '', '', 'IMP');

    if (message.isSuccessFul) {
      const popUp = message.body?.POPUP || '';
      if (popUp.length > 0) {
        showOkDialog('알림', popUp);
      }
    } else {
      const errorMessage = message.errorMessage;
      if (errorMessage !== ERRORMSG_MSGBODY) {
        showOkDialog('오류', errorMessage);
        isBtnStartEnabled.value = false;
      }
    }
  };

  watch(txtRecipe, () => {
    void memorizationRecipe();
  });

  // --- 3. setBay() & setStk() ---
  const toText = (v: unknown): string =>
    typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';

  const extractList = (
    bodyData: unknown,
    listKey: string,
    itemKey: string,
    prefixes: string[],
  ): string[] => {
    const pickItem = (item: unknown): string => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        return toText((item as Record<string, unknown>)[itemKey]);
      }
      return '';
    };

    if (Array.isArray(bodyData)) return bodyData.map(pickItem).filter(Boolean);
    if (!bodyData || typeof bodyData !== 'object') return [];

    const obj = bodyData as Record<string, unknown>;
    const listed = obj[listKey];
    if (Array.isArray(listed)) return listed.map(pickItem).filter(Boolean);

    const byPrefix = Object.keys(obj)
      .filter((key) => prefixes.some((p) => key.toUpperCase().startsWith(p)))
      .map((key) => toText(obj[key]))
      .filter(Boolean);
    if (byPrefix.length > 0) return byPrefix;

    return Object.values(obj).filter((v): v is string => typeof v === 'string');
  };

  const toOptions = (list: string[]): DropdownOption[] =>
    list.map((item) => ({ label: item, value: item, text: item }));

  const setBay = async () => {
    const message = await remoteImpBatchService.areaBayInfo(mainStore.facility);
    if (message.isSuccessFul) {
      bayOptions.value = toOptions(extractList(message.body, 'BAYS', 'BAY', ['BAY']));
    } else {
      showOkDialog('오류', message.errorMessage);
    }
  };

  const setStk = async () => {
    if (!selectedBay.value) return;

    const message = await remoteImpBatchService.bayStockerInfo(
      selectedBay.value,
      mainStore.facility,
    );
    if (message.isSuccessFul) {
      stkOptions.value = toOptions(
        extractList(message.body, 'STOCKERS', 'STOCKER', ['STOCKER', 'STK']),
      );
    } else {
      showOkDialog('오류', message.errorMessage);
    }
  };

  const checkChangeListener = (val?: unknown) => {
    const isChecked =
      typeof val === 'boolean'
        ? val
        : ((val as { target?: { checked?: boolean } })?.target?.checked ?? chkCarry.value);

    chkCarry.value = isChecked;

    if (isChecked) {
      isSpinnerBayEnabled.value = true;
      isSpinnerStkEnabled.value = true;
      void setBay();
    } else {
      selectedBay.value = '';
      selectedStk.value = '';
      bayOptions.value = [];
      stkOptions.value = [];
      isSpinnerBayEnabled.value = false;
      isSpinnerStkEnabled.value = false;
    }
  };

  const itemSelectedListener = (val?: unknown) => {
    let bayValue = selectedBay.value ?? '';

    if (typeof val === 'string') {
      bayValue = val;
    } else if (
      typeof val === 'object' &&
      val !== null &&
      'value' in val &&
      typeof (val as { value?: unknown }).value === 'string'
    ) {
      bayValue = (val as { value: string }).value;
    }

    selectedBay.value = bayValue;
    selectedStk.value = '';
    stkOptions.value = [];

    if (bayValue) {
      void setStk();
    }
  };

  // --- 4. LOT Validation Common Logic ---
  const validateLotBusinessRules = (messageBody: LotInfoBody): boolean => {
    const status = messageBody.STATUS || '';
    const state = messageBody.STATE || '';
    const holdStatus = messageBody.HOLDSTATUS || '';
    const batchId = messageBody.BATCHID || '';
    const area = messageBody.AREA || '';
    const lotResUser = messageBody.LOTRESUSER || '';

    if (status === 'RUN') {
      showOkDialog('오류', '이미 MOVE IN된 LOT입니다.');
      return false;
    }
    if (state !== 'WIP') {
      showOkDialog('오류', `${state} 상태 입니다. 자동화 진행이 불가합니다.`);
      return false;
    }
    if (holdStatus === 'ONHOLD') {
      showOkDialog('오류', 'HOLD된 LOT입니다. 자동화 진행이 불가합니다.');
      return false;
    }
    if (batchId.length > 0) {
      showOkDialog('오류', 'BATCHID가 설정된 LOT입니다. 자동화 진행이 불가합니다.');
      return false;
    }
    if (area !== 'IMP') {
      showOkDialog('오류', 'IMP공정이 아닙니다. LOT을 확인 후 진행 바랍니다.');
      return false;
    }
    if (lotResUser.length > 0) {
      showOkDialog('오류', '이미 작업 예약되었거나 진행중인 LOT입니다.');
      return false;
    }
    return true;
  };

  // --- 5. clearLotData1() & setLotData1() & getRecipeInfo() ---
  const clearLotData1 = () => {
    const p1 = ports.value[0];
    p1.product = '';
    p1.jobCode = '';
    p1.operation = '';
    p1.qty = '';

    p1.isCommentEnabled = false;
    isBtnStartEnabled.value = false;

    p1.searchOperation = '';
    p1.searchSubOperation = '';
    p1.searchProcessStep = '';
    p1.searchOperSeq = '';
    p1.searchOpType = '';

    txtRecipe.value = '';
  };

  const getRecipeInfo = async () => {
    const p1 = ports.value[0];
    const message = await remoteImpBatchService.recipeInfo(
      'N',
      p1.lotId,
      p1.searchOperation,
      p1.searchSubOperation,
      p1.product,
      txtIngMachine.value,
      p1.searchOpType,
      mainStore.facility,
    );

    if (message.isSuccessFul) {
      txtRecipe.value = message.body?.RECIPE || '';
      requestFocusEditLot2();
    } else {
      showOkDialog('오류', message.errorMessage);
    }
  };

  const setLotData1 = async () => {
    clearLotData1();

    const lot1 = ports.value[0].lotId.trim();
    const lot2 = ports.value[1].lotId.trim();

    if (lot1.length > 0 && lot1 === lot2) {
      showOkDialog(
        '오류',
        '동일 LOT으로 조회가 불가합니다.\nLOTNAME을 다시 확인해 주시기 바랍니다.',
      );
      return;
    }

    const message = await remoteImpBatchService.lotInfo('MVIN', lot1, mainStore.facility);
    if (message.isSuccessFul) {
      const bodyData = message.body;
      if (!validateLotBusinessRules(bodyData)) return;

      const p1 = ports.value[0];
      const operation = bodyData.OPERATION || '';
      const subOperation = bodyData.SUBOPERATION || '';
      const operationValue = `${operation}-${subOperation}`;

      p1.product = bodyData.PRODUCT || '';
      p1.jobCode = bodyData.JOBCODE || '';
      p1.operation = operationValue;
      p1.qty = bodyData.QUANTITY || '';

      p1.isCommentEnabled = true;
      isBtnStartEnabled.value = true;

      p1.searchOperation = operation;
      p1.searchSubOperation = subOperation;
      p1.searchProcessStep = bodyData.PROCESSSTEP || '';
      p1.searchOperSeq = bodyData.OPERSEQUENCE || '';
      p1.searchOpType = bodyData.OPTYPE || '';

      const nwCommentQty = bodyData.NWCOMMENTQTY || '';
      if (nwCommentQty.length > 0 && parseInt(nwCommentQty, 10) > 0) {
        showOkDialog(
          '확인',
          `읽지 않은 작업성 COMMENT가 [${nwCommentQty}]가 있습니다.\n읽은후 진행하세요.`,
        );
      }

      await getRecipeInfo();
    } else {
      showOkDialog('오류', message.errorMessage);
    }
  };

  // --- 6. clearLotData2() & setLotData2() & checkRecipeInfo() ---
  const clearLotData2 = () => {
    const p2 = ports.value[1];
    p2.product = '';
    p2.jobCode = '';
    p2.operation = '';
    p2.qty = '';

    p2.isCommentEnabled = false;
    isBtnStartEnabled.value = false;

    p2.searchOperation = '';
    p2.searchSubOperation = '';
    p2.searchProcessStep = '';
    p2.searchOperSeq = '';
    p2.searchOpType = '';
  };

  const checkRecipeInfo = async () => {
    const p2 = ports.value[1];
    const message = await remoteImpBatchService.recipeInfo(
      'N',
      p2.lotId,
      p2.searchOperation,
      p2.searchSubOperation,
      p2.product,
      txtIngMachine.value,
      p2.searchOpType,
      mainStore.facility,
    );

    if (message.isSuccessFul) {
      const recipe = message.body?.RECIPE || '';
      if (txtRecipe.value !== recipe) {
        showOkDialog('오류', 'RECIPE가 다른 LOT입니다.');
        p2.product = '';
        p2.jobCode = '';
        p2.operation = '';
        p2.qty = '';
        isBtnStartEnabled.value = false;
        p2.isCommentEnabled = false;
        requestFocusEditLot2();
      }
    } else {
      showOkDialog('오류', message.errorMessage);
      p2.product = '';
      p2.jobCode = '';
      p2.operation = '';
      p2.qty = '';
      isBtnStartEnabled.value = false;
      p2.isCommentEnabled = false;
      requestFocusEditLot2();
    }
  };

  const setLotData2 = async () => {
    clearLotData2();

    const p1 = ports.value[0];
    const p2 = ports.value[1];

    if (p2.lotId.length === 0) {
      showOkDialog('오류', 'LOT ID를 입력하세요');
      return;
    }

    if (p1.lotId === p2.lotId) {
      showOkDialog(
        '오류',
        '동일 LOT으로 조회가 불가합니다.\nLOTNAME을 다시 확인해 주시기 바랍니다.',
      );
      return;
    }

    const message = await remoteImpBatchService.lotInfo('MVIN', p2.lotId, mainStore.facility);
    if (message.isSuccessFul) {
      const bodyData = message.body;
      if (!validateLotBusinessRules(bodyData)) return;

      const operation = bodyData.OPERATION || '';
      const subOperation = bodyData.SUBOPERATION || '';
      const operationValue = `${operation}-${subOperation}`;

      p2.product = bodyData.PRODUCT || '';
      p2.jobCode = bodyData.JOBCODE || '';
      p2.operation = operationValue;
      p2.qty = bodyData.QUANTITY || '';

      p2.isCommentEnabled = true;
      isBtnStartEnabled.value = true;

      p2.searchOperation = operation;
      p2.searchSubOperation = subOperation;
      p2.searchProcessStep = bodyData.PROCESSSTEP || '';
      p2.searchOperSeq = bodyData.OPERSEQUENCE || '';
      p2.searchOpType = bodyData.OPTYPE || '';

      const nwCommentQty = bodyData.NWCOMMENTQTY || '';
      if (nwCommentQty.length > 0 && parseInt(nwCommentQty, 10) > 0) {
        showOkDialog(
          '확인',
          `읽지 않은 작업성 COMMENT가 [${nwCommentQty}]가 있습니다.\n읽은후 진행하세요.`,
        );
      }

      await checkRecipeInfo();
    } else {
      showOkDialog('오류', message.errorMessage);
      p2.lotId = '';
      p2.product = '';
      p2.jobCode = '';
      p2.operation = '';
      p2.qty = '';
      p2.isCommentEnabled = false;
    }
  };

  // --- 7. Input uppercase & editorActionListener with BarcodeStyle ---
  const onLotInputUpdate = (portId: 1 | 2, val: string) => {
    if (portId === 2) {
      ports.value[1].lotId = val.toUpperCase();
    } else {
      ports.value[0].lotId = val;
    }
  };

  const editorActionListener = () => {
    const rawVal = ports.value[1].lotId;

    if (!rawVal || !rawVal.trim()) {
      return;
    }

    const result = barcodeStyleLotId(rawVal);

    if (!result.isValid) {
      return;
    }

    ports.value[1].lotId = result.parsedId;

    void setLotData2();
  };

  // --- 8. readComment1() & readComment2() ---
  const readComment1 = () => {
    const p1 = ports.value[0];
    void router.push({
      path: '/comment-list',
      query: {
        LOTID: p1.lotId,
        OPERATION: p1.searchOperation,
        SUBOPERATION: p1.searchSubOperation,
        PROCESSSTEP: p1.searchProcessStep,
        OPERSEQUENCE: p1.searchOperSeq,
      },
    });
  };

  const readComment2 = () => {
    const p2 = ports.value[1];
    void router.push({
      path: '/comment-list',
      query: {
        LOTID: p2.lotId,
        OPERATION: p2.searchOperation,
        SUBOPERATION: p2.searchSubOperation,
        PROCESSSTEP: p2.searchProcessStep,
        OPERSEQUENCE: p2.searchOperSeq,
      },
    });
  };

  // --- 9. checkComment(), executeRemoteStart(), execute ---
  const checkComment = async (lotId: string): Promise<boolean> => {
    const message = await remoteImpBatchService.lotInfo('MVIN', lotId, mainStore.facility);
    if (message.isSuccessFul) {
      const nwCommentQty = message.body?.NWCOMMENTQTY || '';
      if (nwCommentQty.length > 0 && parseInt(nwCommentQty, 10) > 0) {
        showOkDialog(
          '오류',
          `LOT[${lotId}]에 읽지 않은 작업성 COMMENT가 [${nwCommentQty}]가 있습니다.\n읽은후 진행하세요.`,
        );
        return false;
      }
      return true;
    } else {
      showOkDialog('오류', message.errorMessage);
      return false;
    }
  };

  const execute = async () => {
    const p1 = ports.value[0];
    const p2 = ports.value[1];

    const isCarryFlag = chkCarry.value ? 'Y' : 'N';
    const bay = chkCarry.value ? selectedBay.value : '';
    const stocker = chkCarry.value ? selectedStk.value : '';

    const message = await remoteImpBatchService.impBatchRemoteStart({
      LOTNAME1: p1.lotId,
      LOTNAME2: p2.lotId,
      MACHINENAME: txtIngMachine.value,
      MACHINETYPE: '',
      RECIPENAME: txtRecipe.value,
      ISCARRY: isCarryFlag,
      BAY: bay,
      STOCKER: stocker,
      EVENTUSER: mainStore.operatorId || 'ENGINEER',
      PRODUCTNAME1: p1.product,
      PRODUCTNAME2: p2.product,
      OPERATION1: p1.operation,
      OPERATION2: p2.operation,
      JOBCODE1: p1.jobCode,
      JOBCODE2: p2.jobCode,
    });

    if (message.isSuccessFul) {
      router.back();
    } else {
      showOkDialog('오류', message.errorMessage);
    }
  };

  const executeRemoteStart = async () => {
    const p1 = ports.value[0];
    const p2 = ports.value[1];

    if (txtIngMachine.value.length === 0) {
      showOkDialog('오류', '진행장비를 입력하세요.');
      return;
    }
    if (txtRecipe.value.length === 0) {
      showOkDialog('오류', '진행Rcp가 조회되지 않았습니다.');
      return;
    }
    if (p1.lotId.length === 0 || p2.lotId.length === 0) {
      showOkDialog('오류', '진행할 LOT을 다시 조회 바랍니다.');
      return;
    }
    if (p1.operation.length === 0 || p2.operation.length === 0) {
      showOkDialog('오류', 'LOT 조회가 정상적으로 이루어 지지 않았습니다.');
      return;
    }
    if (chkCarry.value) {
      if (!selectedBay.value) {
        showOkDialog('오류', 'BAY를 선택하세요.');
        return;
      }
      if (!selectedStk.value) {
        showOkDialog('오류', 'STOCKER를 선택하세요.');
        return;
      }
    }

    if (!(await checkComment(p1.lotId))) return;
    if (!(await checkComment(p2.lotId))) return;

    const isConfirmed = await openRemoteRecipeDialog(txtRecipe.value);
    if (isConfirmed) {
      await execute();
    }
  };

  const onSingleClick = (buttonId: string) => {
    switch (buttonId) {
      case 'btn_search_port1':
        void setLotData1();
        break;
      case 'btn_comment_read1':
        readComment1();
        break;
      case 'btn_search_port2':
        void setLotData2();
        break;
      case 'btn_comment_read2':
        readComment2();
        break;
      case 'btn_start':
        void executeRemoteStart();
        break;
      case 'btn_cancel':
        router.back();
        break;
    }
  };

  onMounted(() => {
    initDisable();

    const lotId = typeof route.query.LOTID === 'string' ? route.query.LOTID : '';
    const eqpId = typeof route.query.EQPID === 'string' ? route.query.EQPID : '';

    if (lotId.length > 0 && eqpId.length > 0) {
      ports.value[0].lotId = lotId;
      txtIngMachine.value = eqpId;
      void setLotData1();
    }

    requestFocusEditLot2();
  });

  return {
    messageModalOpen,
    messageModal,
    handleModalConfirm,
    handleModalCancel,
    showOkDialog,
    openRemoteRecipeDialog,
    txtIngMachine,
    txtRecipe,
    chkCarry,
    selectedBay,
    selectedStk,
    bayOptions,
    stkOptions,
    isSpinnerBayEnabled,
    isSpinnerStkEnabled,
    isBtnStartEnabled,
    ports,
    editLot2Ref,
    initDisable,
    memorizationRecipe,
    setBay,
    setStk,
    clearLotData1,
    setLotData1,
    getRecipeInfo,
    clearLotData2,
    setLotData2,
    checkRecipeInfo,
    readComment1,
    readComment2,
    executeRemoteStart,
    execute,
    checkComment,
    checkChangeListener,
    itemSelectedListener,
    editorActionListener,
    onSingleClick,
    onLotInputUpdate,
  };
}
