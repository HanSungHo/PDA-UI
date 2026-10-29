import { sendMessage } from 'src/services/message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

export interface ESheetMessageResult<TData> {
  ok: boolean;
  data?: TData;
  message?: string;
}

export interface ESheetMaskInfo {
  RETICLETAG: string;
  PRODUCT: string;
  GIBEN: string;
  STATUS: string;
  ISUSE: string;
  CURRLOC: string;
  SUBLOCATION3: string;
  AFTERINSP: string;
}

export interface ESheetPcmReworkRecipe {
  PCMREQPLIST: string;
  RECIPELIST: string;
  PCMRESULT: string;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : '';
}

function readItems(value: unknown): ESheetMaskInfo[] {
  if (Array.isArray(value)) return value as ESheetMaskInfo[];
  if (!value || typeof value !== 'object' || !('ITEM' in value)) return [];

  const items = (value as { ITEM?: unknown }).ITEM;
  if (Array.isArray(items)) return items as ESheetMaskInfo[];
  return items && typeof items === 'object' ? [items as ESheetMaskInfo] : [];
}

async function request<TData>(
  messageName: string,
  payload: Record<string, string>,
  mapBody: (body: Record<string, string>) => TData,
): Promise<ESheetMessageResult<TData>> {
  const response = await sendMessage(messageName, payload);
  if (!isResponseSuccessful(response)) {
    return { ok: false, message: getResponseErrorMessage(response) };
  }

  return { ok: true, data: mapBody(parseMessageBody(response)) };
}

export function fetchESheetPcmReworkRecipe(
  lotId: string,
): Promise<ESheetMessageResult<ESheetPcmReworkRecipe>> {
  return request('PCMREWORKRECIPE', { LOTID: lotId }, (body) => ({
    PCMREQPLIST: stringValue(body.PCMREQPLIST),
    RECIPELIST: stringValue(body.RECIPELIST),
    PCMRESULT: stringValue(body.PCMRESULT),
  }));
}

export function fetchESheetFutureActions(
  lotId: string,
  operation: string,
  subOperation: string,
): Promise<ESheetMessageResult<string>> {
  return request(
    'CHECKFUTURE',
    { LOTNAME: lotId, OPERATION: operation, SUBOPERATION: subOperation },
    (body) => stringValue(body.FUTURELIST),
  );
}

export function fetchESheetMaskInfo(
  reticleId: string,
  facility: string,
): Promise<ESheetMessageResult<ESheetMaskInfo[]>> {
  return request('MASKINFO', { ID_IDENT: 'T', RETICLEID: reticleId, FACILITY: facility }, (body) =>
    readItems(body.ITEMS),
  );
}

export function fetchESheetWaferList(lotId: string): Promise<ESheetMessageResult<string>> {
  return request('GETWAFER', { LOTID: lotId }, (body) => stringValue(body.WAFERLIST));
}
