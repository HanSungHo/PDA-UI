import { useMainStore } from 'src/features/main/stores/main.store';
import apiClient from 'src/services/api-client';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import type {
  LotInfoRequest,
  LotInfoResponse,
  MachinePortClearRequest,
  MachinePortStatusRequest,
  MachinePortStatusResponse,
  RamJobCancelRequest,
  RamJobCancelResponse,
  RecipeInfoAshRequest,
  RecipeInfoRequest,
  RecipeInfoResponse,
  RemoteRamcoApi,
  RemoteRamcoApiResult,
  WetRemoteEqpInfoRequest,
  WetRemoteEqpInfoResponse,
  WetRemoteStartRequest,
} from '../types/remote-ramco.types';

interface MessageHeader {
  messageName: string;
  receiver: string;
  sender: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildMessage(messageName: string, fields: Array<[string, string]>): string {
  const mainStore = useMainStore();
  const header: MessageHeader = {
    messageName,
    receiver: mainStore.mobileServerName,
    sender: mainStore.deviceName,
  };
  const body = fields.map(([name, value]) => `<${name}>${escapeXml(value)}</${name}>`).join('\n');

  return [
    '<AIFMSG>',
    `<MSGNAME>${escapeXml(header.messageName)}</MSGNAME>`,
    `<RECEIVER>${escapeXml(header.receiver)}</RECEIVER>`,
    `<SENDER>${escapeXml(header.sender)}</SENDER>`,
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
): Promise<RemoteRamcoApiResult<T>> {
  try {
    const response = await apiClient.post<MessageResponseData>(
      `/hifos/${messageName.toLowerCase()}`,
      { sMsg: buildMessage(messageName, fields) },
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

async function postCommand(
  messageName: string,
  fields: Array<[string, string]>,
): Promise<RemoteRamcoApiResult<null>> {
  const result = await postMessage<Record<string, string>>(messageName, fields);
  return result.ok ? { ok: true, data: null } : result;
}

export const remoteRamcoApi: RemoteRamcoApi = {
  fetchEquipmentInfo(request: WetRemoteEqpInfoRequest) {
    return postMessage<WetRemoteEqpInfoResponse>('WETREMOTEEQPINFO', [['EQPID', request.EQPID]]);
  },
  fetchLotInfo(request: LotInfoRequest) {
    return postMessage<LotInfoResponse>('LOTINFO', [
      ['TYPE', request.TYPE],
      ['LOTID', request.LOTID],
      ['FACILITY', request.FACILITY],
    ]);
  },
  fetchRecipeInfo(request: RecipeInfoRequest | RecipeInfoAshRequest) {
    const fields: Array<[string, string]> = [
      ['ISPHOTO', request.ISPHOTO],
      ['LOTID', request.LOTID],
      ['OPERATION', request.OPERATION],
      ['SUBOPERATION', request.SUBOPERATION],
      ['PRODUCT', request.PRODUCT],
      ['EQPID', request.EQPID],
      ['OPTYPE', request.OPTYPE],
      ['FACILITY', request.FACILITY],
    ];
    if ('CHMEQPID' in request) fields.push(['CHMEQPID', request.CHMEQPID]);
    return postMessage<RecipeInfoResponse>('RECIPEINFO', fields);
  },
  fetchPortStatus(request: MachinePortStatusRequest) {
    return postMessage<MachinePortStatusResponse>('MACHINEPORTSTATUS', [
      ['EQPID', request.EQPID],
      ['PORTNAME', request.PORTNAME],
      ['LOTID', request.LOTID],
      ['RECIPE', request.RECIPE],
    ]);
  },
  clearPort(request: MachinePortClearRequest) {
    return postCommand('MACHINEPORTCLEAR', [
      ['MACHINENAME', request.MACHINENAME],
      ['PORTNAME', request.PORTNAME],
    ]);
  },
  cancelJobs(request: RamJobCancelRequest) {
    return postMessage<RamJobCancelResponse>('RAMJOBCANCEL', [
      ['MACHINETYPE', request.MACHINETYPE],
      ['MACHINENAME', request.MACHINENAME],
      ['MACHINENAME2', request.MACHINENAME2],
      ['EVENTUSER', request.EVENTUSER],
      ['JOBNAME1', request.JOBNAME1],
      ['JOBNAME2', request.JOBNAME2],
    ]);
  },
  startRemote(request: WetRemoteStartRequest) {
    return postCommand('WETREMOTESTART', [
      ['MACHINENAME', request.MACHINENAME],
      ['MACHINENAME2', request.MACHINENAME2],
      ['MACHINETYPE', request.MACHINETYPE],
      ['AREANAME', request.AREANAME],
      ['NUMCASS', request.NUMCASS],
      ['LOTNAME', request.LOTNAME],
      ['LOTNAME2', request.LOTNAME2],
      ['RECIPENAME', request.RECIPENAME],
      ['JOBNAME', request.JOBNAME],
      ['PRODUCTQTY', request.PRODUCTQTY],
      ['PRODUCTQTY2', request.PRODUCTQTY2],
      ['OPERATION', request.OPERATION],
      ['OPERATION2', request.OPERATION2],
      ['EVENTUSER', request.EVENTUSER],
      ['ISCARRAY', request.ISCARRAY],
      ['BAY', request.BAY],
      ['STOCKER', request.STOCKER],
    ]);
  },
};

let activeApi: RemoteRamcoApi = remoteRamcoApi;

export function getRemoteRamcoApi(): RemoteRamcoApi {
  return activeApi;
}

export function setRemoteRamcoApi(api: RemoteRamcoApi): void {
  activeApi = api;
}

export function resetRemoteRamcoApi(): void {
  activeApi = remoteRamcoApi;
}
