import {
  assertPass,
  body,
  firstList,
  type MessageBody,
  postJsonMessage,
  text,
} from 'src/services/json-message.service';

import type {
  BatchActionResponse,
  BatchCheckRequest,
  BatchCheckResponse,
  BatchCountResponse,
  BatchGridItem,
  BatchListByLotRequest,
  BatchListByLotResponse,
  BatchLotInfoRequest,
  BatchLotInfoResponse,
  BatchMachineRequest,
  BatchMachineResponse,
  BatchSubmitItem,
  BatchSubmitRequest,
  BatchZoneRequest,
  BatchZoneResponse,
  ParentBatchIdItem,
  ParentBatchIdRequest,
} from '../types/batch.types';

const MACHINE_LOOKUP_TYPE = 'BACHCREATE';
const BATCH_SEARCH_CASE = 'SERCH';

const lotInfoKeys = [
  'PRODUCT',
  'OPERATION',
  'SUBOPERATION',
  'PROCESSSTEP',
  'QUANTITY',
  'BATCHID',
  'STEPRECIPE',
  'LIMITZONE',
  'STATUS',
  'VIEWCOUNT',
  'PROCESSNAME',
  'PTIN',
  'PTSPEC',
  'CHECKQTIME',
  'PROCESSOPERATIONTYPE',
  'JALOT',
  'MOLOT',
  'CHECKRECIPE',
  'JACOUNT',
  'LIMITRECIPE',
  'FQCSAMPLE',
  'CHECKMACHINE',
  'CHECKOPERTION',
  'CHECKDEPOCOMMENT',
  'CHECKRECYCLECOMMENT',
  'CHECKTHCIKNESSCOMMENT',
  'MAXBATCHMESSAGE',
] as const;

const gridItemKeys = [
  'NUM',
  'ISDCOL',
  'LOTID',
  'PRODUCT',
  'QUANTITY',
  'PROCESSSTEP',
  'OPERATION',
  'SUBOPERATION',
  'N',
  'RECIPE',
  'VIEWCOUNT',
  'WAFERTYPE',
  'THIN',
  'THSPEC',
  'PTIN',
  'PTSPEC',
  'STATUS',
] as const;

function pickText<T extends object>(
  source: Record<string, unknown>,
  keys: readonly (keyof T & string)[],
): T {
  const result: Record<string, string> = {};

  keys.forEach((key) => {
    result[key] = text(source, key);
  });

  return result as T;
}

function mapBatchGridItem(item: Record<string, unknown>, index: number): BatchGridItem {
  return {
    ...pickText<BatchGridItem>(item, gridItemKeys),
    NUM: text(item, 'NUM') || String(index),
    ISDCOL: text(item, 'ISDCOL'),
    LOTID: text(item, 'LOTID'),
  };
}

function messageItems(responseBody: MessageBody, key: string): MessageBody[] {
  const value = responseBody[key];
  // Android lists are wrapped in ITEM; retain the flat API response support.
  if (value && typeof value === 'object' && !Array.isArray(value))
    return firstList(value as MessageBody, ['ITEM']);
  return firstList(responseBody, [key]);
}

function batchItemPayload(items: BatchSubmitItem[]): string {
  return items
    .map(
      (item) => `<ITEM>
<ZONE>${item.ZONE}</ZONE>
<LOTID>${item.LOTID}</LOTID>
<OPERATION>${item.OPERATION}</OPERATION>
<SUBOPERATION>${item.SUBOPERATION}</SUBOPERATION>
<SLOTTYPE>${item.SLOTTYPE}</SLOTTYPE>
<PTIN>${item.PTIN}</PTIN>
<THIN>${item.THIN}</THIN>
</ITEM>
`,
    )
    .join('');
}

export async function fetchMachineInfo(
  request: BatchMachineRequest,
): Promise<BatchMachineResponse> {
  const parsed = await postJsonMessage('REALEQPID', {
    FACILITY: request.facility,
    EQPID: request.eqpId,
    TYPE: MACHINE_LOOKUP_TYPE,
  });
  assertPass(parsed, 'REALEQPID');

  const responseBody = body(parsed);
  return {
    EQPID: text(responseBody, 'EQPID'),
    MSG: text(responseBody, 'MSG'),
  };
}

