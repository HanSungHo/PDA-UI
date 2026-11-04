import { postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import type { ApiResponse, BayItem } from '../types/remote-xrf-recipe-set.types';

export const ResponseDataToJsonUtil = {
  // Android: msgBody.getJSONObject("BAYS").getJSONArray("ITEM")
  // BAYS is an object containing ITEM (array, or single object when one result)
  getMessageBodyList(result: unknown, key: string): BayItem[] {
    if (!result || typeof result !== 'object') return [];
    const record = result as Record<string, unknown>;
    const outer = record[key];
    if (!outer || typeof outer !== 'object' || Array.isArray(outer)) return [];
    const items = (outer as Record<string, unknown>)['ITEM'];
    if (Array.isArray(items)) return items as BayItem[];
    if (items && typeof items === 'object') return [items as BayItem];
    return [];
  },

  getErrorMessage(result: unknown): string {
    if (!result) return '';
    if (typeof result === 'string') return result;
    if (typeof result === 'object' && result !== null) {
      const record = result as Record<string, string | undefined>;
      return record.ERRMSG ?? record.errorMessage ?? record.message ?? '';
    }
    return '';
  },
};

async function send(
  messageName: string,
  fields: Array<[string, string]>,
): Promise<ApiResponse<unknown>> {
  try {
    const response = await postAifMessage(messageName, messageName, fields);
    if (isResponseSuccessful(response)) {
      return {
        isSuccessFul: true,
        result: parseMessageBody(response),
      };
    }
    return {
      isSuccessFul: false,
      errorMessage: getResponseErrorMessage(response),
    };
  } catch (error: unknown) {
    return {
      isSuccessFul: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

export const remoteXrfRecipeService = {
  async getXrfItem(facility: string, area: string): Promise<ApiResponse<unknown>> {
    return send('XRFITEMINFO', [
      ['FACILITY', facility],
      ['AREA', area],
    ]);
  },

  async getXrfProdeqp(facility: string, area: string, item: string): Promise<ApiResponse<unknown>> {
    return send('XRFEQPINFO', [
      ['FACILITY', facility],
      ['AREA', area],
      ['ITEM', item],
    ]);
  },

  async getXrfCategory(
    facility: string,
    area: string,
    item: string,
    eqpId: string,
  ): Promise<ApiResponse<unknown>> {
    return send('XRFCATEGORYINFO', [
      ['FACILITY', facility],
      ['AREA', area],
      ['ITEM', item],
      ['PRODEQP', eqpId],
    ]);
  },

  async getXrfSample(
    facility: string,
    area: string,
    item: string,
    eqpId: string,
    category: string,
  ): Promise<ApiResponse<unknown>> {
    return send('XRFSAMPLEINFO', [
      ['FACILITY', facility],
      ['AREA', area],
      ['ITEM', item],
      ['PRODEQP', eqpId],
      ['CATEGORY', category],
    ]);
  },

  async getXrfPara(
    facility: string,
    area: string,
    item: string,
    eqpId: string,
    category: string,
    sample: string,
  ): Promise<ApiResponse<unknown>> {
    return send('XRFPARAINFO', [
      ['FACILITY', facility],
      ['AREA', area],
      ['ITEM', item],
      ['PRODEQP', eqpId],
      ['CATEGORY', category],
      ['SAMPLE', sample],
    ]);
  },

  async getXrfRecipe(
    facility: string,
    area: string,
    item: string,
    eqpId: string,
    category: string,
    sample: string,
    para: string,
  ): Promise<ApiResponse<unknown>> {
    return send('XRFRECIPEINFO', [
      ['FACILITY', facility],
      ['AREA', area],
      ['ITEM', item],
      ['PRODEQP', eqpId],
      ['CATEGORY', category],
      ['SAMPLE', sample],
      ['PARAMETER', para],
    ]);
  },
};
