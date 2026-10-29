import { sendMessage } from 'src/services/message.service';

import type { ESheetInfoRequest, ESheetInfoResponse } from '../esheet.types';

export function getESheetInfo(request: ESheetInfoRequest): Promise<ESheetInfoResponse> {
  return sendMessage('ESHEETINFO', {
    LOTID: request.lotId,
    HISTORYCOUNT: request.historyCount,
    FORWARDCOUNT: request.forwardCount,
    FACILITY: request.facility,
  });
}
