import { DeviceInfo } from 'src/constants/deviceinfo';
import apiClient from 'src/services/api-client';

import type {
  MoveOutBayOption,
  MoveOutFqcSamplingRequest,
  MoveOutFqcSamplingResult,
  MoveOutLoginUserCheckRequest,
  MoveOutLoginUserCheckResult,
  MoveOutLotInfo,
  MoveOutLotInfoRequest,
  MoveOutMessageResponse,
  MoveOutProbeCardSetRequest,
  MoveOutRawBody,
  MoveOutRequest,
  MoveOutResult,
  MoveOutSlotInfo,
  MoveOutSlotInfoRequest,
  MoveOutStockerOption,
  MoveOutUpdateSkipWaferRequest,
  MoveOutUpdateSkipWaferResult,
} from '../types/move-out.types';

interface ParsedMoveOutMessage {
  STATUS?: string;
  MSGBODY?: MoveOutRawBody;
  ERRMSG?: string;
}

export function parseMoveOutMessageResponse(response: MoveOutMessageResponse): MoveOutRawBody {
  const parsed = JSON.parse(response.result) as ParsedMoveOutMessage;

  if (parsed.STATUS !== 'PASS') {
    throw new Error(parsed.ERRMSG || 'Message failed.');
  }

  return parsed.MSGBODY ?? {};
}

async function postMoveOutMessage(
  messageName: string,
  payload: Record<string, string>,
): Promise<MoveOutRawBody> {
  const response = await apiClient.post<MoveOutMessageResponse>(`/hifos/${messageName}`, payload);
  return parseMoveOutMessageResponse(response.data);
}

