import { sendMessage } from 'src/services/message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import { createRemoteFurnaceKjMockApi } from '../mocks/remote-furnace-kj.mock';
import type { FurnaceKjCheckResponse, RemoteFurnaceKjApi } from '../types/remote-furnace-kj.types';

const mockApi = createRemoteFurnaceKjMockApi();

export const remoteFurnaceKjApi: RemoteFurnaceKjApi = {
  ...mockApi,
  async checkFurnaceKj(request) {
    try {
      const response = await sendMessage('FURNACE_KJCHECK', { LOTID: request.LOTID });
      if (!isResponseSuccessful(response)) {
        return { ok: false, message: getResponseErrorMessage(response) };
      }

      const count = String(parseMessageBody(response).CNT ?? '');
      let furnace: FurnaceKjCheckResponse['FURNACE'] = 'OTHER';
      if (count === '0') furnace = 'KJ';
      else if (count === 'KEC') furnace = 'KEC';
      return { ok: true, data: { CNT: count, FURNACE: furnace } };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Furnace 구분 조회에 실패하였습니다.',
      };
    }
  },
};

let activeApi: RemoteFurnaceKjApi = remoteFurnaceKjApi;

export function getRemoteFurnaceKjApi(): RemoteFurnaceKjApi {
  return activeApi;
}

export function setRemoteFurnaceKjApi(api: RemoteFurnaceKjApi): void {
  activeApi = api;
}

export function resetRemoteFurnaceKjApi(): void {
  activeApi = remoteFurnaceKjApi;
}