export async function fetchLotInfo(request: BatchLotInfoRequest): Promise<BatchLotInfoResponse> {
  const parsed = await postJsonMessage('BLOTINFO', {
    LOTID: request.lotId,
    FACILITY: request.facility,
    ZONE: request.zone,
    EQPID: request.eqpId,
    ADDEDLOTID: request.addedLotId,
  });
  assertPass(parsed, 'BLOTINFO');

  return pickText<BatchLotInfoResponse>(body(parsed), lotInfoKeys);
}

export async function fetchBatchListByLot(
  request: BatchListByLotRequest,
): Promise<BatchListByLotResponse> {
  const parsed = await postJsonMessage('BATCHLISTBYLOT', {
    LOTID: request.lotId,
    FACILITY: request.facility,
    CASE: BATCH_SEARCH_CASE,
  });
  assertPass(parsed, 'BATCHLISTBYLOT');

  const responseBody = body(parsed);
  return {
    BATCHID: text(responseBody, 'BATCHID'),
    EQPID: text(responseBody, 'EQPID'),
    BATCHTYPE: text(responseBody, 'BATCHTYPE'),
    MWCOUNT: text(responseBody, 'MWCOUNT'),
    RECIPE: text(responseBody, 'RECIPE'),
    PARENTBATCHID: text(responseBody, 'PARENTBATCHID'),
    CHILDZONE: text(responseBody, 'CHILDZONE'),
    BATCHITEMS: messageItems(responseBody, 'BATCHITEMS').map(mapBatchGridItem),
  };
}

export async function fetchBatchCount(): Promise<BatchCountResponse> {
  const parsed = await postJsonMessage('BATCHCOUNTSERCH', {});
  assertPass(parsed, 'BATCHCOUNTSERCH');

  return {
    BATCHCOUNTVIEW: text(body(parsed), 'BATCHCOUNTVIEW'),
  };
}

export async function fetchParentBatchIds(
  request: ParentBatchIdRequest,
): Promise<ParentBatchIdItem[]> {
  const parsed = await postJsonMessage('GETPARENTBATCHID', {
    FACILITY: request.facility,
    LOTID: request.checkLotId,
    MACHINENAME: request.eqpId,
  });
  assertPass(parsed, 'GETPARENTBATCHID');

  return messageItems(body(parsed), 'ITEMS').map((item) => ({
    BATCHID: text(item, 'BATCHID'),
  }));
}

export async function fetchBatchZone(request: BatchZoneRequest): Promise<BatchZoneResponse> {
  const parsed = await postJsonMessage('GETBATCHZONE', {
    FACILITY: request.facility,
    MBATCHID: request.batchId,
  });
  assertPass(parsed, 'GETBATCHZONE');

  return {
    ZONE: text(body(parsed), 'ZONE'),
  };
}

export async function checkBatchCreate(request: BatchCheckRequest): Promise<BatchCheckResponse> {
  const parsed = await postJsonMessage('BATCHCRTCHECK', {
    FACILITY: request.facility,
    EQPID: request.eqpId,
    CHALIDCHECK: request.childCheck,
    BATCHITEMS: batchItemPayload(request.items),
  });
  assertPass(parsed, 'BATCHCRTCHECK');

  return pickText<BatchCheckResponse>(body(parsed), [
    'BATCHMESSGE',
    'CUMCOUNT',
    'MAXCOUNT',
    'UPDATEFLAG',
    'UVFLAG',
    'SAMPLECYCLE',
    'REMOTE',
  ]);
}

export async function submitBatch(request: BatchSubmitRequest): Promise<BatchActionResponse> {
  const parsed = await postJsonMessage('BATCHCRT', {
    TYPE: request.type,
    FACILITY: request.facility,
    EQPID: request.eqpId,
    BATCHID: request.batchId,
    BATCHTYPE: request.batchType,
    CHALIDCHECK: request.childCheck,
    MBATCHID: request.parentBatchId,
    CHALIDZONE: request.childZone,
    OPERATORID: request.operatorId,
    ROWNO: request.rowNo,
    MWCOUNT: request.monitorWaferCount,
    BATCHITEMS: batchItemPayload(request.items),
    ...request.sampling,
  });
  assertPass(parsed, 'BATCHCRT');

  return pickText<BatchActionResponse>(body(parsed), [
    'INTERLOCKMSG',
    'TTINTERLOCKMSG',
    'NOTICEDOWN',
    'MSG',
  ]);
}
