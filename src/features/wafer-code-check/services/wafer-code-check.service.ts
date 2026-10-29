import apiClient from 'src/services/api-client';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import type {
  WafercodecheckMessageResponse,
  WafercodecheckService,
} from '../types/wafer-code-check.types';
import * as messageFactory from './wafer-code-check.message-factory';

interface RawMessageResult {
  MSGBODY?: unknown;
}

function parseResponse(data: MessageResponseData): WafercodecheckMessageResponse {
  try {
    const result = JSON.parse(data.result) as RawMessageResult;
    const isSuccessFul =
      isResponseSuccessful(data) && result.MSGBODY !== undefined && result.MSGBODY !== '';
    const messageBody =
      isSuccessFul && result.MSGBODY && typeof result.MSGBODY === 'object'
        ? (result.MSGBODY as Record<string, unknown>)
        : {};

    return {
      isSuccessFul,
      messageBody,
      errorMessage: isSuccessFul ? '' : getResponseErrorMessage(data),
    };
  } catch {
    return { isSuccessFul: false, messageBody: {}, errorMessage: data.result };
  }
}

async function postMessage(
  messageName: string,
  sMsg: string,
): Promise<WafercodecheckMessageResponse> {
  const response = await apiClient.post<MessageResponseData>(`/hifos/${messageName}`, { sMsg });

  return parseResponse(response.data);
}

const httpService: WafercodecheckService = {
  getWaferTYpe(lotName) {
    return postMessage('getWaferTYpe', messageFactory.getWaferTYpe(lotName));
  },
  ComPareWaferType(lotName, waferType, initialBoxName, comment, userId) {
    return postMessage(
      'ComPareWaferType',
      messageFactory.ComPareWaferType(lotName, waferType, initialBoxName, comment, userId),
    );
  },
};

let activeService: WafercodecheckService = httpService;

export function setWafercodecheckService(service: WafercodecheckService): void {
  activeService = service;
}

export function resetWafercodecheckService(): void {
  activeService = httpService;
}

export const getWaferTYpe: WafercodecheckService['getWaferTYpe'] = (...args) =>
  activeService.getWaferTYpe(...args);
export const ComPareWaferType: WafercodecheckService['ComPareWaferType'] = (...args) =>
  activeService.ComPareWaferType(...args);
