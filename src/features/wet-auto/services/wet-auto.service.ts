import { useMainStore } from 'src/features/main/stores/main.store';
import apiClient from 'src/services/api-client';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import type {
  WetAutoApi,
  WetAutoApiResult,
  WetAutoBayRequest,
  WetAutoBayResponse,
  WetAutoEquipmentRequest,
  WetAutoEquipmentResponse,
  WetAutoLotRequest,
  WetAutoLotResponse,
  WetAutoRecipeRequest,
  WetAutoRecipeResponse,
  WetAutoStartRequest,
  WetAutoStockerRequest,
  WetAutoStockerResponse,
} from '../types/wet-auto.types';

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
  const body = fields.map(([name, value]) => `<${name}>${escapeXml(value)}</${name}>`).join('\n');

  return [
    '<AIFMSG>',
    `<MSGNAME>${messageName}</MSGNAME>`,
    `<RECEIVER>${escapeXml(mainStore.mobileServerName)}</RECEIVER>`,
    `<SENDER>${escapeXml(mainStore.deviceName)}</SENDER>`,
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
): Promise<WetAutoApiResult<T>> {
  try {
    const response = await apiClient.post<MessageResponseData>(
      `/hifos/${messageName.toLowerCase()}`,
      { sMsg: buildMessage(messageName, fields) },
    );
    if (!isResponseSuccessful(response.data)) {
      return { ok: false, message: getResponseErrorMessage(response.data) };
    }

    const messageBody = parseMessageBody(response.data);
    if (!Object.keys(messageBody).length) {
      return { ok: false, message: getResponseErrorMessage(response.data) };
    }

    return { ok: true, data: messageBody as T };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : `${messageName} request failed.`,
    };
  }
}

function postCommand(
  messageName: string,
  fields: Array<[string, string]>,
): Promise<WetAutoApiResult<null>> {
  return postMessage<Record<string, string>>(messageName, fields).then((result) =>
    result.ok ? { ok: true, data: null } : result,
  );
}

export const wetAutoApi: WetAutoApi = {
  fetchEquipment(request: WetAutoEquipmentRequest) {
    return postMessage<WetAutoEquipmentResponse>('WETREMOTEEQPINFO', [['EQPID', request.EQPID]]);
  },
  fetchLot(request: WetAutoLotRequest) {
    return postMessage<WetAutoLotResponse>('LOTINFO', [
      ['TYPE', request.TYPE],
      ['LOTID', request.LOTID],
      ['FACILITY', request.FACILITY],
    ]);
  },
  fetchRecipe(request: WetAutoRecipeRequest) {
    return postMessage<WetAutoRecipeResponse>('RECIPEINFO', [
      ['ISPHOTO', request.ISPHOTO],
      ['LOTID', request.LOTID],
      ['OPERATION', request.OPERATION],
      ['SUBOPERATION', request.SUBOPERATION],
      ['PRODUCT', request.PRODUCT],
      ['EQPID', request.EQPID],
      ['OPTYPE', request.OPTYPE],
      ['FACILITY', request.FACILITY],
    ]);
  },
  fetchBays(request: WetAutoBayRequest) {
    return postMessage<WetAutoBayResponse>('AREABAYINFO', [['FACILITY', request.FACILITY]]);
  },
  fetchStockers(request: WetAutoStockerRequest) {
    return postMessage<WetAutoStockerResponse>('BAYSTOCKERINFO', [
      ['BAY', request.BAY],
      ['FACILITY', request.FACILITY],
    ]);
  },
  start(request: WetAutoStartRequest) {
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

let activeApi: WetAutoApi = wetAutoApi;

export function getWetAutoApi(): WetAutoApi {
  return activeApi;
}

export function setWetAutoApi(api: WetAutoApi): void {
  activeApi = api;
}

export function resetWetAutoApi(): void {
  activeApi = wetAutoApi;
}
