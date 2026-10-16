import apiClient from 'src/services/api-client';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import type {
  SampleReleaseExecutionPayload,
  SampleReleaseInfoItem,
  SampleReleaseResponse,
  SampleReleaseService,
} from '../types/sample-release.types';

export const sampleReleaseService: SampleReleaseService = {
  async getSampleReleaseInfo(
    lotId: string,
  ): Promise<SampleReleaseResponse<{ ITEMS: SampleReleaseInfoItem[] }>> {
    const response = await apiClient.post<MessageResponseData>('/message/send', {
      messageName: 'SAMPLERELEASEINFO',
      payload: { TYPE: 'S', LOTID: lotId },
    });
    const data = response.data;
    const isSuccessFul = isResponseSuccessful(data);

    if (isSuccessFul) {
      const body = parseMessageBody(data);
      const items = (body.ITEMS || []) as SampleReleaseInfoItem[];
      return {
        isSuccessFul: true,
        result: { ITEMS: items },
      };
    }

    return {
      isSuccessFul: false,
      result: { ITEMS: [] },
      errorMessage: getResponseErrorMessage(data),
    };
  },

  async executeSampleRelease(
    payload: SampleReleaseExecutionPayload,
  ): Promise<SampleReleaseResponse<{ SUCESSMSG?: string }>> {
    const response = await apiClient.post<MessageResponseData>('/message/send', {
      messageName: 'SAMPLERELEASEEXECUTION',
      payload: {
        FACILITY: payload.facility,
        SAMPLELOTNAME: payload.sampleLot,
        SAMPLEMACHINE: payload.machine,
        SAMPLEQTY: payload.sampleQty,
        ROUTE: payload.route,
        OPERATION: payload.operation,
        USERID: payload.userId,
        COMMENT: payload.comment,
        MAINLOTNAME: payload.mainLotName,
        MAINQTY: payload.mainQty,
      },
    });
    const data = response.data;
    const isSuccessFul = isResponseSuccessful(data);

    if (isSuccessFul) {
      const body = parseMessageBody(data);
      return {
        isSuccessFul: true,
        result: {
          SUCESSMSG: body.SUCESSMSG || body.SUCCESSMSG || '',
        },
      };
    }

    return {
      isSuccessFul: false,
      result: {},
      errorMessage: getResponseErrorMessage(data),
    };
  },
};
