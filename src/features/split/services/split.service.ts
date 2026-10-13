import apiClient from 'src/services/api-client';

import { mockSendMessage } from '../mocks/split.mock';
import type {
  RawMessageResponse,
  ServiceResult,
  SplitItem,
  SplitLotInfo,
  SplitMessageName,
  SplitRequest,
} from '../types/split.types';

const USE_MOCK = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true';

/**
 * Replaces MessageSender.send(...) + MessageFactoryUtil.
 * TODO: update the endpoint/format to match the project's real gateway.
 */
async function sendMessage(
  name: SplitMessageName,
  params: Record<string, unknown>,
): Promise<RawMessageResponse> {
  if (USE_MOCK) return mockSendMessage(name, params);

  try {
    const response = await apiClient.post<RawMessageResponse>('/api/message/send', {
      name,
      params,
    });
    return response.data;
  } catch (e) {
    return {
      isSuccessful: false,
      body: {},
      errorMessage: e instanceof Error ? e.message : 'Network error',
    };
  }
}

/** Kotlin: if (clotseq.isEmpty() || clotseq == "0") 0 else clotseq.toInt() (NaN -> 0 to avoid a crash) */
function toIntOrZero(value: string): number {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? 0 : n;
}

/** "A,B,C" -> ['A','B','C'] (Kotlin: wafer.split(",").count()) */
function parseWaferList(raw: string): string[] {
  return raw
    .split(',')
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

/** SLOTINFO */
export async function fetchLotInfo(
  lotId: string,
  facility: string,
): Promise<ServiceResult<SplitLotInfo>> {
  const res = await sendMessage('SLOTINFO', { lotId, facility });
  if (!res.isSuccessful) return { ok: false, message: res.errorMessage };

  const b = res.body;
  return {
    ok: true,
    data: {
      product: b.PRODUCT ?? '',
      operation: b.OPERATION ?? '',
      subOperation: b.SUBOPERATION ?? '',
      processStep: b.PROCESSSTEP ?? '',
      quantity: toIntOrZero(b.QUANTITY ?? ''),
      state: b.STATE ?? '',
      status: b.STATUS ?? '',
      holdStatus: b.HOLDSTATUS ?? '',
      batchId: b.BATCHID ?? '',
      waferList: parseWaferList(b.WAFERLIST ?? ''),
      sampleFlag: b.SAMPLEFLAG ?? '',
      rootLotName: b.ROOTLOTNAME ?? '',
      childLotSequence: toIntOrZero(b.CHILDLOTSEQUENCE ?? ''),
    },
  };
}

/** CALLCUSTOMER -> customer name ('' if the LOT doesn't belong to a customer) */
export async function fetchCustomer(product: string): Promise<ServiceResult<string>> {
  const res = await sendMessage('CALLCUSTOMER', { product });
  if (!res.isSuccessful) return { ok: false, message: res.errorMessage };
  return { ok: true, data: res.body.CUSTOMER ?? '' };
}

/**
 * getSplitLostList(): XML concatenated with no separator, one <ITEM> per child LOT.
 * Keeps the exact legacy format (no escaping, one tag per line, ITEMs appended back-to-back).
 */
export function buildSplitLostXml(items: SplitItem[]): string {
  return items
    .map((i) =>
      [
        '<ITEM>',
        `<SPLITLOTID>${i.splitLotId}</SPLITLOTID>`,
        `<SPLITQTY>${i.splitQty}</SPLITQTY>`,
        `<SPLITPROD>${i.splitProd}</SPLITPROD>`,
        `<WAFERID>${i.waferId}</WAFERID>`,
        '</ITEM>',
      ].join('\n'),
    )
    .join('');
}

/** SPLIT */
export async function submitSplit(req: SplitRequest): Promise<ServiceResult<null>> {
  const res = await sendMessage('SPLIT', {
    lotId: req.lotId,
    facility: req.facility,
    qty: String(req.qty),
    operation: req.operation,
    subOperation: req.subOperation,
    product: req.product,
    flag: 'N', // fixed "N" parameter from MessageFactoryUtil.split
    reserved1: '',
    reserved2: '',
    operatorId: req.operatorId,
    splitLostList: buildSplitLostXml(req.items),
    comment: req.comment,
  });
  if (!res.isSuccessful) return { ok: false, message: res.errorMessage };
  return { ok: true, data: null };
}