function text(body: MoveOutRawBody, key: string): string {
  const value = body[key];
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function normalizeCategory(value: string): MoveOutLotInfo['createCategory'] {
  return value === 'COUNT' || value === 'SLOT' ? value : '';
}

function indexedOptions(body: MoveOutRawBody, prefix: string): MoveOutBayOption[] {
  return Object.entries(body)
    .filter(([key, value]) => key.startsWith(prefix) && value !== undefined && value !== null)
    .map(([, value]) =>
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : '',
    )
    .filter(Boolean)
    .map((value) => ({ label: value, value }));
}

export async function fetchLotInfo(request: MoveOutLotInfoRequest): Promise<MoveOutLotInfo> {
  const body = await postMoveOutMessage('LOTINFO', {
    LOTID: request.lotId,
    FACILITY: request.facility,
    TYPE: 'MVOU',
    OPERATORID: request.operatorId,
  });

  const lotId = request.lotId;
  const batchId = text(body, 'BATCHID');
  const operation = text(body, 'OPERATION');
  const subOperation = text(body, 'SUBOPERATION');
  const processStep = text(body, 'PROCESSSTEP');
  const nextOperation = text(body, 'NEXTOPERATION');
  const nextSubOperation = text(body, 'NEXTSUBOPERATION');
  const nextProcessStep = text(body, 'NEXTPROCESSSTEP');
  const product = text(body, 'PRODUCT');
  const jobCode = text(body, 'JOBCODE');

  return {
    lotId,
    batchId,
    area: text(body, 'AREA'),
    display: {
      lotNo: lotId,
      batchId,
      recipe: text(body, 'WORKEDRECIPE'),
      machine: text(body, 'WORKEDEQPID'),
      maskTag: text(body, 'WORKEDRETICLE'),
      product: product || jobCode ? `${product}(${jobCode})` : '',
      currentOperation:
        processStep || operation || subOperation
          ? `${processStep}(${operation}${subOperation})`
          : '',
      nextOperation:
        nextProcessStep || nextOperation || nextSubOperation
          ? `${nextProcessStep}(${nextOperation}${nextSubOperation})`
          : '',
      quantity: text(body, 'QUANTITY'),
      goodChips: text(body, 'GOODCHIPS'),
      commentQty: text(body, 'COMMENTQTY'),
    },
    operation,
    subOperation,
    processStep,
    operSequence: text(body, 'OPERSEQUENCE'),
    opType: text(body, 'OPTYPE'),
    processType: text(body, 'PROCESSTYPE'),
    state: text(body, 'STATE'),
    status: text(body, 'STATUS'),
    holdStatus: text(body, 'HOLDSTATUS'),
    remoteCheck: text(body, 'REMOTECHECK'),
    nwCommentQty: text(body, 'NWCOMMENTQTY'),
    pqcSkipUser: text(body, 'PQCSKIPUSER'),
    checkSkipWafer: text(body, 'CHECKSKIPWAFER'),
    checkSkipWaferMachine: text(body, 'CHECKSKIPWAFERMACHINE'),
    checkSkipWaferRecipe: text(body, 'CHECKSKIPWAFERRECIPE'),
    checkSkipWaferQty: text(body, 'WAFERQTY'),
    checkSkipMachineQty: text(body, 'MACHAINQTY'),
    checkSkipReasonList: JSON.stringify(body.TYPEVALUES ?? []),
    createCategory: normalizeCategory(text(body, 'CREATECATEGORY')),
    lastEventComment: text(body, 'LASTEVENTCOMMENT'),
    productQuantity: text(body, 'PRODUCTQUANTITY'),
    owner: text(body, 'OWNER'),
    checkEtch: text(body, 'CHECKETCH'),
    checkInterlock: text(body, 'CHECKINTERLOCK'),
    lampComment: text(body, 'LAMPCOMMENT'),
    aramComment: text(body, 'ARAMCOMMENT'),
    machineState: text(body, 'MACHINESTATE'),
    machineCode: text(body, 'MACHINECODE'),
    holdCodeOut: text(body, 'HOLDCODE_OUT'),
    holdCommentOut: text(body, 'HOLDCOMMENT_OUT'),
    etcMsg: text(body, 'ETCMSG'),
    pcmCheck: text(body, 'PCMCHECK'),
    thicknessCheck: text(body, 'THICKNESSCHECK'),
    mvinWaferCheck: text(body, 'MVINWAFERCHECK'),
    btaWarning: text(body, 'BTAWARNING'),
    childBatchId: text(body, 'CHILDBATCHID'),
    bibuhaDown: text(body, 'BIBUHADOWN'),
    chamberList: JSON.stringify(body.CHAMBERS ?? []),
    checkGateInspMsg: text(body, 'CHECKGATEINSPMSG'),
    automotiveFlag: text(body, 'AUTOMOTIVEFLAG'),
    photoOperType: text(body, 'PHOTOOPERTYPE'),
    nextBay: text(body, 'NEXTBAY'),
    nextStocker: text(body, 'NEXTSTOCKER'),
  };
}

export async function fetchAreaBayInfo(): Promise<MoveOutBayOption[]> {
  return indexedOptions(
    await postMoveOutMessage('AREABAYINFO', {
      FACILITY: DeviceInfo.FACILITY,
    }),
    'BAY',
  );
}

export async function fetchBayStockerInfo(bay: string): Promise<MoveOutStockerOption[]> {
  return indexedOptions(
    await postMoveOutMessage('BAYSTOCKERINFO', {
      BAY: bay,
      FACILITY: DeviceInfo.FACILITY,
    }),
    'STOCKER',
  );
}

export async function checkLoginUser(
  request: MoveOutLoginUserCheckRequest,
): Promise<MoveOutLoginUserCheckResult> {
  const body = await postMoveOutMessage('LOGINUSERCHECK', {
    USERID: request.operatorId,
    EQPID: request.eqpId,
    AUTOMOTIVE: request.automotiveFlag,
  });
  return { areaCheck: text(body, 'AREACHECK') };
}

export async function executeMoveOut(request: MoveOutRequest): Promise<MoveOutResult> {
  const body = await postMoveOutMessage('MOVEOUT', {
    LOTID: request.lotId,
    FACILITY: request.facility,
    EQPID: request.eqpId,
    OPERATION: request.operation,
    SUBOPERATION: request.subOperation,
    RECIPE: request.recipe,
    OPTYPE: request.opType,
    ISSKIP: request.isSkip,
    OPERATORID: request.operatorId,
    COMMENT: request.comment,
    ISCARRY: request.isCarry,
    BAY: request.bay,
    STOCKER: request.stocker,
    QUANTITY: request.quantity,
    INPUTMASKLOGO: request.inputMaskLogo,
    WFINTERLOCK: request.wfInterlock,
  });

  return { tanpi: text(body, 'TANPI'), sampleResult: text(body, 'SAMPLERESULT') };
}

export async function fetchMoveOutFqcSampling(
  request: MoveOutFqcSamplingRequest,
): Promise<MoveOutFqcSamplingResult> {
  const body = await postMoveOutMessage('FQCSAMPLING', {
    LOTID: request.lotId,
    OPTYPE: request.opType,
    EQPID: request.eqpId,
    OPER: request.oper,
    SUBOPER: request.subOper,
  });

  return {
    cycleComment: text(body, 'CYCLECOMMENT'),
    recipeComment: text(body, 'RECIPECOMMENT'),
    deleteCode: text(body, 'DELETECODE'),
    updateCode: text(body, 'UPDATECODE'),
  };
}

export async function fetchSlotInfo(request: MoveOutSlotInfoRequest): Promise<MoveOutSlotInfo> {
  const body = await postMoveOutMessage('SLOTINFO', {
    LOTID: request.lotId,
    FACILITY: request.facility,
    OPERATORID: request.operatorId,
  });

  return {
    waferList: text(body, 'WAFERLIST'),
    quantity: text(body, 'QUANTITY'),
    checkEtch: text(body, 'CHECKETCH'),
  };
}

export async function updateSkipWafer(
  request: MoveOutUpdateSkipWaferRequest,
): Promise<MoveOutUpdateSkipWaferResult> {
  const body = await postMoveOutMessage('UPDATESKIPWAFER', {
    LOTID: request.lotId,
    MACHINENAME: request.machineName,
    RECIPENAME: request.recipeName,
    SKIPWAFER: request.skipWafer,
    USERID: request.operatorId,
    SKIPREASON: request.skipReason,
    SMINUS: request.minusString,
  });

  return { updateFlag: text(body, 'UPDATEFLAG') };
}

export async function setProbeCardHistory(request: MoveOutProbeCardSetRequest): Promise<void> {
  await postMoveOutMessage('PROBECARDSET', {
    LOTNAME: request.lotId,
    FACILITY: request.facility,
    QTY: request.quantity,
    MACHINENAME: request.machineName,
    OPERATION: request.operation,
    SUBOPERATION: request.subOperation,
    OPERATIONDESC: request.operationDescription,
    OPERATORID: request.operatorId,
    TYPE: 'MOVEOUT',
  });
}
