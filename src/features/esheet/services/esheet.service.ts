import type { ESheetInfoRequest, ESheetInfoResponse } from '../esheet.types';
import { getESheetInfoMock } from '../mocks/esheet.mock';

/**
 * Transport boundary for eSheet. The backend endpoint is not available yet, so this function
 * deliberately delegates to the feature mock. Replace only this implementation when the HTTP
 * contract is confirmed; callers and the response mapper must remain unchanged.
 */
export function getESheetInfo(request: ESheetInfoRequest): Promise<ESheetInfoResponse> {
  return getESheetInfoMock(request);
}
