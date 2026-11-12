import { postAifMessage } from 'src/services/aif-message.service';
import { ApiError } from 'src/services/api-error';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import type {
  AreaBayInfoRequest,
  AreaBayInfoResponse,
  BayStockerInfoRequest,
  BayStockerInfoResponse,
  ExecuteReworkRequest,
  RawAreaBayInfoResponse,
  RawBayStockerInfoResponse,
  RawReworkInfoResponse,
  ReworkInfoRequest,
  ReworkInfoResponse,
  SpinnerItem,
} from '../types/rework.types';

// ---------------------------------------------------------------------
// Mappers: each one mirrors, field by field, the exact lines that parse
// the raw message body in ReworkActivity.kt. Keep these in sync if the
// legacy parsing ever changes.
// ---------------------------------------------------------------------

/**
 * legacy (ReworkActivity.setData):
 *   val messageBody = ResponseDataToJsonUtil.getMessageBody(result)
 *   val product = messageBody.optString("PRODUCT")
 *   val operation = messageBody.optString("OPERATION")
 *   val subOperation = messageBody.optString("SUBOPERATION")
 *   val processStep = messageBody.optString("PROCESSSTEP")
 *   val eqpID = messageBody.optString("EQPID")
 *   val state = messageBody.optString("STATE")
 *   val status = messageBody.optString("STATUS")
 *   val holdStatus = messageBody.optString("HOLDSTATUS")
 *   val qty = messageBody.optString("QUANTITY")
 *   val reworkItemList = ResponseDataToJsonUtil.getMessageBodyList(result, "REWORKITEMS")
 *   for (count in 0 until reworkItemList.length()) {
 *     val reworkCode = reworkItemList.getJSONObject(count).optString("REWORKCODE")
 *     val reworkDesc = reworkItemList.getJSONObject(count).optString("RWDESCRIPTION")
 *     reworkCodeList.add(SpinnerItem(reworkCode, "$reworkCode  $reworkDesc"))
 *   }
 */
function mapReworkInfoResponse(raw: RawReworkInfoResponse): ReworkInfoResponse {
  const reworkCodes: SpinnerItem[] = raw.REWORKITEMS.map((item) => ({
    value: item.REWORKCODE,
    label: `${item.REWORKCODE}  ${item.RWDESCRIPTION}`,
  }));

  return {
    eqpId: raw.EQPID,
    product: raw.PRODUCT,
    operation: raw.OPERATION,
    subOperation: raw.SUBOPERATION,
    processStep: raw.PROCESSSTEP,
    state: raw.STATE,
    status: raw.STATUS,
    holdStatus: raw.HOLDSTATUS,
    qty: raw.QUANTITY,
    reworkCodes,
  };
}

/**
 * legacy (ReworkActivity.setBayList):
 *   val jsonBayList = ResponseDataToJsonUtil.getMessageBodyList(result, "BAYS")
 *   for (count in 0 until jsonBayList.length())
 *     bayList.add(jsonBayList.getJSONObject(count).optString("BAY"))
 */
function mapAreaBayInfoResponse(raw: RawAreaBayInfoResponse): AreaBayInfoResponse {
  return {
    bays: raw.BAYS.map((b) => ({ value: b.BAY, label: b.BAY })),
  };
}

/**
 * legacy (ReworkActivity.setSTKList):
 *   val jsonSTKList = ResponseDataToJsonUtil.getMessageBodyList(result, "STOCKERS")
 *   for (count in 0 until jsonSTKList.length())
 *     stkList.add(jsonSTKList.getJSONObject(count).optString("STOCKER"))
 */
function mapBayStockerInfoResponse(raw: RawBayStockerInfoResponse): BayStockerInfoResponse {
  return {
    stockers: raw.STOCKERS.map((s) => ({ value: s.STOCKER, label: s.STOCKER })),
  };
}

// ---------------------------------------------------------------------
// API functions — one per legacy MessageName, served by the mock server (same wire protocol as
// hifos2: POST /hifos/<name> with the AIFMSG in sMsg).
// ---------------------------------------------------------------------

