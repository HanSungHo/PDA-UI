import { COMMON_FIELD } from 'src/constants/common-strings';
import { postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import type {
  AegisCommentItem,
  AegisLotInfoItem,
  AegisRemoteStartPayload,
  AegisServiceResult,
  MachinePortStatusData,
  RemoteEqpInfoData,
  SlotInfoData,
} from '../types/remote-aegis.types';

function asString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return '';
}

export function extractItemList<T>(container: unknown): T[] {
  if (!container) return [];
  if (Array.isArray(container)) return container as T[];
  if (typeof container === 'object') {
    const record = container as Record<string, unknown>;
    const item = record[COMMON_FIELD.ITEM] ?? record.item;
    if (!item) return [];
    if (Array.isArray(item)) return item as T[];
    if (typeof item === 'object') return [item as T];
  }
  return [];
}

// Android MessageName constants for AEGIS endpoints use mixed-case URL paths:
//   AegisLotInfo → /hifos/AegisLotInfo
//   AegisRemoteStart → /hifos/AegisRemoteStart
//   AegisModeChange → /hifos/AegisModeChange
// Other messages (REMOTEEQPINFO, MACHINEPORTSTATUS, etc.) are already lowercase.
const AEGIS_ENDPOINTS: Record<string, string> = {
  AEGISLOTINFO: 'AegisLotInfo',
  AEGISREMOTESTART: 'AegisRemoteStart',
  AEGISMODECHANGE: 'AegisModeChange',
};

async function sendAegisMessage<T>(
  messageName: string,
  fields: readonly [string, string][],
): Promise<AegisServiceResult<T>> {
  try {
    // Determine endpoint: AEGIS-specific messages preserve mixed-case URL (Android parity).
    const endpointName = AEGIS_ENDPOINTS[messageName] ?? messageName;
    const preserveCase = messageName in AEGIS_ENDPOINTS;
    const rawData = preserveCase
      ? await postAifMessage(endpointName, messageName, fields, { preserveEndpointCase: true })
      : await postAifMessage(endpointName, messageName, fields);
    if (!isResponseSuccessful(rawData)) {
      return { ok: false, message: getResponseErrorMessage(rawData) };
    }
    const resultObj = (() => {
      try {
        return JSON.parse(rawData.result) as Record<string, unknown>;
      } catch {
        return null;
      }
    })();
    const body = resultObj ? resultObj[COMMON_FIELD.MSGBODY] : null;
    if (body === undefined || body === null || body === '') {
      return { ok: false, message: 'BODY가 존재하지 않습니다' };
    }
    return { ok: true, message: '', data: parseMessageBody(rawData) as unknown as T };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : '',
    };
  }
}

