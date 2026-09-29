import apiClient from 'src/services/api-client';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import type { EenAddResponse, EenAddService } from '../types/een-add.types';
import * as messageFactory from './een-add.message-factory';

function parseResponse(data: unknown): EenAddResponse {
  const response = data as MessageResponseData;
  const isSuccess = isResponseSuccessful(response);
  const messageBody = isSuccess ? parseMessageBody(response) : {};
  const errorMessage = isSuccess ? '' : getResponseErrorMessage(response);

  return { isSuccess, messageBody, errorMessage };
}

async function postMessage(messageName: string, message: string): Promise<EenAddResponse> {
  const response = await apiClient.post(`/hifos/${messageName}`, { sMsg: message });

  return parseResponse(response.data);
}

const httpService: EenAddService = {
  getProcessFlow(facility, product, processOperation) {
    return postMessage(
      'message',
      messageFactory.getProcessFlow(facility, product, processOperation),
    );
  },
  getProcessOperation(facility, product, processFlow) {
    return postMessage(
      'message',
      messageFactory.getProcessOperation(facility, product, processFlow),
    );
  },
  getTagId(facility) {
    return postMessage('gettagid', messageFactory.getTagId(facility));
  },
  getTagPosition(lotId) {
    return postMessage('gettagposition', messageFactory.getTagPosition(lotId));
  },
  insertEen(
    lotId,
    userId,
    facility,
    product,
    operation,
    actionPoint,
    processFlow,
    tagComment,
    tagId,
  ) {
    return postMessage(
      'inserteen',
      messageFactory.insertEen(
        lotId,
        userId,
        facility,
        product,
        operation,
        actionPoint,
        processFlow,
        tagComment,
        tagId,
      ),
    );
  },
};

let activeService: EenAddService = httpService;

export function setEenAddService(service: EenAddService): void {
  activeService = service;
}

export function resetEenAddService(): void {
  activeService = httpService;
}

export const getProcessFlow: EenAddService['getProcessFlow'] = (...args) =>
  activeService.getProcessFlow(...args);
export const getProcessOperation: EenAddService['getProcessOperation'] = (...args) =>
  activeService.getProcessOperation(...args);
export const getTagId: EenAddService['getTagId'] = (...args) => activeService.getTagId(...args);
export const getTagPosition: EenAddService['getTagPosition'] = (...args) =>
  activeService.getTagPosition(...args);
export const insertEen: EenAddService['insertEen'] = (...args) => activeService.insertEen(...args);
