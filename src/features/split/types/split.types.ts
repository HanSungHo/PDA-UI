/**
 * Constants + messages for the SPLIT screen.
 * Source: SplitActivity.kt (Korean UI text kept identical to the Android build).
 */

export const MAX_SPLIT_COUNT = 5;

/** GetString.TXTDIALOGTITLE_ERROR */
export const DIALOG_TITLE_ERROR = '오류';

/**
 * Legacy: checkCustomerLot() returns true when the user taps OK on the customer-LOT dialog
 * => executeSplit() stops, i.e. a customer LOT can't be split from this screen.
 * This is likely an Android-only bug (the original MFC build only showed the message and continued).
 * Keep true to preserve legacy behavior. TODO: confirm with business, then flip to false if needed.
 */
export const BLOCK_SPLIT_ON_CUSTOMER_LOT = true;

export const SPLIT_MESSAGES = {
  // --- setLotInfo: conditions required before split is allowed
  notWip: (state: string) => `${state} 상태 입니다. SPLIT할 수 없습니다.`,
  onHold: 'HOLD된 LOT입니다. SPLIT할수 없습니다.',
  inBatch: 'BATCH로 묶여 있는 LOT입니다. SPLIT할수 없습니다.',
  sampleLot: (lotId: string) =>
    `${lotId}은(는) Sample Lot 입니다.\n모 Lot으로 합류 후 Split 하세요.`,

  // --- setSplitGrid / addGridRow
  childCountRequired: '자 LOT의 개수를 입력하세요',
  childCountTooSmall: 'SPLIT개수는 1이상이어야 합니다.',
  childCountTooLarge: '최대 5개 까지 나눌수 있습니다.',
  childSeqOverflow: 'Child Lot이 생성할수 있는 Sequence를 벗어났습니다.\n 4469로 문의하세요 ',

  // --- executeWaferSelect
  selectRowForWafer: 'Wafer를 지정할 LOT을 선택하세요.',

  // --- WaferAdapter: selection count exceeds FIXEDCOUNT
  waferSelectOverflow: '선택한 WAFER개수가 지정된 개수를 초과하였습니다.',

  // --- executeSplit
  childLotRequired: 'SPLIT할 자LOT을 입력하세요.',
  duplicatedLotNo: '중복된 LOT NO가 존재합니다.',
  waferRequired: '자LOT의 WAFER를 입력하세요.',
  sameAsParent: '자 LOT의 LOT NO가\n모 LOT의 LOT NO와 같습니다.',
  lotNameHasSpace: 'Lot Name 중간에 공백문자가 있습니다.',
  lotNameHasHyphen: 'Lot Name에 사용할 수 없는 문자(-)가 있습니다.',
  lotNameLength9: 'Lot Name은 9자리여야 합니다.',
  lotName8thMustBeLetter: (ch: string) => `Lot Name의 8번째 자리는 문자여야 합니다.[${ch}]`,
  lotNameInvalidChar: (ch: string) => `Lot Name에 사용할 수 없는 문자가 있습니다.[${ch}]`,
  oldLotNameRule: "이전 Lot Name은 최소 7자리 이상 및 '-'를 포함해야 합니다.",
  overParentQty: '모 LOT의 Wafer수량을 넘었습니다.',
  customerLot: (customer: string) =>
    `[${customer}] 고객 Lot 입니다.\nScrap 대기 Lot으로 분리 시, 실물은 DIFF 반장에게 전달하세요`,
} as const;

// ---------------------------------------------------------------- types

/** Data types for the SPLIT screen */

export type SplitMessageName = 'SLOTINFO' | 'CALLCUSTOMER' | 'SPLIT';

/** Equivalent to the result of MessageSender.send() + ResponseDataToJsonUtil in the Android build */
export interface RawMessageResponse {
  isSuccessful: boolean;
  /** getMessageBody(result) */
  body: Record<string, string>;
  /** getErrorMessage(result) */
  errorMessage: string;
}

/** Parsed result of the SLOTINFO message */
export interface SplitLotInfo {
  product: string;
  operation: string;
  subOperation: string;
  processStep: string;
  quantity: number;
  state: string;
  status: string;
  holdStatus: string;
  batchId: string;
  waferList: string[];
  sampleFlag: string;
  rootLotName: string;
  childLotSequence: number;
}

/** One child LOT row in the grid (replaces CTRowLayout + RowData) */
export interface SplitChildRow {
  id: number;
  /** LOT NO column (editable) */
  lotNo: string;
  /** WAFER column; N column = wafers.length */
  wafers: string[];
  /** 제품명 (product name) column */
  product: string;
}

export type SplitFailKind = 'server' | 'rule';

export type SplitResult =
  | { ok: true; warnings?: string[] }
  | { ok: false; kind: SplitFailKind; message: string };

/** Extras passed to WaferSelectActivity */
export interface WaferSelectPayload {
  lotId: string;
  fixedCount: number;
  existWaferList: string[];
  disableWaferList: string[];
  selectWaferList: string[];
}

export type WaferSelectPrepareResult =
  | { ok: true; payload: WaferSelectPayload }
  | { ok: false; kind: SplitFailKind; message: string };

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; message: string };

export interface SplitItem {
  splitLotId: string;
  splitQty: number;
  /** SPLITPROD = product name */
  splitProd: string;
  /** WAFERID = wafer list joined with commas */
  waferId: string;
}

/** Parameters for MessageFactoryUtil.split(...) */
export interface SplitRequest {
  lotId: string;
  facility: string;
  /** REMAINING quantity of the parent LOT (not the sum of child LOTs) */
  qty: number;
  operation: string;
  subOperation: string;
  product: string;
  operatorId: string;
  items: SplitItem[];
  comment: string;
}
