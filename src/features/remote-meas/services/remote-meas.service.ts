import { useMainStore } from 'src/features/main/stores/main.store';
import apiClient from 'src/services/api-client';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import {
  mockRemoteMeasEqpInfo,
  mockRemoteMeasLotInfo,
  mockRemoteMeasPortStatus,
} from '../mocks/remote-meas.mock';
import type {
  RemoteMeasApiResult,
  RemoteMeasEqpInfo,
  RemoteMeasLotInfo,
  RemoteMeasPortStatus,
  RemoteMeasSlotInfo,
  RemoteMeasStartPayload,
} from '../types/remote-meas.types';

let forceMockMode = false;

export function setRemoteMeasMockMode(enabled: boolean): void {
  forceMockMode = enabled;
}

export function isRemoteMeasMockMode(): boolean {
  return forceMockMode;
}

function escapeXml(value: string): string {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getString(obj: Record<string, unknown> | null | undefined, key: string): string {
  if (!obj) return '';
  const val = obj[key];
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return '';
}

function getNumber(obj: Record<string, unknown> | null | undefined, key: string): number {
  if (!obj) return 0;
  const val = obj[key];
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return Number(val) || 0;
  return 0;
}

function buildMessage(messageName: string, fields: Array<[string, string]>): string {
  const mainStore = useMainStore();
  const receiver = mainStore.mobileServerName || 'HIFOS';
  const sender = mainStore.deviceName || 'PDA';
  const body = fields.map(([name, value]) => `<${name}>${escapeXml(value)}</${name}>`).join('\n');

  return [
    '<AIFMSG>',
    `<MSGNAME>${escapeXml(messageName)}</MSGNAME>`,
    `<RECEIVER>${escapeXml(receiver)}</RECEIVER>`,
    `<SENDER>${escapeXml(sender)}</SENDER>`,
    '<MSGTYPE>P</MSGTYPE>',
    '<WITHREPLY>YES</WITHREPLY>',
    '<STATUS></STATUS>',
    '<ERRMSG></ERRMSG>',
    '<TID></TID>',
    '<MSGBODY>',
    body,
    '</MSGBODY>',
    '</AIFMSG>',
  ].join('\n');
}

async function postMessage<T>(
  messageName: string,
  fields: Array<[string, string]>,
): Promise<RemoteMeasApiResult<T>> {
  try {
    const sMsg = buildMessage(messageName, fields);
    const flatPayload = Object.fromEntries(fields);
    const response = await apiClient.post<MessageResponseData>(
      `/hifos/${messageName.toLowerCase()}`,
      { sMsg, ...flatPayload },
    );
    if (!isResponseSuccessful(response.data)) {
      return { ok: false, message: getResponseErrorMessage(response.data) };
    }
    return { ok: true, data: parseMessageBody(response.data) as unknown as T };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : `${messageName} request failed.`,
    };
  }
}

