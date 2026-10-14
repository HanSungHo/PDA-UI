import { defineStore } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { useMainStore } from 'src/features/main/stores/main.store';
import { validateEquipment } from 'src/utils/validate-equipment';
import { computed, ref } from 'vue';

import { remoteFurnaceService } from '../services/remote-furnace.service';
import type {
  BatchLotItem,
  DummyMode,
  PortStatusKind,
  RemoteFurnaceLotInfo,
  RestartMode,
} from '../types/remote-furnace.types';

export const useRemoteFurnaceStore = defineStore('remote-furnace', () => {
  const mainStore = useMainStore();

  // Core Form State
  const lotId = ref('');
  const batchId = ref('');
  const recipe = ref('');
  const isRecipeChanged = ref(false);
  const selectedRecipe = ref('');
  const recipeOptions = ref<string[]>([]);
  const standardMachine = ref('');
  const isStandardMachineChanged = ref(false);
  const processingMachine = ref('');
  const exMachine = ref('');

  // Port State
  const selectedPort = ref('');
  const portOptions = ref<string[]>([]);
  const portState = ref('');
  const portLotName = ref('');

  // Machine internal ids & areas
  const superEqpId = ref('');
  const mainEqpId = ref('');
  const eqpArea = ref('');
  const eqpType = ref('');

  // Operation details for recipes
  const operation = ref('');
  const subOperation = ref('');
  const product = ref('');
  const processStep = ref('');
  const operSeq = ref('');
  const area = ref('');
  const opType = ref('');

  // Table Data
  const batchLots = ref<BatchLotItem[]>([]);
  const selectedLot = ref<BatchLotItem | null>(null);

  // Operational Flags
  const dummyMode = ref<DummyMode>('F');
  const restartMode = ref<RestartMode>('F');
  const isLoading = ref(false);
  const isInterlocked = ref(false);

  // Field enablement
  const isLotNoDisabled = ref(true);
  const isMachineDisabled = ref(false);
  const isPortDisabled = ref(false);
  const isRecipeDisabled = ref(false);
  const isClearPortDisabled = ref(true);
  const isStartBtnDisabled = ref(true);
  const isRestartBtnDisabled = ref(true);

  // Dialog & Notification state
  const alertDialog = ref<{
    open: boolean;
    title: string;
    message: string;
    isAlarm?: boolean;
  }>({
    open: false,
    title: '',
    message: '',
    isAlarm: false,
  });

  const confirmDialog = ref<{
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    open: false,
    title: '',
    message: '',
  });

  const recipeDialog = ref<{
    open: boolean;
    recipeList: string;
    lotNo: string;
    action: 'START' | 'RESTART';
  }>({
    open: false,
    recipeList: '',
    lotNo: '',
    action: 'START',
  });

  // Cross-screen data passing
  const commentLotContext = ref<BatchLotItem | null>(null);

  // Computed
  const portStatusKind = computed<PortStatusKind>(() => {
    const raw = (portState.value || '').toUpperCase();
    if (raw === 'INIT') return 'init';
    if (raw === 'RUN') return 'run';
    if (raw === 'PENDING') return 'pending';
    if (raw === 'READY') return 'ready';
    if (raw === 'RESERVED') return 'reserved';
    if (raw === 'COMPLETE') return 'complete';
    if (raw === 'IDLE') return 'idle';
    return 'unknown';
  });

  const startButtonLabel = computed(() => {
    return dummyMode.value === 'NONLOT' ? 'NO BATCH' : 'START';
  });

  const restartButtonLabel = computed(() => {
    return dummyMode.value === 'NONLOT' ? '온도설정' : 'RESTART';
  });

  // Dialog helpers
  function showAlert(title: string, message: string, isAlarm = false): void {
    alertDialog.value = {
      open: true,
      title,
      message,
      isAlarm,
    };
  }

  function closeAlert(): void {
    alertDialog.value.open = false;
  }

  function showConfirm(params: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }): void {
    confirmDialog.value = {
      open: true,
      title: params.title,
      message: params.message,
      confirmText: params.confirmText || COMMON_FIELD.BTNOKSTR,
      cancelText: params.cancelText || COMMON_FIELD.NEGATIVEBTNSTR,
      onConfirm: params.onConfirm,
      onCancel: params.onCancel,
    };
  }

  function closeConfirm(): void {
    confirmDialog.value.open = false;
  }

  // Business Action: Initialize Screen
  async function initScreen(initialLotId?: string): Promise<void> {
    resetState();

    if (initialLotId && initialLotId.trim().length > 0) {
      const cleanLot = initialLotId.trim();
      lotId.value = cleanLot;
      dummyMode.value = 'F';
      restartMode.value = 'F';
      isLotNoDisabled.value = true;
      isStartBtnDisabled.value = true;
      isRestartBtnDisabled.value = true;

      await fetchLotDetails(cleanLot);
    } else {
      dummyMode.value = 'NONLOT';
      restartMode.value = 'F';
      isLotNoDisabled.value = true;
      isStartBtnDisabled.value = true;
      isRestartBtnDisabled.value = true;
    }
  }

  // Fetch LOT Info
  async function fetchLotDetails(targetLotId: string): Promise<void> {
    isLoading.value = true;
    try {
      const res = await remoteFurnaceService.fetchLotInfo(
        targetLotId,
        mainStore.facility,
        mainStore.operatorId,
      );

      if (!res.ok || !res.data) {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, res.message || 'LOT 조회 실패');
        isStartBtnDisabled.value = true;
        return;
      }

      const d = res.data;
      applyLotInfo(d);

      // Validation Rules
      if (d.measType) {
        if (!d.samplingMsg) {
          if (d.samplingReason === 'Y') {
            showAlert('검사대상', 'UV검사 대상 Lot 입니다.');
          } else {
            showAlert('검사대상', `${d.measType} 검사 대상 Lot 입니다.`);
          }
        } else {
          showAlert('검사대상', `동일한 Batch에 검사대상 Lot이 있습니다.\n${d.samplingMsg}`);
        }
      }

      if (d.measOperationName && d.fqcLotName) {
        showAlert('검사대상', `${d.fqcLotName} 은 공정이물 검사 대상 Lot 입니다.`);
      }

      if (d.measOperationName && d.ficdLot) {
        showAlert('검사대상', `${d.ficdLot} 은 FICD검사 대상 Lot 입니다.`);
      }

      if (d.etcMsg) {
        showAlert('정보', d.etcMsg);
      }

      if (d.status === 'RUN') {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '이미 MOVE IN된 LOT입니다.');
        isStartBtnDisabled.value = true;
        return;
      }

      if (d.state !== 'WIP') {
        showAlert(
          COMMON_FIELD.TXTDIALOGTITLE_ERROR,
          `${d.state} 상태 입니다. 작업예약을 할 수 없습니다.`,
        );
        isStartBtnDisabled.value = true;
        return;
      }

      if (d.holdStatus === 'ONHOLD') {
        showAlert(
          COMMON_FIELD.TXTDIALOGTITLE_ERROR,
          'HOLD된 LOT입니다. 작업예약을 할 수 없습니다.',
        );
        isStartBtnDisabled.value = true;
        return;
      }

      if (d.inlineSampleMessage) {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_OK, d.inlineSampleMessage);
      }

      if (d.processName === 'MW_TEST' && d.batchId) {
        dummyMode.value = 'T';
      }

      if (!d.batchId || d.batchId.trim().length === 0) {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_OK, 'Batch 생성 후 LOT을 다시 조회하여 주세요');
        return;
      }

      // Fetch batch lots
      await fetchBatchLotList(targetLotId, recipe.value);

      // Check Reservation state
      if (d.lotResUser && d.lotResUser.trim().length > 0) {
        restartMode.value = 'T';
        isMachineDisabled.value = true;
        isRecipeDisabled.value = true;
        isPortDisabled.value = true;
        isStartBtnDisabled.value = true;
        processingMachine.value = d.machineName;

        await handleProcessingMachineInput(d.machineName);

        if (d.portName) {
          selectedPort.value = d.portName;
        }

        if (d.machineRecipeName) {
          recipeOptions.value = [d.machineRecipeName];
          selectedRecipe.value = d.machineRecipeName;
        }
      }
    } finally {
      isLoading.value = false;
    }
  }

  function applyLotInfo(d: RemoteFurnaceLotInfo): void {
    batchId.value = (d.batchId || '').replace(/\s+/g, '');
    recipe.value = d.recipe || '';
    isRecipeChanged.value = Boolean(d.changeRecipe && d.changeRecipe !== d.recipe);

    if (d.changeEqpGroup && d.changeEqpGroup !== standardMachine.value) {
      standardMachine.value = d.changeEqpGroup;
      isStandardMachineChanged.value = true;
    } else {
      standardMachine.value = d.eqpGroup || '';
      isStandardMachineChanged.value = false;
    }

    operation.value = d.operation || '';
    subOperation.value = d.subOperation || '';
    product.value = d.product || '';
    processStep.value = d.processStep || '';
    operSeq.value = d.operSequence || '';
    area.value = d.area || '';
    opType.value = d.opType || '';
    exMachine.value = d.oxMachine || '';
  }

  // Fetch Batch List
  async function fetchBatchLotList(targetLotId: string, currentRecipe: string): Promise<void> {
    const res = await remoteFurnaceService.fetchBatchListByLot(
      targetLotId,
      mainStore.facility,
      currentRecipe,
      dummyMode.value,
    );

    if (!res.ok || !res.data) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, res.message || 'BATCHLISTBYLOT 조회 실패');
      return;
    }

    batchLots.value = res.data.items;

    if (batchLots.value.length === 0) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'MOVE IN할 LOT이 없습니다.');
      return;
    }

    if (res.data.unreadCommentQty > 0) {
      showAlert(
        COMMON_FIELD.TXTDIALOGTITLE_INFORM,
        '작업성 COMMENT가 있습니다.\n읽은후 진행하세요',
      );
    }
  }

  // Processing Machine Input Handler
  async function handleProcessingMachineInput(machineId: string): Promise<void> {
    const targetId = machineId.trim();
    if (!targetId) {
      processingMachine.value = '';
      return;
    }

    await loadMachineInfo(targetId);
  }

  // Load Machine Info & Related Equipment Details
  async function loadMachineInfo(parsedId: string): Promise<void> {
    processingMachine.value = parsedId;
    isLoading.value = true;

    try {
      const res = await remoteFurnaceService.fetchRemoteEqpInfo(parsedId);
      if (!res.ok || !res.data) {
        showAlert(
          COMMON_FIELD.TXTDIALOGTITLE_ERROR,
          res.message || '장비 정보를 가져올 수 없습니다.',
        );
        superEqpId.value = '';
        eqpArea.value = '';
        eqpType.value = '';
        processingMachine.value = '';
        return;
      }

      const eqpData = res.data;
      superEqpId.value = eqpData.mainEqpId;
      mainEqpId.value = eqpData.procEqpId;
      eqpArea.value = eqpData.eqpArea;
      eqpType.value = eqpData.eqpType;

      if (eqpData.pmMessage) {
        showAlert('PM주기 경고', eqpData.pmMessage);
      }

      if (eqpData.cycleMessage) {
        const cycles = eqpData.cycleMessage.split('/');
        for (const cycle of cycles) {
          if (cycle.trim()) {
            showAlert('계측 주기 알림', cycle.trim());
          }
        }
      }

      // Populate ports
      if (eqpData.portName) {
        portOptions.value = eqpData.portName
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);
        if (portOptions.value.length > 0) {
          selectedPort.value = portOptions.value[0];
          await updatePortStatus();
        }
      }

      // Check standard machine validity in production mode
      if (dummyMode.value === 'F' && standardMachine.value) {
        const targetMach = eqpData.procEqpId || parsedId;
        if (!validateEquipment(standardMachine.value, targetMach)) {
          showAlert(
            COMMON_FIELD.TXTDIALOGTITLE_ERROR,
            `[${targetMach}]장비가 기준장비에 존재하지 않습니다.`,
          );
          processingMachine.value = '';
          return;
        }
      }

      // Fetch recipe options
      if (dummyMode.value === 'F') {
        await fetchRecipeForLot();
      } else {
        await fetchDummyRecipes();
      }
    } finally {
      isLoading.value = false;
    }
  }

  // Fetch Recipe for Lot
  async function fetchRecipeForLot(): Promise<void> {
    const res = await remoteFurnaceService.fetchRecipeInfo(
      lotId.value,
      operation.value,
      subOperation.value,
      product.value,
      superEqpId.value,
      opType.value,
      mainStore.facility,
      dummyMode.value,
    );

    if (!res.ok || !res.data) {
      if (res.message === '현재 장비 상태가 비부하DOWN 입니다.') {
        showConfirm({
          title: COMMON_FIELD.TXTDIALOGTITLE_OK,
          message:
            '현재 장비 상태가 가동중(RUN)이 아닙니다.\n장비 상태를 가동중(RUN)으로 변경 하시겠습니까?',
          confirmText: COMMON_FIELD.BTNYESSTR,
          cancelText: COMMON_FIELD.BTNNOSTR,
          onConfirm: () => {
            void handleEquipmentStatusChange();
          },
        });
      } else {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, res.message || 'RECIPEINFO 조회 실패');
      }
      return;
    }

    const { recipe: rcpId, etchMessage, multiMoveInAction } = res.data;

    if (etchMessage) {
      showConfirm({
        title: COMMON_FIELD.TXTDIALOGTITLE_OK,
        message: etchMessage,
        confirmText: COMMON_FIELD.BTNYESSTR,
        cancelText: COMMON_FIELD.BTNNOSTR,
        onCancel: () => {
          processingMachine.value = '';
        },
      });
    }

    if (multiMoveInAction) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_WARNING, multiMoveInAction);
    }

    recipe.value = rcpId;
    recipeOptions.value = rcpId ? [rcpId] : [];
    selectedRecipe.value = rcpId;

    if (selectedRecipe.value) {
      await checkInterlock();
    }
  }

  async function handleEquipmentStatusChange(): Promise<void> {
    isLoading.value = true;
    try {
      const res = await remoteFurnaceService.changeEquipmentStatus(
        superEqpId.value,
        mainStore.facility,
        mainStore.operatorId,
        mainStore.operatorName,
      );

      if (res.ok) {
        showConfirm({
          title: COMMON_FIELD.TXTDIALOGTITLE_OK,
          message: '장비상태가 변경되었습니다.\n진행장비의 RECIPE를 다시 요청 하시겠습니까?',
          confirmText: COMMON_FIELD.BTNYESSTR,
          cancelText: COMMON_FIELD.BTNNOSTR,
          onConfirm: () => {
            void fetchRecipeForLot();
          },
        });
      } else {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, res.message || '장비 상태 변경 실패');
      }
    } finally {
      isLoading.value = false;
    }
  }

  // Fetch Dummy Recipes
  async function fetchDummyRecipes(): Promise<void> {
    const res = await remoteFurnaceService.fetchDummyRecipeInfo(superEqpId.value);
    if (!res.ok || !res.data || res.data.length === 0) {
      showAlert(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        '진행 가능한 Recipe가 없어 작업예약을 할 수 없습니다.',
      );
      recipeOptions.value = [];
      selectedRecipe.value = '';
      return;
    }
    recipeOptions.value = res.data;
    selectedRecipe.value = res.data[0] || '';
  }

  // Update Port Status
  async function updatePortStatus(): Promise<void> {
    if (!selectedPort.value || !superEqpId.value) return;

    isLoading.value = true;
    try {
      const res = await remoteFurnaceService.fetchMachinePortStatus(
        superEqpId.value,
        selectedPort.value,
        lotId.value,
        selectedRecipe.value,
      );

      if (!res.ok || !res.data) {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, res.message || 'MACHINEPORTSTATUS 조회 실패');
        return;
      }

      const d = res.data;
      portState.value = d.portState;
      portLotName.value = d.portLotName;

      evaluatePortButtonState(d.portState, d.portLotName, d.ackMsg);
    } finally {
      isLoading.value = false;
    }
  }

  function evaluatePortButtonState(stateStr: string, portLot: string, ackMsg: string): void {
    isClearPortDisabled.value = false;

    if (stateStr === 'RUN' || stateStr === 'RESERVED') {
      showAlert(
        '장비 MASSAGE',
        '해당 PORT가 진행중입니다.\n장비 및 진행할 LOT을 다시 확인 바랍니다.',
      );
      isStartBtnDisabled.value = true;
      isRestartBtnDisabled.value = true;
      if (ackMsg) {
        showAlert('PORT WORNING', ackMsg);
      }
    } else if (!stateStr) {
      showAlert('장비 MASSAGE', 'PORT 정보를 가져올 수 없습니다.\n잠시후 다시 확인 바랍니다.');
      isStartBtnDisabled.value = true;
      isRestartBtnDisabled.value = true;
      isClearPortDisabled.value = true;
    } else if (stateStr === 'PENDING') {
      if (dummyMode.value === 'NONLOT') {
        isStartBtnDisabled.value = false;
        isRestartBtnDisabled.value = false;
      } else {
        isStartBtnDisabled.value = true;
        isRestartBtnDisabled.value = batchId.value !== portLot;
      }
    } else if (stateStr === 'INIT') {
      isStartBtnDisabled.value = true;
      isRestartBtnDisabled.value = dummyMode.value !== 'NONLOT';
    } else {
      isStartBtnDisabled.value = false;
      isRestartBtnDisabled.value = dummyMode.value !== 'NONLOT';
    }
  }

  // Clear Port
  function requestClearPort(): void {
    if (!selectedPort.value) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '진행 Port를 먼저 선택하세요.');
      return;
    }

    showConfirm({
      title: COMMON_FIELD.TXTDIALOGTITLE_OK,
      message: `PORT [${selectedPort.value}]을(를) 초기화 하고 [IDLE]상태로 바꾸시겠습니까?`,
      confirmText: COMMON_FIELD.BTNYESSTR,
      cancelText: COMMON_FIELD.BTNNOSTR,
      onConfirm: () => {
        void (async () => {
          isLoading.value = true;
          try {
            const res = await remoteFurnaceService.clearMachinePort(
              superEqpId.value,
              selectedPort.value,
            );
            if (res.ok) {
              showAlert('PORT 초기화', '해당 PORT 초기화 명령을 전송하였습니다.');
              await updatePortStatus();
            } else {
              showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, res.message || 'PORT 초기화 실패');
            }
          } finally {
            isLoading.value = false;
          }
        })();
      },
    });
  }

  // Interlock Check
  async function checkInterlock(): Promise<void> {
    if (dummyMode.value === 'T' || dummyMode.value === 'NONLOT' || restartMode.value === 'T') {
      return;
    }

    const sLotList = batchLots.value
      .map((l) => l.lotId)
      .filter(Boolean)
      .join(',');
    const res = await remoteFurnaceService.checkFurnaceInterlock(
      processingMachine.value,
      batchId.value,
      selectedRecipe.value,
      sLotList,
    );

    if (res.ok && res.data) {
      if (res.data.ret) {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, res.data.ret);
      }
      if (res.data.intlk === 'Y') {
        isInterlocked.value = true;
        isStartBtnDisabled.value = true;
        isRestartBtnDisabled.value = true;
      } else {
        isInterlocked.value = false;
      }
    }
  }

  // Select Row & Pass Data to Comment List
  function setSelectedLot(item: BatchLotItem): void {
    selectedLot.value = item;
    commentLotContext.value = item;
  }

  // Start & Restart Validation & Launch Dialog
  async function triggerStartAction(): Promise<boolean> {
    if (!processingMachine.value) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '진행장비를 입력하세요.');
      return false;
    }
    if (!selectedRecipe.value) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '진행 Rcp를 선택하세요.');
      return false;
    }

    if (dummyMode.value === 'F') {
      let validCount = 0;
      for (const row of batchLots.value) {
        const sLotNo = row.lotId;
        if (sLotNo && sLotNo !== 'D/W') {
          // Check comment
          const commentRes = await remoteFurnaceService.checkLotComment(sLotNo, mainStore.facility);
          if (!commentRes.ok) {
            showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, commentRes.message || 'LOTINFO 조회 실패');
            return false;
          }
          if ((commentRes.data || 0) > 0) {
            showAlert(
              COMMON_FIELD.TXTDIALOGTITLE_ERROR,
              `[${sLotNo}] 읽지 않은 작업성 COMMENT가 [${commentRes.data}]가 있습니다.\n읽은후 진행하세요.`,
            );
            return false;
          }

          if (row.lotState !== 'WIP') {
            showAlert(
              COMMON_FIELD.TXTDIALOGTITLE_ERROR,
              `[${sLotNo}]는 [${row.lotState}]상태로\nMOVE IN할수 없습니다.`,
            );
            return false;
          }

          if (row.status !== 'WAIT') {
            showAlert(
              COMMON_FIELD.TXTDIALOGTITLE_ERROR,
              `[${sLotNo}]는 WAIT상태가 아닙니다.\nMOVE IN할수 없습니다.`,
            );
            return false;
          }

          validCount++;
        }
      }

      if (validCount <= 0) {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'MOVE IN할 LOT이 없습니다.');
        return false;
      }
    }

    // Open Recipe Dialog
    recipeDialog.value = {
      open: true,
      recipeList: selectedRecipe.value,
      lotNo: lotId.value,
      action: 'START',
    };
    return true;
  }

  function triggerRestartAction(): boolean {
    if (!processingMachine.value) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '진행장비를 입력하세요.');
      return false;
    }
    if (!selectedRecipe.value) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '진행 Rcp를 선택하세요.');
      return false;
    }

    recipeDialog.value = {
      open: true,
      recipeList: selectedRecipe.value,
      lotNo: lotId.value,
      action: 'RESTART',
    };
    return true;
  }

  // Submit Remote Start / Restart
  async function submitRemoteExecution(): Promise<boolean> {
    isLoading.value = true;
    recipeDialog.value.open = false;

    const cmdType = recipeDialog.value.action === 'START' ? 'S' : 'R';
    let lotList = '';

    if (dummyMode.value !== 'NONLOT') {
      lotList = batchLots.value.map((l) => `'${l.lotId}'`).join(',');
    }

    try {
      const res = await remoteFurnaceService.startRemoteFurnace({
        machineName: processingMachine.value,
        remoteBatch: batchId.value,
        recipeName: selectedRecipe.value,
        eventUser: mainStore.operatorId,
        portName: selectedPort.value,
        cmdType,
        lotList,
        dummyMode: dummyMode.value,
        lotName: lotId.value,
        chkNoBatch: 'F',
      });

      if (res.ok) {
        return true;
      } else {
        showAlert(
          COMMON_FIELD.TXTDIALOGTITLE_ERROR,
          res.message || '명령 전송에 실패하였습니다.',
          true,
        );
        return false;
      }
    } finally {
      isLoading.value = false;
    }
  }

  function resetState(): void {
    lotId.value = '';
    batchId.value = '';
    recipe.value = '';
    isRecipeChanged.value = false;
    selectedRecipe.value = '';
    recipeOptions.value = [];
    standardMachine.value = '';
    isStandardMachineChanged.value = false;
    processingMachine.value = '';
    exMachine.value = '';
    selectedPort.value = '';
    portOptions.value = [];
    portState.value = '';
    portLotName.value = '';
    superEqpId.value = '';
    mainEqpId.value = '';
    eqpArea.value = '';
    eqpType.value = '';
    operation.value = '';
    subOperation.value = '';
    product.value = '';
    processStep.value = '';
    operSeq.value = '';
    area.value = '';
    opType.value = '';
    batchLots.value = [];
    selectedLot.value = null;
    dummyMode.value = 'F';
    restartMode.value = 'F';
    isLoading.value = false;
    isInterlocked.value = false;
    isLotNoDisabled.value = true;
    isMachineDisabled.value = false;
    isPortDisabled.value = false;
    isRecipeDisabled.value = false;
    isClearPortDisabled.value = true;
    isStartBtnDisabled.value = true;
    isRestartBtnDisabled.value = true;
    commentLotContext.value = null;
  }

  return {
    // State
    lotId,
    batchId,
    recipe,
    isRecipeChanged,
    selectedRecipe,
    recipeOptions,
    standardMachine,
    isStandardMachineChanged,
    processingMachine,
    exMachine,
    selectedPort,
    portOptions,
    portState,
    portLotName,
    superEqpId,
    mainEqpId,
    batchLots,
    selectedLot,
    dummyMode,
    restartMode,
    isLoading,
    isInterlocked,
    isLotNoDisabled,
    isMachineDisabled,
    isPortDisabled,
    isRecipeDisabled,
    isClearPortDisabled,
    isStartBtnDisabled,
    isRestartBtnDisabled,
    alertDialog,
    confirmDialog,
    recipeDialog,
    commentLotContext,

    // Computed
    portStatusKind,
    startButtonLabel,
    restartButtonLabel,

    // Actions
    initScreen,
    fetchLotDetails,
    handleProcessingMachineInput,
    loadMachineInfo,
    updatePortStatus,
    evaluatePortButtonState,
    requestClearPort,
    checkInterlock,
    setSelectedLot,
    triggerStartAction,
    triggerRestartAction,
    submitRemoteExecution,
    showAlert,
    closeAlert,
    showConfirm,
    closeConfirm,
    resetState,
  };
});
