import { useMainStore } from 'src/features/main/stores/main.store';
import responseParser from 'src/services/response-parser';
import { barcodeStyleEqpId, barcodeStyleProbeCardId } from 'src/utils/barcode-style';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { MOVE_IN_DIALOG, MOVE_IN_FLOW, MOVE_IN_UI } from '../constants';
import * as moveinService from '../services/movein.service';
import type { InlineResult } from '../types/move-in-inline.types';
import { useConfirmModal } from './useConfirmModal';

export interface MoveInResult {
  success: boolean;
  blocked?: boolean;
  blockerReason?: string;
  details?: unknown;
  responses?: unknown[];
}

interface MoveInWarnings {
  ficdChamber: string;
  cumulativeCycle: string;
  cumulativeCycleQty: string;
  etchRework: string;
}

interface InspectionWarnings {
  macro: string;
  scope: string;
  cd: string;
  overlay: string;
}

export interface InlineActivityResult {
  eqpGroup?: string;
  eqpId?: string;
  recipe?: string;
  commentQty?: string;
  nrwCmtCount?: string;
  nest?: string;
  identCode?: string;
  maskTag?: string;
  EQPGROUP?: string;
  EQPID?: string;
  RECIPE?: string;
  COMMENTQTY?: string;
  NRWCMTCOUNT?: string;
  NEST?: string;
  ITDENTCODE?: string;
  MASKTAG?: string;
}

export interface ProcessInquireResult {
  FINISH?: string;
  CURRENTSTEP?: string;
  RECIPE?: string;
  EQPGROUP?: string;
  CHANGEEQPGROUP?: string;
  PROCESSSTEP?: string;
  COMMENTQTY?: string;
  NRWCMTCOUNT?: string;
  NRWCOMMENTQTY?: string;
  SUBOPERATION?: string;
  SCOPESUB?: string;
}