export const remoteAegisService = {
  async fetchRemoteEqpInfo(eqpId: string): Promise<AegisServiceResult<RemoteEqpInfoData>> {
    const res = await sendAegisMessage<Record<string, unknown>>('REMOTEEQPINFO', [
      ['EQPID', eqpId],
    ]);
    if (!res.ok || !res.data) {
      return { ok: false, message: res.message };
    }
    return {
      ok: true,
      message: '',
      data: {
        pCount: asString(res.data.PCOUNT),
        portName: asString(res.data.PORTNAME),
        pmMessage: asString(res.data.PMMESSAGE),
        mainEqpId: asString(res.data.MAINEQPID),
      },
    };
  },

  async fetchMachinePortStatus(
    eqpId: string,
    portName: string,
  ): Promise<AegisServiceResult<MachinePortStatusData>> {
    const res = await sendAegisMessage<Record<string, unknown>>('MACHINEPORTSTATUS', [
      ['EQPID', eqpId],
      ['PORTNAME', portName],
    ]);
    if (!res.ok || !res.data) {
      return { ok: false, message: res.message };
    }
    return {
      ok: true,
      message: '',
      data: {
        portStateName: asString(res.data.PORTSTATENAME),
        ackMsg: asString(res.data.ACKMSG),
      },
    };
  },

  async executeMachinePortClear(
    mainEqpId: string,
    portName: string,
  ): Promise<AegisServiceResult<Record<string, unknown>>> {
    return sendAegisMessage('MACHINEPORTCLEAR', [
      ['MACHINENAME', mainEqpId],
      ['PORTNAME', portName],
    ]);
  },

  async executeAegisModeChange(
    machine: string,
    mode: 'LOCAL' | 'REMOTE',
    userId: string,
    userName: string,
  ): Promise<AegisServiceResult<Record<string, unknown>>> {
    return sendAegisMessage('AEGISMODECHANGE', [
      ['MACHINENAME', machine],
      ['MODE', mode],
      ['USERID', userId],
      ['USERNAME', userName],
    ]);
  },

  async fetchAegisLotInfo(
    lotId: string,
    machine: string,
  ): Promise<AegisServiceResult<AegisLotInfoItem[]>> {
    const res = await sendAegisMessage<Record<string, unknown>>('AEGISLOTINFO', [
      ['LOTID', lotId],
      ['MACHINE', machine],
    ]);
    if (!res.ok || !res.data) {
      return { ok: false, message: res.message };
    }
    const rawItems = extractItemList<Record<string, unknown>>(res.data.ITEMS ?? res.data.items);
    const mapped: AegisLotInfoItem[] = rawItems.map((item) => ({
      lotHoldState: asString(item.LOTHOLDSTATE),
      lotProcessState: asString(item.LOTPROCESSSTATE),
      jobCode: asString(item.JOBCODE),
      productQuantity: asString(item.PRODUCTQUANTITY),
      operDesc: asString(item.OPERDESC),
      operCode: asString(item.OPERCODE),
      productSpecName: asString(item.PRODUCTSPECNAME),
      recipe: asString(item.RECIPE),
      machineName: asString(item.MACHINENAME),
      fab: asString(item.FAB),
      engineerName: asString(item.ENGINEERNAME),
      ownerCode: asString(item.OWNERCODE),
      safeLaunchLot: asString(item.SAFELAUNCHLOT),
      inlineSampleMessage: asString(item.INLINESAMPLEMESSGE ?? item.INLINESAMPLEMESSAGE),
    }));
    return { ok: true, message: '', data: mapped };
  },

  async fetchCommentList(
    lotId: string,
    facility: string,
    operation: string,
    subOperation: string,
    operSequence: string,
  ): Promise<AegisServiceResult<AegisCommentItem[]>> {
    const res = await sendAegisMessage<Record<string, unknown>>('COMMENTLIST', [
      ['LOTID', lotId],
      ['FACILITY', facility],
      ['OPERATION', operation],
      ['SUBOPERATION', subOperation],
      ['OPERSEQUENCE', operSequence],
    ]);
    if (!res.ok || !res.data) {
      return { ok: false, message: res.message };
    }
    // Strict parsing (Android parity): COMMENTITEMS must contain ITEM array/object.
    // Android getMessageBodyList throws JSONException if COMMENTITEMS.ITEM is missing,
    // which prevents START from executing when comment data is malformed.
    const commentContainer = res.data.COMMENTITEMS ?? res.data.commentitems;
    if (
      !commentContainer ||
      typeof commentContainer !== 'object' ||
      Array.isArray(commentContainer)
    ) {
      // Malformed: COMMENTITEMS missing or is a flat array instead of { ITEM: [...] }
      return { ok: true, message: '', data: [], parseError: true };
    }
    const rawItems = extractItemList<Record<string, unknown>>(commentContainer);
    const mapped: AegisCommentItem[] = rawItems.map((item) => ({
      isCheck: asString(item.ISCHECK),
      trackType: asString(item.TRACKTYPE),
    }));
    return { ok: true, message: '', data: mapped };
  },

  async fetchSlotInfo(lotId: string, facility: string): Promise<AegisServiceResult<SlotInfoData>> {
    const res = await sendAegisMessage<Record<string, unknown>>('SLOTINFO', [
      ['LOTID', lotId],
      ['FACILITY', facility],
    ]);
    if (!res.ok || !res.data) {
      return { ok: false, message: res.message };
    }
    return {
      ok: true,
      message: '',
      data: {
        waferList: asString(res.data.WAFERLIST),
      },
    };
  },

  async executeAegisRemoteStart(
    payload: AegisRemoteStartPayload,
  ): Promise<AegisServiceResult<Record<string, unknown>>> {
    return sendAegisMessage('AEGISREMOTESTART', [
      ['MACHINENAME', payload.machineName],
      ['RECIPE', payload.recipe],
      ['PORTNAME', payload.portName],
      ['RUN_NO', payload.runNo],
      ['PRODEQP', payload.prodEqp],
      ['SLOT', payload.slot],
      ['USERID', payload.userId ?? ''],
      ['USERNAME', payload.userName ?? ''],
    ]);
  },
};
