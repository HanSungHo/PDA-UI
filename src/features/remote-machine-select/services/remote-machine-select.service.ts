import { useMainStore } from 'src/features/main/stores/main.store';
import apiClient from 'src/services/api-client';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import type { RemoteMachineResponse } from '../types/remote-machine-select.types';

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

function wrapMessage(
  messageName: string,
  fields: Array<[string, string]>,
  header: MessageHeader,
): string {
  const body = fields.map(([name, value]) => `<${name}>${escapeXml(value)}</${name}>`).join('\n');

  return [
    '<AIFMSG>',
    `<MSGNAME>${escapeXml(messageName)}</MSGNAME>`,
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

function buildMessage(messageName: string, fields: Array<[string, string]>): string {
  const mainStore = useMainStore();

  return wrapMessage(messageName, fields, {
    messageName,
    receiver: mainStore.mobileServerName,
    sender: mainStore.deviceName,
  });
}

async function postMessage(
  messageName: string,
  xmlMessage: string,
  endpoint = messageName.toLowerCase(),
): Promise<RemoteMachineResponse> {
  try {
    const response = await apiClient.post<MessageResponseData>(`/hifos/${endpoint}`, {
      sMsg: xmlMessage,
    });
    const passed = isResponseSuccessful(response.data);
    const messageBody = passed
      ? (JSON.parse(response.data.result) as Record<string, unknown>).MSGBODY
      : undefined;
    const isSuccess =
      passed && messageBody !== undefined && messageBody !== null && messageBody !== '';

    return {
      isSuccess,
      messageBody: isSuccess ? parseMessageBody(response.data) : {},
      errorMessage: isSuccess
        ? ''
        : passed
          ? 'BODY가 존재하지 않습니다'
          : getResponseErrorMessage(response.data),
    };
  } catch (error) {
    return {
      isSuccess: false,
      messageBody: {},
      errorMessage: error instanceof Error ? error.message : `${messageName} request failed.`,
    };
  }
}

export function lotInfo(
  type: string,
  lotId: string,
  facility: string,
): Promise<RemoteMachineResponse> {
  return postMessage(
    'LOTINFO',
    buildMessage('LOTINFO', [
      ['TYPE', type],
      ['LOTID', lotId],
      ['FACILITY', facility],
    ]),
  );
}

export function remoteEQPInfo2(
  eqpId: string,
  type: string,
  lotId: string,
  facility: string,
  operation: string,
  subOperation: string,
): Promise<RemoteMachineResponse> {
  return postMessage(
    'REMOTEEQPINFO2',
    buildMessage('REMOTEEQPINFO2', [
      ['EQPID', eqpId],
      ['TYPE', type],
      ['LOTID', lotId],
      ['FACILITY', facility],
      ['OPERATION', operation],
      ['SUBOPERATION', subOperation],
    ]),
  );
}

export function remoteEQPEENInfo(
  eqpId: string,
  type: string,
  lotId: string,
  facility: string,
  operation: string,
  subOperation: string,
): Promise<RemoteMachineResponse> {
  return postMessage(
    'REMOTEEQPEENINFO',
    buildMessage('REMOTEEQPEENINFO', [
      ['EQPID', eqpId],
      ['TYPE', type],
      ['LOTID', lotId],
      ['FACILITY', facility],
      ['OPERATION', operation],
      ['SUBOPERATION', subOperation],
    ]),
    'remoteeqpinfo',
  );
}

export function machinePortStatus(eqpId: string, portName: string): Promise<RemoteMachineResponse> {
  return postMessage(
    'MACHINEPORTSTATUS',
    buildMessage('MACHINEPORTSTATUS', [
      ['EQPID', eqpId],
      ['PORTNAME', portName],
    ]),
  );
}

export function photoChangeEQPStatus(
  machineName: string,
  eventUser: string,
): Promise<RemoteMachineResponse> {
  return postMessage(
    'PHOTOCHANGEEQPSTATUS',
    buildMessage('PHOTOCHANGEEQPSTATUS', [
      ['FACTORYNAME', 'FABCJ4'],
      ['MACHINETYPE', 'ProductionMachine'],
      ['STATEMODELNAME', 'EQP'],
      ['MACHINENAME', machineName],
      ['STATENAME', '가동중'],
      ['DESCRIPTION', 'PROD_ST'],
      ['MESSTATE', 'RUN'],
      ['MAINSTATUS', 'RUN'],
      ['SUBSTATUS', '가동중'],
      ['CTYPE', 'R'],
      ['DOWNCODE', 'RR001'],
      ['EVENTUSER', eventUser],
      ['EVENTCOMMENT', 'State Change In AUTO UI'],
      ['ENTITYTYPE', 'TRACK'],
      ['CHAMBERMACHINE', ''],
      ['STATUS', ''],
    ]),
  );
}

export function photoLotStart(fields: Array<[string, string]>): Promise<RemoteMachineResponse> {
  return postMessage('PHOTOLOTSTART', buildMessage('PHOTOLOTSTART', fields));
}

export function photoLotReserve(
  machineName: string,
  portName: string,
  lotName: string,
): Promise<RemoteMachineResponse> {
  return postMessage(
    'PHOTOLOTRESERVE',
    buildMessage('PHOTOLOTRESERVE', [
      ['MACHINENAME', machineName],
      ['PORTNAME', portName],
      ['LOTNAME', lotName],
    ]),
  );
}
