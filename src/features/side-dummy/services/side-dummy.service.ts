import { DeviceInfo } from 'src/constants/device-info';
import { MOBILE_SERVER_NAME } from 'src/constants/server';
import { useMainStore } from 'src/features/main/stores/main.store';
import apiClient from 'src/services/api-client';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import {
  mockSideDummyEqpWithLot,
  mockSideDummyEqpWithoutLot,
  mockSideDummyInsertSuccess,
  mockSideDummyLotInfo,
} from '../mocks/side-dummy.mock';
import type {
  SideDmmApiResult,
  SideDmmInsertPayload,
  SideDmmInsertResponse,
  SideDmmSelectEqpResponse,
  SideDmmSelectLotResponse,
} from '../types/side-dummy.types';

let forceMockMode = false;

export function setSideDummyMockMode(enabled: boolean): void {
  forceMockMode = enabled;
}

export function isSideDummyMockMode(): boolean {
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

function buildMessage(messageName: string, fields: Array<[string, string]>): string {
  const mainStore = useMainStore();
  const receiver = mainStore.mobileServerName || MOBILE_SERVER_NAME;
  const sender = mainStore.deviceName || DeviceInfo.DEVICE_NAME;
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
): Promise<SideDmmApiResult<T>> {
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

export const sideDummyService = {
  /**
   * Queries equipment status to check whether a side dummy wafer is currently loaded.
   */
  async selectEqp(eqpId: string): Promise<SideDmmApiResult<SideDmmSelectEqpResponse>> {
    if (forceMockMode) {
      if (eqpId === 'EQP-EMPTY') {
        return { ok: true, data: mockSideDummyEqpWithoutLot };
      }
      return { ok: true, data: mockSideDummyEqpWithLot };
    }

    const fields: Array<[string, string]> = [
      ['EVENT_NAME', 'EQP'],
      ['EQPID', eqpId],
    ];
    return postMessage<SideDmmSelectEqpResponse>('SIDEDMMSELECT', fields);
  },

  /**
   * Queries dummy lot information for the specified equipment.
   */
  async selectLot(
    lotId: string,
    eqpId: string,
  ): Promise<SideDmmApiResult<SideDmmSelectLotResponse>> {
    if (forceMockMode) {
      return { ok: true, data: mockSideDummyLotInfo };
    }

    const fields: Array<[string, string]> = [
      ['EVENT_NAME', 'LOT'],
      ['LOTNAME', lotId],
      ['EQPID', eqpId],
    ];
    return postMessage<SideDmmSelectLotResponse>('SIDEDMMSELECT', fields);
  },

  /**
   * Executes IN or OUT transaction for the side dummy wafer.
   */
  async insertInOut(
    payload: SideDmmInsertPayload,
  ): Promise<SideDmmApiResult<SideDmmInsertResponse>> {
    if (forceMockMode) {
      return { ok: true, data: mockSideDummyInsertSuccess };
    }

    const fields: Array<[string, string]> = [
      ['EVENT_NAME', payload.eventName],
      ['EQPID', payload.eqpId],
      ['LOTNAME', payload.lotId],
      ['OPERID', payload.operId],
      ['OPERDESC', payload.operDesc],
      ['INUSER', payload.inUser],
    ];
    return postMessage<SideDmmInsertResponse>('SIDEDMMINSERT', fields);
  },
};
