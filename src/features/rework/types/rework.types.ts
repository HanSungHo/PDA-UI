// Option shown in a BaseDropdownList (matches BaseOption's shape: value + label)
export interface SpinnerItem {
  value: string;
  label: string;
}

// =====================================================================
// RAW response shapes — 1:1 with the JSON body the legacy screen parses
// via ResponseDataToJsonUtil.getMessageBody(...) / getMessageBodyList(...).
// Field names are kept exactly as in Kotlin (ALL_CAPS) on purpose, so the
// contract can be diffed directly against the real REWORKINFO/AREABAYINFO/
// BAYSTOCKERINFO responses once the real endpoint replaces the mock.
// =====================================================================

// legacy: messageBody.optJSONArray("REWORKITEMS") item
//   val reworkCode = reworkItemList.getJSONObject(count).optString("REWORKCODE")
//   val reworkDesc = reworkItemList.getJSONObject(count).optString("RWDESCRIPTION")
export interface RawReworkItem {
  REWORKCODE: string;
  RWDESCRIPTION: string;
}

// legacy: REWORKINFO message body, read field-by-field in setData(lotId)
export interface RawReworkInfoResponse {
  PRODUCT: string;
  OPERATION: string;
  SUBOPERATION: string;
  PROCESSSTEP: string;
  EQPID: string;
  STATE: string;
  STATUS: string;
  HOLDSTATUS: string;
  QUANTITY: string;
  REWORKITEMS: RawReworkItem[];
}

// legacy: AREABAYINFO message body
//   val jsonBayList = ResponseDataToJsonUtil.getMessageBodyList(result, "BAYS")
//   bayList.add(jsonBayList.getJSONObject(count).optString("BAY"))
export interface RawAreaBayInfoResponse {
  BAYS: { BAY: string }[];
}

// legacy: BAYSTOCKERINFO message body
//   val jsonSTKList = ResponseDataToJsonUtil.getMessageBodyList(result, "STOCKERS")
//   stkList.add(jsonSTKList.getJSONObject(count).optString("STOCKER"))
export interface RawBayStockerInfoResponse {
  STOCKERS: { STOCKER: string }[];
}

// =====================================================================
// Clean / mapped shapes — what the composable and UI actually consume.
// Produced from the Raw shapes above by services/rework.service.ts.
// =====================================================================

// ---- REWORKINFO ----
// Legacy request: MessageFactoryUtil.reworkInfo(lotId, facility)
export interface ReworkInfoRequest {
  lotId: string;
  facility: string;
}

export interface ReworkInfoResponse {
  eqpId: string;
  product: string;
  operation: string;
  subOperation: string;
  processStep: string;
  state: string;
  status: string;
  holdStatus: string;
  qty: string;
  reworkCodes: SpinnerItem[];
}

// ---- AREABAYINFO ----
// Legacy request: MessageFactoryUtil.areaBayInfo(facility)
export interface AreaBayInfoRequest {
  facility: string;
}

export interface AreaBayInfoResponse {
  bays: SpinnerItem[];
}

// ---- BAYSTOCKERINFO ----
// Legacy request: MessageFactoryUtil.bayStockerInfo(bay, facility)
export interface BayStockerInfoRequest {
  bay: string;
  facility: string;
}

export interface BayStockerInfoResponse {
  stockers: SpinnerItem[];
}

// ---- REWORK ----
// Legacy: MessageFactoryUtil.rework(lotId, facility, eqpId, reworkCode,
// comment, operatorId, operation, subOperation, isCarry, bay, stocker, qty)
export interface ExecuteReworkRequest {
  lotId: string;
  facility: string;
  eqpId: string;
  reworkCode: string;
  comment: string;
  operatorId: string;
  operation: string;
  subOperation: string;
  isCarry: 'Y' | 'N';
  bay: string;
  stocker: string;
  qty: string;
}

// =====================================================================
// Screen result — mirrors legacy ReworkActivity.setResult():
//   success  : setResult(RESULT_OK)  + finish()
//   cancel   : finish()  (RESULT_CANCELED by default)
// Carried via useReworkStore so the caller screen (e.g. ESheet) can
// react after router.back(), the same way wafer-select/wafer-skip do.
// =====================================================================
export type ReworkResultStatus = 'ok' | 'canceled';

export interface ReworkResult {
  status: ReworkResultStatus;
  lotId: string;
}
