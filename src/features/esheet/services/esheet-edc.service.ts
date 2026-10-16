import apiClient from 'src/services/api-client';

import type { ESheetEdcRequest, ESheetEdcResponse } from '../types/esheet-edc.types';
import { getEdcDataMessage } from './esheet-edc.message-factory';

export async function getEdcData(request: ESheetEdcRequest): Promise<ESheetEdcResponse> {
  const response = await apiClient.post<ESheetEdcResponse>('/hifos/getEdcData', {
    sMsg: getEdcDataMessage(request),
  });

  return response.data;
}
