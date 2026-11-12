import { type AifMessageField, postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import type {
  RawMessageResponse,
  ServiceResult,
  SplitItem,
  SplitLotInfo,
  SplitMessageName,
  SplitRequest,
} from '../types/split.types';

/**
 * Replaces MessageSender.send(...) + MessageFactoryUtil. The AIFMSG envelope and route follow
 * hifos2 (MessageName.SLOTINFO / CALLCUSTOMER / SPLIT), so the legacy app and this one can talk
 * to the same server.
 */
async function sendMessage(
  name: SplitMessageName,
  fields: readonly AifMessageField[],
): Promise<RawMessageResponse> {
  try {
    const response = await postAifMessage(name, name, fields);
    return isResponseSuccessful(response)
      ? { isSuccessful: true, body: parseMessageBody(response), errorMessage: '' }
      : { isSuccessful: false, body: {}, errorMessage: getResponseErrorMessage(response) };
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
  const res = await sendMessage('SLOTINFO', [
    ['LOTID', lotId],
    ['FACILITY', facility],
  ]);
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
  const res = await sendMessage('CALLCUSTOMER', [['PRODUCT', product]]);
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
  const res = await sendMessage('SPLIT', [
    ['LOTID', req.lotId],
    ['FACILITY', req.facility],
    ['QUANTITY', String(req.qty)],
    ['OPERATION', req.operation],
    ['SUBOPERATION', req.subOperation],
    ['PRODUCT', req.product],
    ['ISSAMPLE', 'N'], // fixed "N" parameter from MessageFactoryUtil.split
    ['SAMPLEOPER', ''],
    ['SAMPLESUBOPER', ''],
    ['OPERATORID', req.operatorId],
    ['SPLITITEMS', { xml: buildSplitLostXml(req.items) }],
    ['COMMENT', req.comment],
  ]);
  if (!res.isSuccessful) return { ok: false, message: res.errorMessage };
  return { ok: true, data: null };
}