// getMessageBodyList(result, key): the list lives under MSGBODY[key].ITEM (single item = object).
function bodyList<T>(body: Record<string, unknown>, key: string): T[] {
  const list = body[key];
  if (!list || typeof list !== 'object') return [];
  const item = (list as { ITEM?: T | T[] }).ITEM;
  if (item === undefined) return [];
  return Array.isArray(item) ? item : [item];
}

const text = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

async function send(
  name: string,
  fields: [string, string][],
  code: string,
): Promise<Record<string, unknown>> {
  let response: MessageResponseData;
  try {
    response = await postAifMessage(name, name, fields);
  } catch (error: unknown) {
    throw new ApiError(error instanceof Error ? error.message : String(error), { code, status: 0 });
  }
  if (!isResponseSuccessful(response)) {
    // legacy: ResponseDataToJsonUtil.getErrorMessage(result) shown in an OkDialog
    throw new ApiError(getResponseErrorMessage(response), { code, status: response.statusCode });
  }
  return parseMessageBody(response);
}

/** legacy: MessageFactoryUtil.reworkInfo(lotId, facility) -> MessageName.REWORKINFO */
export async function fetchReworkInfo(request: ReworkInfoRequest): Promise<ReworkInfoResponse> {
  const body = await send(
    'REWORKINFO',
    [
      ['LOTID', request.lotId],
      ['FACILITY', request.facility],
    ],
    'REWORK_INFO_FAILED',
  );
  const raw: RawReworkInfoResponse = {
    PRODUCT: text(body.PRODUCT),
    OPERATION: text(body.OPERATION),
    SUBOPERATION: text(body.SUBOPERATION),
    PROCESSSTEP: text(body.PROCESSSTEP),
    EQPID: text(body.EQPID),
    STATE: text(body.STATE),
    STATUS: text(body.STATUS),
    HOLDSTATUS: text(body.HOLDSTATUS),
    QUANTITY: text(body.QUANTITY),
    REWORKITEMS: bodyList<Record<string, unknown>>(body, 'REWORKITEMS').map((item) => ({
      REWORKCODE: text(item.REWORKCODE),
      RWDESCRIPTION: text(item.RWDESCRIPTION),
    })),
  };
  return mapReworkInfoResponse(raw);
}

/** legacy: MessageFactoryUtil.areaBayInfo(facility) -> MessageName.AREABAYINFO */
export async function fetchAreaBayInfo(request: AreaBayInfoRequest): Promise<AreaBayInfoResponse> {
  const body = await send('AREABAYINFO', [['FACILITY', request.facility]], 'BAY_INFO_FAILED');
  return mapAreaBayInfoResponse({
    BAYS: bodyList<Record<string, unknown>>(body, 'BAYS').map((item) => ({ BAY: text(item.BAY) })),
  });
}

/** legacy: MessageFactoryUtil.bayStockerInfo(bay, facility) -> MessageName.BAYSTOCKERINFO */
export async function fetchBayStockerInfo(
  request: BayStockerInfoRequest,
): Promise<BayStockerInfoResponse> {
  const body = await send(
    'BAYSTOCKERINFO',
    [
      ['BAY', request.bay],
      ['FACILITY', request.facility],
    ],
    'STOCKER_NOT_FOUND',
  );
  return mapBayStockerInfoResponse({
    STOCKERS: bodyList<Record<string, unknown>>(body, 'STOCKERS').map((item) => ({
      STOCKER: text(item.STOCKER),
    })),
  });
}

/**
 * legacy: MessageFactoryUtil.rework(lotId, facility, eqpId, reworkCode, comment, operatorId,
 * operation, subOperation, isCarry, bay, stocker, qty) -> MessageName.REWORK. No body is read on success.
 */
export async function submitRework(request: ExecuteReworkRequest): Promise<void> {
  await send(
    'REWORK',
    [
      ['LOTID', request.lotId],
      ['FACILITY', request.facility],
      ['EQPID', request.eqpId],
      ['REWORKCODE', request.reworkCode],
      ['COMMENT', request.comment],
      ['OPERATORID', request.operatorId],
      ['OPERATION', request.operation],
      ['SUBOPERATION', request.subOperation],
      ['ISCARRY', request.isCarry],
      ['BAY', request.bay],
      ['STOCKER', request.stocker],
      ['QUANTITY', request.qty],
    ],
    'REWORK_FAILED',
  );
}
