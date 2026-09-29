import { waferSelectMock } from '../mocks/wafer-select.mock';
import type {
  DummyEqpInfoResponse,
  DummyEqpInputResponse,
  LotLastEventResponse,
} from '../types/wafer-select.types';

class WaferSelectService {
  /**
   * Legacy:
   * MessageFactoryUtil.dummyEqpInfo()
   */
  async getDummyEqpInfo(eqpId: string, lotId: string): Promise<DummyEqpInfoResponse> {
    void lotId;
    return Promise.resolve(waferSelectMock.dummyEqpInfo(eqpId));
  }

  /**
   * Legacy:
   * MessageFactoryUtil.lotLastEvent()
   */
  getLotLastEvent(lotId: string, area: string, category: string): Promise<LotLastEventResponse> {
    void lotId;
    void area;

    if (category === 'COUNT') {
      return Promise.resolve(waferSelectMock.lotLastEventCount());
    }

    return Promise.resolve(waferSelectMock.lotLastEventSlot());
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
    void lotId;
    void category;
    return Promise.resolve(waferSelectMock.dummyEqpInput(comment));
  }
}

export const waferSelectService = new WaferSelectService();
