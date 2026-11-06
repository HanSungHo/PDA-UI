import apiClient from 'src/services/api-client';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import type {
  CvdTestBodyInfoResult,
  CvdTestMainInfoResult,
  CvdTestSubInfoResult,
  GridRowData,
} from '../types/test-tuning.types';

async function postMessage(
  messageName: string,
  payload: Record<string, string>,
): Promise<MessageResponseData> {
  const response = await apiClient.post<MessageResponseData>('/message/send', {
    messageName,
    payload,
  });

  return response.data;
}

// Mirrors ResponseDataToJsonUtil.getMessageBodyNullCheckList(result, "BODY"), which reads
// MSGBODY.BODY.ITEM as either an array, a single object (one row), or absent.
function parseBodyItems(body: unknown): GridRowData[] {
  if (Array.isArray(body)) return body as GridRowData[];
  if (body && typeof body === 'object' && 'ITEM' in body) {
    const entries = body.ITEM;
    if (Array.isArray(entries)) return entries as GridRowData[];
    return entries == null ? [] : [entries];
  }
  return [];
}

export const testTuningService = {
  // Kotlin: MessageFactoryUtil.cvdTestMainInfo(eqpId) -> CVDTESTMAININFO
  async getMainInfo(eqpId: string): Promise<CvdTestMainInfoResult> {
    const response = await postMessage('CVDTESTMAININFO', { EQPID: eqpId });

    if (!isResponseSuccessful(response)) {
      return { ok: false, message: getResponseErrorMessage(response) };
    }

    const messageBody = parseMessageBody(response);
    return { ok: true, rcpGroup: messageBody.RCP_GROUP ?? '' };
  },

  // Kotlin: MessageFactoryUtil.cvdTestSubInfo(eqpId, mainId, typeId) -> CVDTESTSUBINFO
  async getSubInfo(eqpId: string, mainId: string, typeId: string): Promise<CvdTestSubInfoResult> {
    const response = await postMessage('CVDTESTSUBINFO', {
      EQPID: eqpId,
      MAINID: mainId,
      TYPEID: typeId,
    });

    if (!isResponseSuccessful(response)) {
      return { ok: false, message: getResponseErrorMessage(response) };
    }

    const messageBody = parseMessageBody(response);
    return { ok: true, subId: messageBody.SUBID ?? '' };
  },

  // Kotlin: MessageFactoryUtil.cvdTestBodyInfo(eqpId, mainId, subId, typeId) -> CVDTESTBODYINFO
  async getBodyInfo(
    eqpId: string,
    mainId: string,
    subId: string,
    typeId: string,
  ): Promise<CvdTestBodyInfoResult> {
    const response = await postMessage('CVDTESTBODYINFO', {
      EQPID: eqpId,
      MAINID: mainId,
      SUBID: subId,
      TYPEID: typeId,
    });

    if (!isResponseSuccessful(response)) {
      return { ok: false, message: getResponseErrorMessage(response) };
    }

    const messageBody = parseMessageBody(response) as unknown as {
      LOTID?: string;
      BODY?: unknown;
    };
    return {
      ok: true,
      lotId: messageBody.LOTID ?? '',
      body: parseBodyItems(messageBody.BODY),
    };
  },
};