export const remoteMeasApi = {
  async fetchLotInfo(
    lotId: string,
    facility: string,
  ): Promise<RemoteMeasApiResult<RemoteMeasLotInfo>> {
    if (isRemoteMeasMockMode()) {
      return { ok: true, data: { ...mockRemoteMeasLotInfo } };
    }

    const result = await postMessage<Record<string, unknown>>('LOTINFO', [
      ['TYPE', 'MVIN'],
      ['LOTID', lotId],
      ['FACILITY', facility],
    ]);

    if (!result.ok || !result.data) {
      return { ok: false, message: result.message };
    }

    const d = result.data;
    const lotInfo: RemoteMeasLotInfo = {
      product: getString(d, 'PRODUCT'),
      facility: getString(d, 'FACILITY'),
      operation: getString(d, 'OPERATION'),
      subOperation: getString(d, 'SUBOPERATION'),
      customer: getString(d, 'CUSTOMER'),
      category: getString(d, 'CATEGORY'),
      engineer: getString(d, 'ENGINEER'),
      packing: getString(d, 'PACKING'),
      quantity: getString(d, 'QUANTITY'),
      goodChips: getString(d, 'GOODCHIPS'),
      recipe: getString(d, 'RECIPE'),
      changeRecipe: getString(d, 'CHANGERECIPE'),
      measEqpId: getString(d, 'MEASEQPID'),
      changeEqpGroup: getString(d, 'CHANGEEQPGROUP'),
      commentQty: getNumber(d, 'COMMENTQTY'),
      nwCommentQty: getNumber(d, 'NWCOMMENTQTY'),
      batchId: getString(d, 'BATCHID'),
      area: getString(d, 'AREA'),
      workedEqpId: getString(d, 'WORKEDEQPID'),
      workedRecipe: getString(d, 'WORKEDRECIPE'),
      workedReticle: getString(d, 'WORKEDRETICLE'),
      jobCode: getString(d, 'JOBCODE'),
      processStep: getString(d, 'PROCESSSTEP'),
      opType: getString(d, 'OPTYPE'),
      status: getString(d, 'STATUS'),
      state: getString(d, 'STATE'),
      holdStatus: getString(d, 'HOLDSTATUS'),
      operSequence: getString(d, 'OPERSEQUENCE'),
      etcMsg: getString(d, 'ETCMSG'),
      machineName: getString(d, 'MACHINENAME'),
      portName: getString(d, 'PORTNAME'),
      machineRecipeName: getString(d, 'MACHINERECIPENAME'),
      lotResUser: getString(d, 'LOTRESUSER'),
      reworkFlag: getString(d, 'REWORKINFO'),
      oxMachine: getString(d, 'OXMACHINE'),
      skipAllowFlag: getString(d, 'SKIPALLOWFLAG'),
    };

    return { ok: true, data: lotInfo };
  },

  async fetchMachineInfo(params: {
    lotId: string;
    operation: string;
    subOperation: string;
    product: string;
    eqpId: string;
    opType: string;
    facility: string;
  }): Promise<RemoteMeasApiResult<RemoteMeasEqpInfo>> {
    if (isRemoteMeasMockMode()) {
      return { ok: true, data: { ...mockRemoteMeasEqpInfo } };
    }

    const result = await postMessage<Record<string, unknown>>('REMOTEMEASEQPINFO', [
      ['LOTID', params.lotId],
      ['OPERATION', params.operation],
      ['SUBOPERATION', params.subOperation],
      ['PRODUCT', params.product],
      ['EQPID', params.eqpId],
      ['OPTYPE', params.opType],
      ['FACILITY', params.facility],
    ]);

    if (!result.ok || !result.data) {
      return { ok: false, message: result.message };
    }

    const d = result.data;
    const eqpInfo: RemoteMeasEqpInfo = {
      mainEqpId: getString(d, 'MAINEQPID'),
      procEqpId: getString(d, 'PROCEQPID'),
      eqpArea: getString(d, 'EQPAREA'),
      eqpType: getString(d, 'EQPTYPE'),
      pmMessage: getString(d, 'PMMESSAGE'),
      portName: getString(d, 'PORTNAME'),
      recipeName: getString(d, 'RECIPENAME'),
    };

    return { ok: true, data: eqpInfo };
  },

  async fetchPortStatus(
    eqpId: string,
    portName: string,
  ): Promise<RemoteMeasApiResult<RemoteMeasPortStatus>> {
    if (isRemoteMeasMockMode()) {
      return { ok: true, data: { ...mockRemoteMeasPortStatus } };
    }

    const result = await postMessage<Record<string, unknown>>('MACHINEPORTSTATUS', [
      ['EQPID', eqpId],
      ['PORTNAME', portName],
    ]);

    if (!result.ok || !result.data) {
      return { ok: false, message: result.message };
    }

    const d = result.data;
    const portStatus: RemoteMeasPortStatus = {
      portStateName: getString(d, 'PORTSTATENAME'),
      portLotName: getString(d, 'PORTLOTNAME'),
      ackMsg: getString(d, 'ACKMSG'),
    };

    return { ok: true, data: portStatus };
  },

  async clearMachinePort(
    machineName: string,
    portName: string,
  ): Promise<RemoteMeasApiResult<null>> {
    if (isRemoteMeasMockMode()) {
      return { ok: true, data: null };
    }

    const result = await postMessage<Record<string, unknown>>('MACHINEPORTCLEAR', [
      ['MACHINENAME', machineName],
      ['PORTNAME', portName],
    ]);

    return result.ok ? { ok: true, data: null } : { ok: false, message: result.message };
  },

  async clearPort(machineName: string, portName: string): Promise<RemoteMeasApiResult<null>> {
    return this.clearMachinePort(machineName, portName);
  },

  async fetchSlotInfo(
    lotId: string,
    facility: string,
  ): Promise<RemoteMeasApiResult<RemoteMeasSlotInfo>> {
    if (isRemoteMeasMockMode()) {
      return {
        ok: true,
        data: {
          waferList: '01,02,03,04,05',
          quantity: 5,
          checkEtch: '',
        },
      };
    }

    const result = await postMessage<Record<string, unknown>>('SLOTINFO', [
      ['LOTID', lotId],
      ['FACILITY', facility],
    ]);

    if (!result.ok || !result.data) {
      return { ok: false, message: result.message };
    }

    const d = result.data;
    const slotInfo: RemoteMeasSlotInfo = {
      waferList: getString(d, 'WAFERLIST'),
      quantity: getNumber(d, 'QUANTITY'),
      checkEtch: getString(d, 'CHECKETCH'),
    };

    return { ok: true, data: slotInfo };
  },

  async startRemoteMeas(payload: RemoteMeasStartPayload): Promise<RemoteMeasApiResult<null>> {
    if (isRemoteMeasMockMode()) {
      return { ok: true, data: null };
    }

    const result = await postMessage<Record<string, unknown>>('MEASREMOTESTART', [
      ['MACHINENAME', payload.machineName],
      ['MACHINETYPE', payload.machineType],
      ['LOTNAME', payload.lotName],
      ['PORTNAME', payload.portName],
      ['RECIPENAME', payload.recipeName],
      ['PROCQTY', payload.procQty],
      ['MEASFLAG', payload.measFlag],
      ['PRODMACHINE', payload.prodMachine],
      ['REWORKFLAG', payload.reworkFlag],
      ['EVENTUSER', payload.eventUser],
      ['WFLIST', payload.wfList],
      ['PRODUCT', payload.product],
      ['OPERATION', payload.operation],
    ]);

    return result.ok ? { ok: true, data: null } : { ok: false, message: result.message };
  },

  async fetchEqpInfo(params: {
    lotId: string;
    operation: string;
    subOperation: string;
    product: string;
    eqpId: string;
    opType: string;
    facility: string;
  }): Promise<RemoteMeasApiResult<RemoteMeasEqpInfo>> {
    return this.fetchMachineInfo(params);
  },

  setMockMode(enabled: boolean): void {
    setRemoteMeasMockMode(enabled);
  },
};

export const remoteMeasService = remoteMeasApi;
