import { useMainStore } from 'src/features/main/stores/main.store';
import apiClient from 'src/services/api-client';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

export type ImpBody = Record<string, unknown>;
export type ImpResult = { ok: true; body: ImpBody } | { ok: false; message: string };

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function sendImpMessage(
  name: string,
  fields: Array<[string, string]>,
): Promise<ImpResult> {
  const store = useMainStore();
  const body = fields.map(([key, value]) => `<${key}>${escapeXml(value)}</${key}>`);
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
    ...body,
    '</MSGBODY>',
    '</AIFMSG>',
  ].join('\n');
  try {
    const response = await apiClient.post<MessageResponseData>(`/hifos/${name.toLowerCase()}`, {
      sMsg,
    });
    if (!isResponseSuccessful(response.data)) {
      return { ok: false, message: getResponseErrorMessage(response.data) };
    }
    const parsed = JSON.parse(response.data.result) as { MSGBODY?: ImpBody };
    return { ok: true, body: parsed.MSGBODY ?? {} };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : `${name} request failed.`,
    };
  }
}

export const impApi = {
  lotInfo: (lotId: string, facility: string) =>
    sendImpMessage('LOTINFO', [
      ['TYPE', 'MVIN'],
      ['LOTID', lotId],
      ['FACILITY', facility],
    ]),
  remoteEqpInfo: (eqpId: string) => sendImpMessage('REMOTEEQPINFO', [['EQPID', eqpId]]),
  recipeInfo: (
    lotId: string,
    operation: string,
    subOperation: string,
    product: string,
    eqpId: string,
    opType: string,
    facility: string,
  ) =>
    sendImpMessage('RECIPEINFO', [
      ['ISPHOTO', 'N'],
      ['LOTID', lotId],
      ['OPERATION', operation],
      ['SUBOPERATION', subOperation],
      ['PRODUCT', product],
      ['EQPID', eqpId],
      ['OPTYPE', opType],
      ['FACILITY', facility],
    ]),
  memorization: (eqpId: string, recipe: string, lotId: string) =>
    sendImpMessage('MEMORIZATION', [
      ['EQPID', eqpId],
      ['RECIPE', recipe],
      ['LOTID', lotId],
      ['PORTNAME', ''],
      ['CH_EQPID', eqpId],
      ['USER_ID', ''],
      ['EQP_TYPE', 'IMP'],
    ]),
  machinePortStatus: (eqpId: string, portName: string) =>
    sendImpMessage('MACHINEPORTSTATUS', [
      ['EQPID', eqpId],
      ['PORTNAME', portName],
    ]),
  machinePortClean: (eqpId: string, portName: string) =>
    sendImpMessage('MACHINEPORTCLEAR', [
      ['MACHINENAME', eqpId],
      ['PORTNAME', portName],
    ]),
  areaBayInfo: (facility: string) => sendImpMessage('AREABAYINFO', [['FACILITY', facility]]),
  bayStockerInfo: (bay: string, facility: string) =>
    sendImpMessage('BAYSTOCKERINFO', [
      ['BAY', bay],
      ['FACILITY', facility],
    ]),
  impRemoteStart: (fields: {
    machineName: string;
    machineType: string;
    lotName: string;
    portName: string;
    recipeName: string;
    jobCode: string;
    productName: string;
    operation: string;
    isCarry: string;
    bay: string;
    stocker: string;
    eventUser: string;
  }) =>
    sendImpMessage('IMPREMOTESTART', [
      ['MACHINENAME', fields.machineName],
      ['MACHINETYPE', fields.machineType],
      ['LOTNAME1', fields.lotName],
      ['LOTNAME2', ''],
      ['PORTNAME', fields.portName],
      ['RECIPENAME', fields.recipeName],
      ['JOBCODE1', fields.jobCode],
      ['JOBCODE2', ''],
      ['PRODUCTNAME1', fields.productName],
      ['PRODUCTNAME2', ''],
      ['OPERATION1', fields.operation],
      ['OPERATION2', ''],
      ['ISCARRY', fields.isCarry],
      ['BAY', fields.bay],
      ['STOCKER', fields.stocker],
      ['EVENTUSER', fields.eventUser],
    ]),
};

export type ImpApi = typeof impApi;
