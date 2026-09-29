import { mockInlineInfo, mockInlineSet, mockMaskLocation } from '../mocks/move-in-inline.mocks';
import type {
  InlineInfoResponse,
  InlineSetParams,
  InlineSetResponse,
  MaskLocationInfo,
} from '../types/move-in-inline.types';

const USE_MOCK = true;

export const moveInInlineService = {
  /** Kotlin: MessageFactoryUtil.inlineInfo(lotId, FACILITY, operation) */
  async getInlineInfo(_lotId: string, _operation: string): Promise<InlineInfoResponse> {
    await new Promise((resolve) => window.setTimeout(resolve, 220));

    if (USE_MOCK) {
      return structuredClone(mockInlineInfo);
    }

    throw new Error('API chưa implement');
  },

  async getMaskLocationInfo(maskTag: string): Promise<MaskLocationInfo> {
    await new Promise((resolve) => window.setTimeout(resolve, 220));

    if (USE_MOCK) {
      return {
        ...structuredClone(mockMaskLocation),
        maskTag,
      };
    }

    throw new Error('API chưa implement');
  },

  async inlineSet(_params: InlineSetParams): Promise<InlineSetResponse> {
    await new Promise((resolve) => window.setTimeout(resolve, 220));

    if (USE_MOCK) {
      return structuredClone(mockInlineSet);
    }

    throw new Error('API chưa implement');
  },
};
