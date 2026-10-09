import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import { isE2EApiMockEnabled } from '../e2e-api-mock-mode';

let mockOverrideResponse: {
  result: 'SUCCESS' | 'ERROR';
  message?: string;
  errorDesc?: string;
} | null = null;

export function setMockChangeEqpStatusOverride(
  override: { result: 'SUCCESS' | 'ERROR'; message?: string; errorDesc?: string } | null,
): void {
  mockOverrideResponse = override;
}

export function generateMockChangeEqpStatusResponse(body: string): string {
  if (mockOverrideResponse) {
    if (mockOverrideResponse.result === 'SUCCESS') {
      return `<BODY>
<RESULT>SUCCESS</RESULT>
<MESSAGE>${mockOverrideResponse.message || 'Equipment status changed successfully.'}</MESSAGE>
</BODY>`;
    }
    return `<BODY>
<RESULT>ERROR</RESULT>
<ERRORDESC>${mockOverrideResponse.errorDesc || 'Equipment is currently in an invalid state for LOAD DOWN transition.'}</ERRORDESC>
</BODY>`;
  }

  const mainFlagMatch = body.match(/<MAINFLAG>(.*?)<\/MAINFLAG>/);
  const chamberListMatch = body.match(/<CHAMBERLIST>(.*?)<\/CHAMBERLIST>/);

  const mainFlag = mainFlagMatch ? mainFlagMatch[1].trim() : 'Y';
  const chamberList = chamberListMatch ? chamberListMatch[1].trim() : '';

  if (mainFlag === 'N' && !chamberList) {
    return `<BODY>
<RESULT>ERROR</RESULT>
<ERRORDESC>최소 하나의 장비 또는 챔버를 선택 하세요</ERRORDESC>
</BODY>`;
  }

  return `<BODY>
<RESULT>SUCCESS</RESULT>
<MESSAGE>Equipment status changed successfully.</MESSAGE>
</BODY>`;
}

let isMockInstalled = false;

export function setupMoveOutEqpDownMock(client: AxiosInstance): void {
  if (isMockInstalled) return;
  isMockInstalled = true;

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    if (isE2EApiMockEnabled()) return config;

    if (config.url?.includes('/hifos/message')) {
      const messageName = (config.headers?.MESSAGENAME ||
        config.headers?.messagename ||
        '') as string;

      if (messageName === 'CHANGEEQPSTATUS') {
        const body = typeof config.data === 'string' ? config.data : '';
        await new Promise((resolve) => setTimeout(resolve, 60));
        const xmlResponse = generateMockChangeEqpStatusResponse(body);

        config.adapter = () => {
          return Promise.resolve({
            data: xmlResponse,
            status: 200,
            statusText: 'OK',
            headers: { 'content-type': 'application/xml' },
            config,
          } as AxiosResponse);
        };
      }
    }
    return config;
  });
}
