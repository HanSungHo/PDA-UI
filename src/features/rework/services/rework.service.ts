import { ApiError } from 'src/services/api-error';

import {
  mockBayInfoFetchFailedMessage,
  mockRawAreaBayInfo,
  mockRawReworkInfoByLotId,
  mockRawStockerInfoByBay,
  mockReworkLotNotFoundMessage,
  mockStockerNotFoundMessage,
} from '../mocks/rework.mock';
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
// API functions — one per legacy MessageName, backed by mock data until
// the real endpoint is available.
// ---------------------------------------------------------------------

/**
 * legacy:
 *   val sendMessage = MessageFactoryUtil.reworkInfo(lotId, DeviceInfo.FACILITY)
 *   val message = MessageSender.send(supportFragmentManager, sendMessage, MessageName.REWORKINFO)
 *   val isSuccessFul = message.isSuccessFul
 *   val result = message.result
 *   if (isSuccessFul) { ... } else {
 *     val errorMessage = ResponseDataToJsonUtil.getErrorMessage(result)
 *     OkDialog.show(...)
 *   }
 * Message name: REWORKINFO (`POST /hifos/REWORKINFO`).
 */
export async function fetchReworkInfo(request: ReworkInfoRequest): Promise<ReworkInfoResponse> {
  await new Promise((resolve) => window.setTimeout(resolve, 220));

  // stand-in for `isSuccessFul` — the real endpoint will throw/reject the
  // same way on a failed message instead of a missing mock entry
  const raw = mockRawReworkInfoByLotId[request.lotId];
  if (!raw) {
    throw new ApiError(mockReworkLotNotFoundMessage, { code: 'REWORK_LOT_NOT_FOUND', status: 404 });
  }

  return mapReworkInfoResponse(raw);
}

/**
 * legacy:
 *   val sendMessage = MessageFactoryUtil.areaBayInfo(DeviceInfo.FACILITY)
 *   val message = MessageSender.send(supportFragmentManager, sendMessage, MessageName.AREABAYINFO)
 *   val isSuccessFul = message.isSuccessFul
 *   val result = message.result
 * Message name: AREABAYINFO (`POST /hifos/AREABAYINFO`).
 */
export async function fetchAreaBayInfo(request: AreaBayInfoRequest): Promise<AreaBayInfoResponse> {
  await new Promise((resolve) => window.setTimeout(resolve, 220));
  void request.facility; // kept for parity with the legacy request shape

  if (mockRawAreaBayInfo.BAYS.length === 0) {
    throw new ApiError(mockBayInfoFetchFailedMessage, { code: 'BAY_INFO_FAILED', status: 500 });
  }

  return mapAreaBayInfoResponse(mockRawAreaBayInfo);
}

/**
 * legacy:
 *   val sendMessage = MessageFactoryUtil.bayStockerInfo(
 *     viewBinding.spinnerBay.selectedItem.toString(), DeviceInfo.FACILITY
 *   )
 *   val message = MessageSender.send(supportFragmentManager, sendMessage, MessageName.BAYSTOCKERINFO)
 *   val isSuccessFul = message.isSuccessFul
 *   val result = message.result
 * Message name: BAYSTOCKERINFO (`POST /hifos/BAYSTOCKERINFO`).
 */
export async function fetchBayStockerInfo(
  request: BayStockerInfoRequest,
): Promise<BayStockerInfoResponse> {
  await new Promise((resolve) => window.setTimeout(resolve, 220));

  const raw = mockRawStockerInfoByBay[request.bay];
  if (!raw) {
    throw new ApiError(mockStockerNotFoundMessage, { code: 'STOCKER_NOT_FOUND', status: 404 });
  }

  return mapBayStockerInfoResponse(raw);
}

/**
 * legacy:
 *   val sendMessage = MessageFactoryUtil.rework(
 *     lotId, DeviceInfo.FACILITY, eqpId, reworkCode, comment, DeviceInfo.OPERATOR_ID,
 *     searchOperation, searchSubOperation, isCarry, bay, stocker, qty
 *   )
 *   val message = MessageSender.send(supportFragmentManager, sendMessage, MessageName.REWORK)
 *   val isSuccessFul = message.isSuccessFul
 *   if (isSuccessFul) { setResult(RESULT_OK); finish() } else { ... }
 * Message name: REWORK (`POST /hifos/REWORK`). No response body is used by
 * the legacy screen on success, so this resolves to void.
 */
export async function submitRework(request: ExecuteReworkRequest): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, 220));
  void request; // no-op until the real endpoint is wired in
}