export function useMoveIn() {
  const mainStore = useMainStore();
  const router = useRouter();
  const route = useRoute();
  const { alert: showAlert, confirm: showConfirm } = useConfirmModal();

  /* ------------------------------------------------------------------ */
  /* LOT identity                                                        */
  /* ------------------------------------------------------------------ */
  const lotId = ref<string>('');
  const batchId = ref<string>('');
  const batchBtnEnabled = ref(false);

  /* ------------------------------------------------------------------ */
  /* Recipe                                                              */
  /* ------------------------------------------------------------------ */
  const recipeText = ref<string>('');
  const selectedRecipe = ref<string | undefined>(undefined);
  const recipeItems = ref<{ label: string; value: string }[]>([]);
  const recipeChanged = ref(false);

  /* ------------------------------------------------------------------ */
  /* Equipment                                                           */
  /* ------------------------------------------------------------------ */
  const eqpId = ref<string>('');
  const standardMachine = ref<string>('');
  const standardMachineChanged = ref(false);
  const exMachine = ref<string>('');
  const mainEqpId = ref<string>('');

  /* ------------------------------------------------------------------ */
  /* LOT info (read-only)                                                */
  /* ------------------------------------------------------------------ */
  const product = ref<string>('');
  const productCode = ref<string>('');
  const productDisplay = computed(() =>
    product.value || productCode.value ? `${product.value}(${productCode.value})` : '',
  );
  const currentOperation = ref<string>('');
  const engineer = ref<string>('');
  const customer = ref<string>('');
  const quantity = ref<string>('');
  const goodChips = ref<string>('');
  const commentSize = ref<string>('0');
  const comment = ref<string>('');
  const unreadCommentCount = ref(0);

  /* ------------------------------------------------------------------ */
  /* Probe card                                                          */
  /* ------------------------------------------------------------------ */
  const probeCard = ref<string>('');
  const probeOD = ref<string>('');
  const probeZ = ref<string>('');
  const probeCardEnabled = ref(false);
  const probeCardId = ref<string>('');
  const identCodeList = ref('');
  const reticleId = ref('');

  /* ------------------------------------------------------------------ */
  /* Wafer selection                                                     */
  /* ------------------------------------------------------------------ */
  const waferDialogOpen = ref(false);
  const waferOptions = ref<string[]>([]);
  const selectedWafers = ref<string[]>([]);
  const waferMachines = ref<Record<string, string>>({});
  const machineSearchId = ref('');
  const countName = ref('');

  /* ------------------------------------------------------------------ */
  /* Skip / flags                                                        */
  /* ------------------------------------------------------------------ */
  const skipCurrentOperation = ref(false);
  const isSkipAllowed = ref(false);
  const reworkSkip = ref(false);

  /* ------------------------------------------------------------------ */
  /* Process meta                                                        */
  /* ------------------------------------------------------------------ */
  const operation = ref<string>('');
  const subOperation = ref<string>('');
  const processStep = ref<string>('');
  const opType = ref<string>('');
  const area = ref<string>('');
  const processType = ref<string>('');
  const autoMotiveFlag = ref<string>('');
  const createCategory = ref<string>('');
  const scopeSub = ref<string>('');
  const operSeq = ref<string>('');

  /* ------------------------------------------------------------------ */
  /* Recipe warning placeholders                                         */
  /* ------------------------------------------------------------------ */
  const overlayMessage = ref('');
  const edgeFar = ref('');
  const pendingWarnings = ref<MoveInWarnings>({
    ficdChamber: '',
    cumulativeCycle: '',
    cumulativeCycleQty: '',
    etchRework: '',
  });
  const inspectionWarnings = ref<InspectionWarnings>({
    macro: '',
    scope: '',
    cd: '',
    overlay: '',
  });

  /* ------------------------------------------------------------------ */
  /* Loading / error                                                     */
  /* ------------------------------------------------------------------ */
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isLotBlocked = ref(false);

  const whLabel = computed(() => {
    if (createCategory.value === 'COUNT') return MOVE_IN_UI.buttons.count;
    if (createCategory.value === 'SLOT') return MOVE_IN_UI.buttons.slot;
    return MOVE_IN_UI.buttons.wh;
  });

  const readBtnEnabled = computed(() => Number(commentSize.value) > 0);
  const okEnabled = computed(() => !loading.value && !isLotBlocked.value);

  function alertError(msg: string): void {
    void showAlert(msg, MOVE_IN_DIALOG.titleError);
  }

  async function alertNotice(message: string, title: string): Promise<void> {
    await showAlert(message, title);
  }

  function confirmAction(message: string): Promise<boolean> {
    return showConfirm(message, MOVE_IN_DIALOG.titleOk);
  }

  function resetRecipe(): void {
    recipeText.value = '';
    recipeChanged.value = false;
    selectedRecipe.value = undefined;
    recipeItems.value = [];
  }

  function resetEqp(): void {
    eqpId.value = '';
    resetRecipe();
  }

  function resetProbeCard(): void {
    probeCard.value = '';
    probeOD.value = '';
    probeZ.value = '';
    probeCardId.value = '';
    probeCardEnabled.value = processType.value === 'WT' || processType.value === 'PCM';
  }

  function setRecipeOptions(items: string[]): void {
    recipeItems.value = items.map((item) => ({ label: item, value: item }));
    if (items.length > 0) {
      selectedRecipe.value = items[0];
    }
  }

  /* ------------------------------------------------------------------ */
  /* LOTINFO (MVIN)                                                      */
  /* ------------------------------------------------------------------ */
  async function getLotInfo(): Promise<void> {
    if (!lotId.value) return;

    loading.value = true;
    error.value = null;
    isLotBlocked.value = false;
    recipeChanged.value = false;
    standardMachineChanged.value = false;

    try {
      const raw = await moveinService.sendLotInfo(
        lotId.value,
        mainStore.facility,
        'MVIN',
        mainStore.operatorId,
      );
      const parsed = responseParser.parseResponseData(raw);
      loading.value = false;

      if (!parsed.isSuccess) {
        const msg = responseParser.getErrorMessage(raw);
        error.value = msg;
        alertError(msg);
        return;
      }

      const b = parsed.messageBody;

      /* map fields */
      product.value = b.PRODUCT ?? '';
      productCode.value = b.JOBCODE ?? '';
      operation.value = b.OPERATION ?? '';
      subOperation.value = b.SUBOPERATION ?? '';
      processStep.value = b.PROCESSSTEP ?? '';
      currentOperation.value =
        processStep.value && (operation.value || subOperation.value)
          ? `${processStep.value}(${operation.value}${subOperation.value})`
          : processStep.value;
      opType.value = b.OPTYPE ?? '';
      area.value = b.AREA ?? '';
      customer.value = b.CUSTOMER ?? '';
      engineer.value = b.ENGINEER ?? '';
      quantity.value = b.QUANTITY ?? '';
      goodChips.value = b.GOODCHIPS ?? '';
      recipeText.value = b.RECIPE ?? '';
      standardMachine.value = b.EQPGROUP ?? '';
      batchId.value = (b.BATCHID ?? '').replace(/\s/g, '');
      exMachine.value = b.OXMACHINE ?? '';
      commentSize.value = b.COMMENTQTY ?? '0';
      processType.value = b.PROCESSTYPE ?? '';
      autoMotiveFlag.value = b.AUTOMOTIVEFLAG ?? '';
      createCategory.value = b.CREATECATEGORY ?? '';
      scopeSub.value = b.SCOPESUB ?? '';
      operSeq.value = b.OPERSEQUENCE ?? '';

      const changeEqpGroup = b.CHANGEEQPGROUP ?? '';
      const changeRecipe = b.CHANGERECIPE ?? '';
      const nwrCmtCount = Number(b.NWCOMMENTQTY ?? '0');

      recipeChanged.value = Boolean(changeRecipe && changeRecipe !== recipeText.value);

      if (changeEqpGroup && changeEqpGroup !== standardMachine.value) {
        standardMachine.value = changeEqpGroup;
        standardMachineChanged.value = true;
      }

      if (createCategory.value === 'COUNT' || createCategory.value === 'SLOT') {
        comment.value = b.LASTEVENTCOMMENT ?? '';
      }

      /* skip flags */
      const skipAllowFlag = b.SKIPALLOWFLAG ?? '';
      const autoSkip = b.AUTOSKIP ?? '';
      const pqcSkip = b.PQCSKIPUSER ?? '';
      const photoType = b.PHOTOTYPE ?? '';
      const reworkSkipFlag = b.REWORKSKIPFLAG ?? '';
      const sortingSkipFlag = b.SORTINGSKIP ?? '';
      const reworkScrubberSkipFlag = b.REWORKSCRUBBERSKIPFLAG ?? '';
      const measSkip = b.MEASSKIPCHECK ?? '';

      isSkipAllowed.value = false;
      skipCurrentOperation.value = false;
      reworkSkip.value = false;

      if (skipAllowFlag === 'Y') {
        isSkipAllowed.value = true;
        if (autoSkip === 'Y') {
          skipCurrentOperation.value = true;
          isSkipAllowed.value = pqcSkip === 'Y';
        } else if (autoSkip === 'N') {
          isSkipAllowed.value = pqcSkip === 'Y';
        }
        if (photoType === 'DI') {
          isSkipAllowed.value = true;
        }
      } else if (skipAllowFlag === 'N') {
        isSkipAllowed.value = pqcSkip === 'Y';
      }

      if (reworkSkipFlag === 'Y' || sortingSkipFlag === 'Y') {
        isSkipAllowed.value = true;
        skipCurrentOperation.value = true;
        reworkSkip.value = true;
      }

      if (reworkScrubberSkipFlag === 'N') {
        isSkipAllowed.value = false;
        skipCurrentOperation.value = false;
        reworkSkip.value = false;
      }

      if (pqcSkip === 'N' && area.value === 'PQC') {
        skipCurrentOperation.value = false;
        isSkipAllowed.value = false;
      }

      if (measSkip === 'N') {
        skipCurrentOperation.value = false;
        isSkipAllowed.value = false;
      }

      batchBtnEnabled.value = batchId.value !== '';

      if (recipeText.value) {
        setRecipeOptions([recipeText.value]);
      } else {
        resetRecipe();
      }

      resetProbeCard();

      /* status checks */
      const lotStatus = b.STATUS ?? '';
      const lotState = b.STATE ?? '';
      const holdStatus = b.HOLDSTATUS ?? '';
      const bakeCheck = b.BAKECHECK ?? '';
      const processName = b.PROCESSNAME ?? '';

      if (lotStatus === 'RUN') {
        isLotBlocked.value = true;
        alertError(MOVE_IN_UI.errors.alreadyMovedIn);
        return;
      }
      if (lotState !== 'WIP') {
        isLotBlocked.value = true;
        alertError(`${lotState} ${MOVE_IN_UI.errors.cannotMoveIn}`);
        return;
      }
      if (holdStatus === 'ONHOLD') {
        isLotBlocked.value = true;
        alertError(MOVE_IN_UI.errors.onHold);
        return;
      }
      if (processName === 'MW_TEST' && batchId.value) {
        isLotBlocked.value = true;
        alertError(MOVE_IN_UI.errors.dummyTestBatch);
        return;
      }
      if (bakeCheck === 'Y') {
        isLotBlocked.value = true;
        alertError(`${lotId.value} ${MOVE_IN_UI.errors.bakeCheckRequired}`);
        return;
      }

      /* optional messages */
      const etcMsg = b.ETCMSG ?? '';
      if (etcMsg) await alertNotice(etcMsg, MOVE_IN_DIALOG.titleError);

      const inlineSample = b.INLINESAMPLEMESSGE ?? '';
      if (inlineSample) await alertNotice(inlineSample, MOVE_IN_DIALOG.titleError);

      const goxPopup = b.GOXIDEPOPUP ?? '';
      if (goxPopup) await alertNotice(goxPopup, MOVE_IN_DIALOG.titleError);

      const measType = b.MEASTYPE ?? '';
      const samplingReason = b.SAMPLINGREASON ?? '';
      const samplingMsg = b.SAMPLINGMSG ?? '';
      if (measType) {
        if (samplingMsg) {
          await alertNotice(
            `${MOVE_IN_UI.alerts.samplingBatch}\n${samplingMsg}`,
            MOVE_IN_UI.noticeTitles.inspectionTarget,
          );
        } else if (samplingReason === 'Y') {
          await alertNotice(
            MOVE_IN_UI.alerts.uvInspection,
            MOVE_IN_UI.noticeTitles.inspectionTarget,
          );
        } else {
          if (measType !== 'LAMU' || samplingReason !== 'EPI_SAMPLING') {
            await alertNotice(
              `${measType} ${MOVE_IN_UI.alerts.inspectionTarget}`,
              MOVE_IN_UI.noticeTitles.inspectionTarget,
            );
          }
        }
      }

      const chamberSlotList = b.CHAMBERSLOTLIST ?? '';
      if (chamberSlotList) {
        await alertNotice(chamberSlotList, MOVE_IN_UI.noticeTitles.chamberSlot);
      }

      const measOper = b.MEASOPERATIONNAME ?? '';
      const fqcLot = b.FQCLOTNAME ?? '';
      const ficdLot = b.FICDLOT ?? '';
      if (measOper && fqcLot) {
        await alertNotice(
          `${fqcLot} ${MOVE_IN_UI.alerts.fqcInspection}`,
          MOVE_IN_UI.noticeTitles.inspectionTarget,
        );
      }
      if (measOper && ficdLot) {
        await alertNotice(
          `${ficdLot} ${MOVE_IN_UI.alerts.ficdInspection}`,
          MOVE_IN_UI.noticeTitles.inspectionTarget,
        );
      }

      /* PHOTO branch */
      if (area.value === 'PHOTO') {
        if (opType.value === 'P' && photoType !== 'NN') {
          openInlineActivity();
          return;
        }
        if (opType.value !== 'P') {
          openProcessInquire();
          return;
        }
      }

      if (nwrCmtCount > 0) {
        alertError(`${MOVE_IN_UI.errors.unreadComment} ${nwrCmtCount}`);
      }
    } catch (err: unknown) {
      loading.value = false;
      const msg = (err as Error).message ?? String(err);
      error.value = msg;
      alertError(msg);
    }
  }

  function openInlineActivity(): void {
    void router.push({
      name: 'move-in-inline',
      params: { lotId: lotId.value },
      query: { lotId: lotId.value, operation: operation.value },
    });
  }

  function openProcessInquire(): void {
    void router.push({
      name: 'move-in-process-inquire',
      params: { lotId: lotId.value },
      query: {
        LOTID: lotId.value,
        OPERATION: operation.value,
        ISSKIP: isSkipAllowed.value ? 'Y' : 'N',
        REWORKSKIP: reworkSkip.value ? 'Y' : 'N',
      },
    });
  }

  function openBatchMoveIn(): void {
    void router.push({
      name: 'move-in-batch-move-in',
      params: { lotId: lotId.value },
      query: {
        batchId: batchId.value,
        lotId: lotId.value,
        eqpId: eqpId.value,
        recipe: recipeText.value || selectedRecipe.value || '',
        isSkip: 'N',
        facility: mainStore.facility,
      },
    });
  }

  async function completeBatchLotList(selectedLotId: string): Promise<void> {
    const nextLotId = selectedLotId.trim();
    if (!nextLotId) return;

    lotId.value = nextLotId;
    await router.replace(moveInRouteLocation());
    await getLotInfo();
  }

  async function completeBatchMoveIn(lotIdFromResult: string): Promise<void> {
    if (lotIdFromResult.trim()) lotId.value = lotIdFromResult.trim();

    // Android finishes Move In after Batch Move In succeeds. The current Vue branch has no
    // migrated eSheet caller to receive the LOTID result, so retain the verified back behavior.
    await router.replace(moveInRouteLocation());
    router.back();
  }

  function openBatchMoveInCommentList(payload: {
    lotId: string;
    operation: string;
    subOperation: string;
    processStep: string;
    operSequence: string;
  }): void {
    void router.push({
      name: 'move-in-comment-list',
      params: { lotId: lotId.value },
      query: { ...payload, facility: mainStore.facility },
    });
  }

  function applyInlineActivityResult(result: InlineActivityResult): void {
    standardMachine.value = result.eqpGroup ?? result.EQPGROUP ?? '';
    eqpId.value = result.eqpId ?? result.EQPID ?? '';
    recipeText.value = result.recipe ?? result.RECIPE ?? '';
    setRecipeOptions(recipeText.value ? [recipeText.value] : []);
    commentSize.value = result.commentQty ?? result.COMMENTQTY ?? '0';
    unreadCommentCount.value = Number(result.nrwCmtCount ?? result.NRWCMTCOUNT ?? '0') || 0;
    comment.value = `NEST : ${result.nest ?? result.NEST ?? ''}`;
    identCodeList.value = result.identCode ?? result.ITDENTCODE ?? '';
    reticleId.value = result.maskTag ?? result.MASKTAG ?? '';
  }

  async function applyProcessInquireResult(result: ProcessInquireResult): Promise<boolean> {
    if (result.FINISH === 'Y') return true;

    const changeEqpGroup = result.CHANGEEQPGROUP ?? result.EQPGROUP ?? '';
    standardMachineChanged.value = Boolean(
      changeEqpGroup && changeEqpGroup !== standardMachine.value,
    );
    if (changeEqpGroup) standardMachine.value = changeEqpGroup;
    if (result.RECIPE) {
      recipeText.value = result.RECIPE;
      setRecipeOptions([result.RECIPE]);
    }
    if (result.CURRENTSTEP) currentOperation.value = result.CURRENTSTEP;
    if (result.PROCESSSTEP) processStep.value = result.PROCESSSTEP;
    if (result.SUBOPERATION) subOperation.value = result.SUBOPERATION;
    if (result.COMMENTQTY !== undefined) commentSize.value = result.COMMENTQTY;
    unreadCommentCount.value = Number(result.NRWCMTCOUNT ?? result.NRWCOMMENTQTY ?? '0') || 0;
    if (result.SCOPESUB) scopeSub.value = result.SCOPESUB;

    await getInspection();
    return false;
  }

  function moveInRouteLocation() {
    return {
      name: 'move-in',
      params: { lotId: lotId.value },
    };
  }

  async function closeProcessInquire(): Promise<void> {
    await router.replace(moveInRouteLocation());
  }

  async function completeProcessInquire(result: ProcessInquireResult): Promise<void> {
    await closeProcessInquire();
    const finished = await applyProcessInquireResult(result);
    if (finished) onCancel();
  }

  async function completeInlineActivity(result: InlineResult): Promise<void> {
    await closeProcessInquire();
    applyInlineActivityResult(result);
    await nextTick();
    document.querySelector<HTMLInputElement>('.move-in-field-equipment input')?.focus();
  }

  async function cancelInlineActivity(): Promise<void> {
    await closeProcessInquire();
    onCancel();
  }

  /* ------------------------------------------------------------------ */
  /* MCFDCEQPINFO                                                        */
  /* ------------------------------------------------------------------ */
  async function getMCFDCMachineinfo(): Promise<void> {
    if (!eqpId.value) return;

    loading.value = true;
    try {
      const raw = await moveinService.sendMcfdcEqpInfo(eqpId.value);
      const parsed = responseParser.parseResponseData(raw);
      loading.value = false;

      if (!parsed.isSuccess) {
        resetEqp();
        const msg = responseParser.getErrorMessage(raw);
        alertError(msg);
        return;
      }

      const status = parsed.messageBody.STATUS ?? '';
      const mainEqp = parsed.messageBody.EQPID ?? '';

      if (status === 'Remote') {
        const ok = await confirmAction(`[${mainEqp}] ${MOVE_IN_UI.alerts.remoteConfirm}`);
        if (!ok) {
          resetEqp();
          return;
        }
      }

      await getMachineInfo();
    } catch (err: unknown) {
      loading.value = false;
      resetEqp();
      alertError((err as Error).message ?? String(err));
    }
  }

  /* ------------------------------------------------------------------ */
  /* EQPINFO                                                             */
  /* ------------------------------------------------------------------ */
  async function getMachineInfo(): Promise<void> {
    mainEqpId.value = eqpId.value;

    /* Skip EQPINFO for specific Fab / PQC / measurement operations */
    const skipEqpInfo =
      opType.value === 'M' ||
      standardMachine.value === 'FAB2' ||
      standardMachine.value === 'FAB5' ||
      standardMachine.value === 'FAB7' ||
      area.value === 'PQC';

    if (skipEqpInfo) {
      await getRecipeInfo();
      return;
    }

    loading.value = true;
    try {
      const raw = await moveinService.sendEqpInfo(eqpId.value, 'MOVEIN', lotId.value);
      const parsed = responseParser.parseResponseData(raw);
      loading.value = false;

      if (!parsed.isSuccess) {
        resetEqp();
        const msg = responseParser.getErrorMessage(raw);
        alertError(msg);
        return;
      }

      const mainEqp = parsed.messageBody.MAINEQPID ?? '';
      const subEqp = parsed.messageBody.SUBEQPID ?? '';
      mainEqpId.value = mainEqp;

      const resolvedMachine = subEqp === mainEqp ? mainEqp : subEqp;
      eqpId.value = resolvedMachine;

      const interLock = parsed.messageBody.CHECKINTERLOCK ?? '';
      if (interLock) alertError(interLock);

      await getRecipeInfo();
    } catch (err: unknown) {
      loading.value = false;
      resetEqp();
      alertError((err as Error).message ?? String(err));
    }
  }

  /* ------------------------------------------------------------------ */
  /* RECIPEINFO                                                          */
  /* ------------------------------------------------------------------ */
  async function getRecipeInfo(): Promise<void> {
    loading.value = true;
    try {
      const raw = await moveinService.sendRecipeInfo(
        'N',
        lotId.value,
        operation.value,
        subOperation.value,
        product.value,
        mainEqpId.value,
        opType.value,
        mainStore.facility,
      );
      const parsed = responseParser.parseResponseData(raw);
      loading.value = false;

      if (!parsed.isSuccess) {
        const msg = responseParser.getErrorMessage(raw);
        if (msg === MOVE_IN_UI.errors.eqpDown) {
          const changeOk = await confirmAction(MOVE_IN_UI.alerts.changeEqpStatusConfirm);
          if (changeOk) await changeEQPStatus();
        } else {
          alertError(msg);
          recipeText.value = '';
        }
        resetRecipe();
        return;
      }

      const b = parsed.messageBody;
      const etchMessage = b.ETCHMESSAGE ?? '';
      const interLock = b.CHECKINTERLOCK ?? '';
      const multiMovein = b.MULTIMOVEINACTION ?? '';
      const recipeId = b.RECIPE ?? '';

      if (etchMessage) {
        const ok = await confirmAction(etchMessage);
        if (!ok) {
          resetEqp();
          return;
        }
      }

      if (interLock) alertError(interLock);
      if (multiMovein) alertError(multiMovein);

      overlayMessage.value = b.OVERLAYMESSAGE ?? '';
      edgeFar.value = b.EDGEFAR ?? '';
      recipeText.value = recipeId;
      setRecipeOptions(recipeId ? [recipeId] : []);
    } catch (err: unknown) {
      loading.value = false;
      resetRecipe();
      alertError((err as Error).message ?? String(err));
    }
  }

  async function changeEQPStatus(): Promise<void> {
    loading.value = true;
    try {
      const raw = await moveinService.sendChangeEqpStatus(
        mainEqpId.value,
        mainStore.facility,
        'R  가동중',
        'RR001',
        'PDA_MVIN_UP',
        mainStore.operatorId,
        '',
        '',
      );
      const parsed = responseParser.parseResponseData(raw);
      loading.value = false;

      if (!parsed.isSuccess) {
        alertError(responseParser.getErrorMessage(raw));
        return;
      }

      const retry = await confirmAction(MOVE_IN_UI.alerts.retryRecipe);
      if (retry) await getRecipeInfo();
    } catch (err: unknown) {
      loading.value = false;
      alertError((err as Error).message ?? String(err));
    }
  }

  /* ------------------------------------------------------------------ */
  /* LOGINUSERCHECK                                                      */
  /* ------------------------------------------------------------------ */
  async function loginUserCheck(): Promise<void> {
    if (!eqpId.value) {
      alertError(MOVE_IN_UI.errors.enterEquipment);
      return;
    }

    loading.value = true;
    try {
      const raw = await moveinService.sendLoginUserCheck(
        mainStore.operatorId,
        eqpId.value,
        autoMotiveFlag.value,
      );
      const parsed = responseParser.parseResponseData(raw);
      loading.value = false;

      if (!parsed.isSuccess) {
        alertError(responseParser.getErrorMessage(raw));
        return;
      }

      const areaCheck = parsed.messageBody.AREACHECK ?? '';
      if (areaCheck === 'N' || areaCheck === '') {
        alertError(MOVE_IN_UI.errors.userNotAllowed);
        return;
      }

      await getLotInfoOk();
    } catch (err: unknown) {
      loading.value = false;
      alertError((err as Error).message ?? String(err));
    }
  }

  /* ------------------------------------------------------------------ */
  /* LOTINFO before move-in                                              */
  /* ------------------------------------------------------------------ */
  async function getLotInfoOk(): Promise<void> {
    if (!eqpId.value) {
      alertError(MOVE_IN_UI.errors.enterEquipment);
      return;
    }
    if (!recipeText.value && !selectedRecipe.value) {
      alertError(MOVE_IN_UI.errors.selectRecipe);
      return;
    }

    loading.value = true;
    try {
      const raw = await moveinService.sendMoveInLotInfo(
        lotId.value,
        mainStore.facility,
        eqpId.value,
        'MVIN',
        operation.value,
        subOperation.value,
        batchId.value,
        recipeText.value || selectedRecipe.value || '',
      );
      const parsed = responseParser.parseResponseData(raw);
      loading.value = false;

      if (!parsed.isSuccess) {
        alertError(responseParser.getErrorMessage(raw));
        return;
      }

      const b = parsed.messageBody;
      pendingWarnings.value = {
        ficdChamber: b.FICDCHMBER ?? '',
        cumulativeCycle: b.CUMCYCLE ?? '',
        cumulativeCycleQty: b.CUMCYCLEQTY ?? '',
        etchRework: b.ETCHREWORKMSG ?? '',
      };
      const nwCommentQty = Number(b.NWCOMMENTQTY ?? '0');
      const multiMoveMsg = b.MULTIMOVEINMSG ?? '';

      if (nwCommentQty > 0) {
        alertError(`${MOVE_IN_UI.errors.unreadComment} ${nwCommentQty}`);
        return;
      }

      if (batchId.value && multiMoveMsg) {
        alertError(multiMoveMsg);
      }

      const recipeDisplay =
        `${recipeText.value || selectedRecipe.value || ''} ${overlayMessage.value}`.trim();
      const confirmed = await confirmAction(
        `${MOVE_IN_UI.alerts.confirmRecipe}\n${recipeDisplay}\n선택 Run No\n${lotId.value}\n계속 진행하시겠습니까?`,
      );
      if (!confirmed) return;

      await moveIn();
    } catch (err: unknown) {
      loading.value = false;
      alertError((err as Error).message ?? String(err));
    }
  }

  /* ------------------------------------------------------------------ */
  /* CHECKDICYCLE                                                        */
  /* ------------------------------------------------------------------ */
  async function checkDiCycle(): Promise<void> {
    if (area.value === 'PQC' && comment.value.length < 10) {
      alertError(MOVE_IN_UI.errors.pqcSkipComment);
      return;
    }

    loading.value = true;
    try {
      const raw = await moveinService.sendCheckDiCycle(
        lotId.value,
        mainStore.facility,
        operation.value,
        subOperation.value,
      );
      const parsed = responseParser.parseResponseData(raw);
      loading.value = false;

      if (!parsed.isSuccess) {
        alertError(responseParser.getErrorMessage(raw));
        return;
      }

      const diCycle = parsed.messageBody.DICYCLE ?? '';
      if (diCycle === 'Y') {
        const confirmed = await confirmAction(MOVE_IN_UI.alerts.diCycleSkipConfirm);
        if (confirmed) await moveIn();
      } else {
        const confirmed = await confirmAction(MOVE_IN_UI.alerts.skipConfirm);
        if (!confirmed) return;
        await moveIn();
      }
    } catch (err: unknown) {
      loading.value = false;
      alertError((err as Error).message ?? String(err));
    }
  }

  /* ------------------------------------------------------------------ */
  /* MOVEIN                                                              */
  /* ------------------------------------------------------------------ */
  async function moveIn(): Promise<void> {
    if (batchId.value) {
      openBatchMoveIn();
      return;
    }

    const isSkip = skipCurrentOperation.value ? 'Y' : 'N';
    const reworkSkipFlag = reworkSkip.value ? 'Y' : 'N';
    const isExposure = 'N';

    loading.value = true;
    try {
      const raw = await moveinService.sendMoveIn(
        lotId.value,
        mainStore.facility,
        recipeText.value || selectedRecipe.value || '',
        eqpId.value,
        operation.value,
        subOperation.value,
        isSkip,
        mainStore.operatorId,
        isExposure,
        identCodeList.value,
        reticleId.value,
        quantity.value || '1',
        comment.value,
        reworkSkipFlag,
      );
      const parsed = responseParser.parseResponseData(raw);
      loading.value = false;

      if (!parsed.isSuccess) {
        const msg = responseParser.getErrorMessage(raw);
        if (msg === MOVE_IN_FLOW.mvinErrorTransaction) {
          alertError(MOVE_IN_UI.errors.transactionFail.replace('$errorMessage', msg));
        } else {
          alertError(msg);
        }
        return;
      }

      const b = parsed.messageBody;
      const ficdChamber = b.FICDCHMBER || pendingWarnings.value.ficdChamber;
      const cumulativeCycle = b.CUMCYCLE || pendingWarnings.value.cumulativeCycle;
      const cumulativeCycleQty = b.CUMCYCLEQTY || pendingWarnings.value.cumulativeCycleQty;
      const etchRework = b.ETCHREWORKMSG || pendingWarnings.value.etchRework;

      if (ficdChamber) {
        await alertNotice(ficdChamber, MOVE_IN_UI.noticeTitles.ficdChamber);
      }
      if (cumulativeCycle) {
        await alertNotice(cumulativeCycle, MOVE_IN_UI.noticeTitles.cumCycle(cumulativeCycleQty));
      }
      const cdMessage = b.CDMSG || inspectionWarnings.value.cd;
      const macroMessage = b.MACROMSG || inspectionWarnings.value.macro;
      const scopeMessage = b.SCOPEMSG || inspectionWarnings.value.scope;
      const overlayWarning = b.sOvMSG || inspectionWarnings.value.overlay;
      if (cdMessage) await alertNotice(`[CD 측정]\n ${cdMessage}`, MOVE_IN_UI.noticeTitles.cd);
      if (macroMessage) {
        await alertNotice(`▶ Macro 측정 [ ${macroMessage} ]`, MOVE_IN_UI.noticeTitles.macro);
      }
      if (scopeMessage) await alertNotice(scopeMessage, MOVE_IN_UI.noticeTitles.scope);
      if (overlayWarning) await alertNotice(overlayWarning, MOVE_IN_UI.noticeTitles.overlay);
      if (etchRework) await alertNotice(etchRework, MOVE_IN_UI.noticeTitles.etchRework);

      if (probeCard.value && probeCardId.value) {
        await setProbeCardHistory();
      }

      await lotInfoEnd();
    } catch (err: unknown) {
      loading.value = false;
      alertError((err as Error).message ?? String(err));
    }
  }

  async function setProbeCardHistory(): Promise<void> {
    loading.value = true;
    try {
      const raw = await moveinService.sendSetProbeCardHistory(
        lotId.value,
        mainStore.facility,
        quantity.value,
        eqpId.value,
        operation.value,
        subOperation.value,
        currentOperation.value,
        mainStore.operatorId,
        probeCard.value,
        probeCardId.value,
        'MOVEIN',
        probeOD.value,
        probeZ.value,
      );
      const parsed = responseParser.parseResponseData(raw);
      loading.value = false;
      if (!parsed.isSuccess) {
        alertError(responseParser.getErrorMessage(raw));
      }
    } catch (err: unknown) {
      loading.value = false;
      alertError((err as Error).message ?? String(err));
    }
  }

  /* ------------------------------------------------------------------ */
  /* LOTINFOEND                                                          */
  /* ------------------------------------------------------------------ */
  async function lotInfoEnd(): Promise<void> {
    loading.value = true;
    try {
      const raw = await moveinService.sendLotInfoEnd(
        lotId.value,
        mainStore.facility,
        eqpId.value,
        'MOVEINEND',
        scopeSub.value,
      );
      const parsed = responseParser.parseResponseData(raw);
      loading.value = false;

      if (!parsed.isSuccess) {
        alertError(responseParser.getErrorMessage(raw));
        return;
      }

      const b = parsed.messageBody;
      const mvinMsg = b.MVINMSG ?? '';
      const mvinAction = b.MVINACTION ?? '';
      if (mvinMsg) alertError(`${mvinAction}\n${mvinMsg}`);

      router.back();
    } catch (err: unknown) {
      loading.value = false;
      alertError((err as Error).message ?? String(err));
    }
  }

  /* ------------------------------------------------------------------ */
  /* Probe card                                                          */
  /* ------------------------------------------------------------------ */
  async function getProbeCardInfo(): Promise<void> {
    if (!probeCard.value || !eqpId.value) return;

    loading.value = true;
    try {
      const raw = await moveinService.sendProbeCardInfo(probeCard.value, eqpId.value);
      const parsed = responseParser.parseResponseData(raw);
      loading.value = false;
      probeOD.value = '';
      probeZ.value = '';

      if (!parsed.isSuccess) {
        probeCard.value = '';
        alertError(responseParser.getErrorMessage(raw));
        return;
      }

      const b = parsed.messageBody;
      const status = b.PROBECARDSTATUS ?? '';
      const msg = b.PROBECARDMSG ?? '';
      const checkLast = b.CHECKLASTPROBE ?? '';

      if (status === 'Y') {
        if (checkLast === 'Y') alertError(MOVE_IN_UI.alerts.probeCardChanged);
        probeCardId.value = b.PROBECARDNO ?? '';
        if (processType.value === 'WT') {
          await getProbeValue();
        }
      } else {
        alertError(msg || MOVE_IN_UI.errors.invalidProbeCard);
        probeCard.value = '';
      }
    } catch (err: unknown) {
      loading.value = false;
      probeCard.value = '';
      alertError((err as Error).message ?? String(err));
    }
  }

  async function getProbeValue(): Promise<void> {
    if (!probeCard.value || !product.value || !eqpId.value) return;

    loading.value = true;
    try {
      const raw = await moveinService.sendProbeCardValue(
        probeCard.value,
        product.value,
        eqpId.value,
      );
      const parsed = responseParser.parseResponseData(raw);
      loading.value = false;

      if (!parsed.isSuccess) {
        probeCard.value = '';
        alertError(responseParser.getErrorMessage(raw));
        return;
      }

      probeOD.value = parsed.messageBody.VALUE_OD ?? '';
      probeZ.value = parsed.messageBody.VALUE_Z ?? '';
    } catch (err: unknown) {
      loading.value = false;
      probeCard.value = '';
      alertError((err as Error).message ?? String(err));
    }
  }

  async function getInspection(): Promise<void> {
    if (!lotId.value) return;

    loading.value = true;
    try {
      const raw = await moveinService.sendCheckInspection(
        lotId.value,
        mainStore.facility,
        'DIMVIN',
        operation.value,
        subOperation.value,
      );
      const parsed = responseParser.parseResponseData(raw);
      if (!parsed.isSuccess) return;

      const body = parsed.messageBody;
      inspectionWarnings.value = {
        macro: body.MACROMSG ?? '',
        scope: body.SCOPEMSG ?? '',
        cd: body.CDMSG ?? '',
        overlay: body.sOvMSG ?? '',
      };
    } catch {
      inspectionWarnings.value = { macro: '', scope: '', cd: '', overlay: '' };
    } finally {
      loading.value = false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* W/H (slot info)                                                     */
  /* ------------------------------------------------------------------ */
  async function selectWafer(): Promise<string> {
    loading.value = true;
    try {
      const raw = await moveinService.sendSlotInfo(lotId.value, mainStore.facility);
      const parsed = responseParser.parseResponseData(raw);
      loading.value = false;

      if (!parsed.isSuccess) {
        alertError(responseParser.getErrorMessage(raw));
        return '';
      }

      return parsed.messageBody.WAFERLIST ?? '';
    } catch (err: unknown) {
      loading.value = false;
      alertError((err as Error).message ?? String(err));
      return '';
    }
  }

  async function onWHClick(): Promise<void> {
    const waferList = await selectWafer();
    waferOptions.value = waferList
      .split(',')
      .map((wafer) => wafer.trim())
      .filter(Boolean);
    selectedWafers.value = [];
    waferMachines.value = {};
    machineSearchId.value = '';
    countName.value = '';
    const isCountMode = createCategory.value === 'COUNT';
    waferDialogOpen.value = isCountMode || waferOptions.value.length > 0;
    if (!isCountMode && waferOptions.value.length === 0) {
      alertError(MOVE_IN_UI.errors.noWaferAvailable);
    }
  }

  function toggleWaferSelection(wafer: string): void {
    selectedWafers.value = selectedWafers.value.includes(wafer)
      ? selectedWafers.value.filter((selected) => selected !== wafer)
      : [...selectedWafers.value, wafer];
  }

  function cancelWaferSelection(): void {
    waferDialogOpen.value = false;
  }

  function confirmWaferSelection(): void {
    if (createCategory.value === 'COUNT') {
      void saveCategoryComment(countName.value.trim());
      return;
    }

    if (selectedWafers.value.length === 0) {
      alertError(MOVE_IN_UI.errors.selectWafer);
      return;
    }

    const selected = selectedWafers.value
      .map((wafer) => {
        const waferNumber = wafer.slice(wafer.lastIndexOf('.') + 1);
        const machine = waferMachines.value[wafer];
        return area.value === 'DIFF' && createCategory.value === 'SLOT'
          ? `${waferNumber}(${machine ?? ''})`
          : waferNumber;
      })
      .join(',');

    if (createCategory.value === 'SLOT') {
      if (area.value === 'DIFF') {
        const missingMachine = selectedWafers.value.some((wafer) => !waferMachines.value[wafer]);
        if (missingMachine) {
          alertError(MOVE_IN_UI.alerts.selectMachine);
          return;
        }
      }
      void saveCategoryComment(selected);
      return;
    }

    const displayList = selected.split(`${lotId.value}.`).join('');
    comment.value = `; W/H:#${displayList}`;
    waferDialogOpen.value = false;
  }

  async function lookupWaferMachine(): Promise<void> {
    if (!machineSearchId.value.trim()) {
      alertError(MOVE_IN_UI.errors.enterMachine);
      return;
    }
    if (selectedWafers.value.length === 0) {
      alertError(MOVE_IN_UI.errors.selectWafer);
      return;
    }

    loading.value = true;
    try {
      const raw = await moveinService.sendDummyEqpInfo(
        machineSearchId.value.trim().toUpperCase(),
        lotId.value,
      );
      const parsed = responseParser.parseResponseData(raw);
      if (!parsed.isSuccess) {
        alertError(responseParser.getErrorMessage(raw));
        return;
      }

      const resolvedEqpId = parsed.messageBody.EQPID ?? '';
      if (!resolvedEqpId) {
        alertError(MOVE_IN_UI.errors.resolveMachine);
        return;
      }

      for (const wafer of selectedWafers.value) {
        waferMachines.value[wafer] = resolvedEqpId;
      }
      machineSearchId.value = resolvedEqpId;
    } catch (err: unknown) {
      alertError((err as Error).message ?? String(err));
    } finally {
      loading.value = false;
    }
  }

  async function saveCategoryComment(value: string): Promise<void> {
    if (!value) {
      alertError(
        createCategory.value === 'COUNT'
          ? MOVE_IN_UI.errors.enterCount
          : MOVE_IN_UI.errors.selectWafer,
      );
      return;
    }

    loading.value = true;
    try {
      const raw = await moveinService.sendDummyEqpInput(lotId.value, value, createCategory.value);
      const parsed = responseParser.parseResponseData(raw);
      loading.value = false;

      if (!parsed.isSuccess) {
        alertError(responseParser.getErrorMessage(raw));
        return;
      }

      const body = parsed.messageBody;
      if (createCategory.value === 'COUNT' && body.MSG) {
        alertError(body.MSG);
        return;
      }

      comment.value = body.LOTCOMMENT ?? value;
      if (createCategory.value === 'COUNT') {
        countName.value = comment.value.substring(6);
      }
      waferDialogOpen.value = false;
    } catch (err: unknown) {
      loading.value = false;
      alertError((err as Error).message ?? String(err));
    }
  }

  /* ------------------------------------------------------------------ */
  /* UI handlers                                                         */
  /* ------------------------------------------------------------------ */
  function onBatIdClick(): void {
    if (!batchId.value) return;

    void router.push({
      name: 'move-in-batch-lot-list',
      params: { lotId: lotId.value },
      query: { batId: batchId.value, facility: mainStore.facility },
    });
  }

  async function onEqpIdCommit(): Promise<void> {
    const parsed = barcodeStyleEqpId(eqpId.value);
    if (!parsed.isValid) {
      eqpId.value = '';
      resetRecipe();
      return;
    }

    eqpId.value = parsed.parsedId;
    await getMCFDCMachineinfo();

    if (processType.value === 'WT' || processType.value === 'PCM') {
      await nextTick();
      document.querySelector<HTMLInputElement>('.move-in-field-procard-main input')?.focus();
    }
  }

  function onProbeCardCommit(): void {
    const parsed = barcodeStyleProbeCardId(probeCard.value);
    if (!parsed.isValid) {
      probeCard.value = '';
      void nextTick(() => {
        document.querySelector<HTMLInputElement>('.move-in-field-procard-main input')?.focus();
      });
      return;
    }

    probeCard.value = parsed.parsedId;
    void getProbeCardInfo();
  }

  function showStandardMachineInfo(): void {
    if (standardMachine.value) {
      void showAlert(standardMachine.value, MOVE_IN_UI.labels.standardMachine);
    }
  }

  function onReadClick(): void {
    void router.push({
      name: 'move-in-comment-list',
      params: { lotId: lotId.value },
      query: {
        lotId: lotId.value,
        operation: operation.value,
        subOperation: subOperation.value,
        processStep: processStep.value,
        operSequence: operSeq.value,
        facility: mainStore.facility,
      },
    });
  }

  function onOK(): void {
    if (isLotBlocked.value) return;

    if (!lotId.value) {
      alertError('LOT No를 입력하세요.');
      return;
    }

    if (!skipCurrentOperation.value) {
      if (!eqpId.value) {
        alertError(MOVE_IN_UI.errors.enterEquipment);
        return;
      }
      void loginUserCheck();
    } else {
      void checkDiCycle();
    }
  }

  function onCancel(): void {
    router.back();
  }

  function reset(): void {
    lotId.value = '';
    batchId.value = '';
    batchBtnEnabled.value = false;
    resetRecipe();
    resetEqp();
    standardMachine.value = '';
    standardMachineChanged.value = false;
    exMachine.value = '';
    product.value = '';
    productCode.value = '';
    currentOperation.value = '';
    engineer.value = '';
    customer.value = '';
    quantity.value = '';
    goodChips.value = '';
    comment.value = '';
    commentSize.value = '0';
    unreadCommentCount.value = 0;
    probeCard.value = '';
    probeOD.value = '';
    probeZ.value = '';
    probeCardEnabled.value = false;
    probeCardId.value = '';
    identCodeList.value = '';
    reticleId.value = '';
    waferDialogOpen.value = false;
    waferOptions.value = [];
    selectedWafers.value = [];
    waferMachines.value = {};
    machineSearchId.value = '';
    countName.value = '';
    skipCurrentOperation.value = false;
    isSkipAllowed.value = false;
    isLotBlocked.value = false;
    reworkSkip.value = false;
    operation.value = '';
    subOperation.value = '';
    processStep.value = '';
    opType.value = '';
    area.value = '';
    processType.value = '';
    autoMotiveFlag.value = '';
    createCategory.value = '';
    scopeSub.value = '';
    operSeq.value = '';
    overlayMessage.value = '';
    edgeFar.value = '';
    pendingWarnings.value = {
      ficdChamber: '',
      cumulativeCycle: '',
      cumulativeCycleQty: '',
      etchRework: '',
    };
    inspectionWarnings.value = { macro: '', scope: '', cd: '', overlay: '' };
    error.value = null;
  }

  onMounted(() => {
    const routeLot = route.params.lotId;
    const queryLot = route.query.lotId;
    const initialLot = String(routeLot || queryLot || '').trim();
    if (initialLot) {
      lotId.value = initialLot;
      void getLotInfo();
    }
  });

  return {
    lotId,
    batchId,
    batchBtnEnabled,
    eqpId,
    recipeText,
    selectedRecipe,
    recipeItems,
    recipeChanged,
    standardMachine,
    standardMachineChanged,
    exMachine,
    product,
    productCode,
    productDisplay,
    currentOperation,
    engineer,
    customer,
    quantity,
    goodChips,
    comment,
    commentSize,
    unreadCommentCount,
    probeCard,
    probeOD,
    probeZ,
    probeCardEnabled,
    probeCardId,
    identCodeList,
    reticleId,
    processType,
    autoMotiveFlag,
    waferDialogOpen,
    waferOptions,
    selectedWafers,
    waferMachines,
    machineSearchId,
    countName,
    skipCurrentOperation,
    isSkipAllowed,
    reworkSkip,
    createCategory,
    whLabel,
    readBtnEnabled,
    okEnabled,
    isLotBlocked,
    loading,
    error,
    pendingWarnings,
    inspectionWarnings,
    scopeSub,
    getLotInfo,
    getLotInfoOk,
    getInspection,
    applyInlineActivityResult,
    openInlineActivity,
    completeInlineActivity,
    cancelInlineActivity,
    applyProcessInquireResult,
    closeProcessInquire,
    completeBatchLotList,
    completeBatchMoveIn,
    openBatchMoveInCommentList,
    completeProcessInquire,
    operation,
    subOperation,
    area,
    onEqpIdCommit,
    onProbeCardCommit,
    showStandardMachineInfo,
    getProbeCardInfo,
    getProbeValue,
    onBatIdClick,
    onWHClick,
    toggleWaferSelection,
    cancelWaferSelection,
    confirmWaferSelection,
    lookupWaferMachine,
    onReadClick,
    onOK,
    moveIn,
    onCancel,
    reset,
  };
}
