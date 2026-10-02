import apiClient from 'src/services/api-client';

import type {
  DummyEqpInfoResponse,
  DummyEqpInputResponse,
  LotLastEventResponse,
} from '../types/wafer-select.types';

interface WaferSelectMessageResponse {
  result: string;
}

interface ParsedWaferSelectMessage {
  STATUS?: string;
  MSGBODY?: Record<string, unknown>;
  ERRMSG?: string;
}

async function postWaferSelectMessage<T>(
  messageName: string,
  payload: Record<string, string>,
): Promise<T> {
  const response = await apiClient.post<WaferSelectMessageResponse>(
    `/hifos/${messageName}`,
    payload,
  );
  const parsed = JSON.parse(response.data.result) as ParsedWaferSelectMessage;

  if (parsed.STATUS !== 'PASS') {
    throw new Error(parsed.ERRMSG || 'Message failed.');
  }

  return (parsed.MSGBODY ?? {}) as T;
}

class WaferSelectService {
  /**
   * Legacy:
   * MessageFactoryUtil.dummyEqpInfo()
   */
  async getDummyEqpInfo(eqpId: string, lotId: string): Promise<DummyEqpInfoResponse> {
    return postWaferSelectMessage<DummyEqpInfoResponse>('DUMMYEQPINFO', {
      EQPID: eqpId,
      LOTNO: lotId,
    });
  }

  /**
   * Legacy:
   * MessageFactoryUtil.lotLastEvent()
   */
  getLotLastEvent(lotId: string, area: string, category: string): Promise<LotLastEventResponse> {
    void category;
    return postWaferSelectMessage<LotLastEventResponse>('LOTLSATEVENT', {
      LOTNAME: lotId,
      AREA: area,
    });
  }

  /**
   * Legacy:
   * MessageFactoryUtil.dummyEqpInput()
   */
  async dummyEqpInput(
    lotId: string,
    category: string,
    comment: string,
  ): Promise<DummyEqpInputResponse> {
    return postWaferSelectMessage<DummyEqpInputResponse>('DUMMYEQPINPUT', {
      LOTNAME: lotId,
      LOTLASTEVENT: comment,
      CATEGORY: category,
    });
  }
}

export const waferSelectService = new WaferSelectService();
