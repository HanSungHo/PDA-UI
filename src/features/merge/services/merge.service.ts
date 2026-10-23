import { useMainStore } from 'src/features/main/stores/main.store';
import apiClient from 'src/services/api-client';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

export interface MergeLotRow {
  LOTNAME: string;
  PRODUCTSPECNAME: string;
  PROCESSFLOWNAME: string;
  OPERATIONDESCRIPTION: string;
  PROCESSOPERATIONNAME: string;
  JOBCODE: string;
  PRODUCTQUANTITY: string;
}

export interface MergeLotInfo {
  AREA: string;
  LOTHOLDSTATE: string;
  PROCESSOPERATIONNAME: string;
  OPERATIONDESCRIPTION: string;
  PRODUCTSPECNAME: string;
  PRODUCTQUANTITY: string;
  REWORKSTATE: string;
  PROCESSFLOWNAME: string;
  CHECKMFGGROUP2: string;
  CHILDLOT: string;
  items: MergeLotRow[];
}

export interface ExecuteMergeRequest {
  facility: string;
  lotName: string;
  productSpec: string;
  route: string;
  operation: string;
  qty: string;
  operatorId: string;
  comment: string;
  mergeLot: string;
}

function value(body: Record<string, unknown>, key: string): string {
  const raw = body[key];
  return typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean'
    ? String(raw)
    : '';
}

export function parseMergeItems(items: unknown): MergeLotRow[] {
  const source = items && typeof items === 'object' && 'ITEM' in items ? items.ITEM : items;
  const list = Array.isArray(source) ? source : source == null ? [] : [source];
  return list
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      LOTNAME: value(item, 'LOTNAME'),
      PRODUCTSPECNAME: value(item, 'PRODUCTSPECNAME'),
      PROCESSFLOWNAME: value(item, 'PROCESSFLOWNAME'),
      OPERATIONDESCRIPTION: value(item, 'OPERATIONDESCRIPTION'),
      PROCESSOPERATIONNAME: value(item, 'PROCESSOPERATIONNAME'),
      JOBCODE: value(item, 'JOBCODE'),
      PRODUCTQUANTITY: value(item, 'PRODUCTQUANTITY'),
    }));
}

export function mapMergeLotInfo(body: Record<string, unknown>): MergeLotInfo {
  return {
    AREA: value(body, 'AREA'),
    LOTHOLDSTATE: value(body, 'LOTHOLDSTATE'),
    PROCESSOPERATIONNAME: value(body, 'PROCESSOPERATIONNAME'),
    OPERATIONDESCRIPTION: value(body, 'OPERATIONDESCRIPTION'),
    PRODUCTSPECNAME: value(body, 'PRODUCTSPECNAME'),
    PRODUCTQUANTITY: value(body, 'PRODUCTQUANTITY'),
    REWORKSTATE: value(body, 'REWORKSTATE'),
    PROCESSFLOWNAME: value(body, 'PROCESSFLOWNAME'),
    CHECKMFGGROUP2: value(body, 'CHECKMFGGROUP2'),
    CHILDLOT: value(body, 'CHILDLOT'),
    items: parseMergeItems(body.ITEMS),
  };
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function sendMergeMessage(
  name: string,
  fields: Array<[string, string]>,
): Promise<Record<string, unknown>> {
  const store = useMainStore();
  const sMsg = [
    '<AIFMSG>',
    `<MSGNAME>${name}</MSGNAME>`,
    `<RECEIVER>${escapeXml(store.mobileServerName)}</RECEIVER>`,
    `<SENDER>${escapeXml(store.deviceName)}</SENDER>`,
    '<MSGTYPE>P</MSGTYPE>',
    '<WITHREPLY>YES</WITHREPLY>',
    '<STATUS></STATUS>',
    '<ERRMSG></ERRMSG>',
    '<TID></TID>',
    '<MSGBODY>',
    ...fields.map(([key, fieldValue]) => `<${key}>${escapeXml(fieldValue)}</${key}>`),
    '</MSGBODY>',
    '</AIFMSG>',
  ].join('\n');
  const response = await apiClient.post<MessageResponseData>(`/hifos/${name.toLowerCase()}`, {
    sMsg,
  });
  if (!isResponseSuccessful(response.data)) throw new Error(getResponseErrorMessage(response.data));
  const result = JSON.parse(response.data.result) as { MSGBODY?: Record<string, unknown> };
  return result.MSGBODY ?? {};
}

// MessageFactoryUtil.getMergeLot
export async function getMergeLot(facility: string, lotId: string): Promise<MergeLotInfo> {
  const body = await sendMergeMessage('GETMERGELOT', [
    ['FACILITY', facility],
    ['LOTID', lotId],
  ]);
  return mapMergeLotInfo(body);
}

// MessageFactoryUtil.executeMergeLot
export async function executeMergeLot(
  request: ExecuteMergeRequest,
): Promise<{ FAILLOTNAME: string; SUCCESS: string }> {
  const body = await sendMergeMessage('EXECUTEMERGE', [
    ['FACTORYNAME', request.facility],
    ['LOTNAME', request.lotName],
    ['PRODUCTSPECNAME', request.productSpec],
    ['ROUTE', request.route],
    ['PROCESSOPERATIONNAME', request.operation],
    ['QTY', request.qty],
    ['OPERATORID', request.operatorId],
    ['COMMENT', request.comment],
    ['MERGELOT', request.mergeLot],
  ]);
  return { FAILLOTNAME: value(body, 'FAILLOTNAME'), SUCCESS: value(body, 'SUCCESS') };
}
