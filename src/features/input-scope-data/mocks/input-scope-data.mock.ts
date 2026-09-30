import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

let mockGetScopeLotInfoOverride: {
  result: 'SUCCESS' | 'ERROR';
  isExist?: 'Y' | 'N';
  lotName?: string;
  errorMessage?: string;
  faults?: string[];
} | null = null;

let mockSlotInfoOverride: {
  result: 'SUCCESS' | 'ERROR';
  waferList?: string;
  errorMessage?: string;
} | null = null;

let mockInputScopeDataOverride: {
  result: 'SUCCESS' | 'ERROR';
  message?: string;
  errorMessage?: string;
} | null = null;

export function setMockGetScopeLotInfoOverride(override: typeof mockGetScopeLotInfoOverride): void {
  mockGetScopeLotInfoOverride = override;
}

export function setMockSlotInfoOverride(override: typeof mockSlotInfoOverride): void {
  mockSlotInfoOverride = override;
}

export function setMockInputScopeDataOverride(override: typeof mockInputScopeDataOverride): void {
  mockInputScopeDataOverride = override;
}

export function resetAllScopeMocks(): void {
  mockGetScopeLotInfoOverride = null;
  mockSlotInfoOverride = null;
  mockInputScopeDataOverride = null;
}

export function generateMockGetScopeLotInfoResponse(body: string): string {
  if (mockGetScopeLotInfoOverride) {
    if (mockGetScopeLotInfoOverride.result === 'SUCCESS') {
      const lot = mockGetScopeLotInfoOverride.lotName || 'TESTLOT01';
      const isExist = mockGetScopeLotInfoOverride.isExist || 'N';
      const faults = mockGetScopeLotInfoOverride.faults || [
        'PARTICLE',
        'SCRATCH',
        'PATTERN DEFECT',
      ];
      const faultTags = faults.map((f) => `<FAULT><TYPEVALUE>${f}</TYPEVALUE></FAULT>`).join('');
      return `<BODY>
  <RESULT>SUCCESS</RESULT>
  <ISEXIST>${isExist}</ISEXIST>
  <LOTNAME>${lot}</LOTNAME>
  <FACTORYNAME>FAB1</FACTORYNAME>
  <PROCESSOPERATIONNAME>102030</PROCESSOPERATIONNAME>
  <MACHINENAME>SCOPE-01</MACHINENAME>
  <LAYERID>PHOTO_01</LAYERID>
  <FAULTS>${faultTags}</FAULTS>
</BODY>`;
    }
    return `<BODY>
  <RESULT>ERROR</RESULT>
  <ERRORDESC>${mockGetScopeLotInfoOverride.errorMessage || ''}</ERRORDESC>
</BODY>`;
  }

  const lotMatch = body.match(/<LOTID>(.*?)<\/LOTID>/);
  const lotId = lotMatch ? lotMatch[1].trim() : 'TESTLOT01';

  const upperLot = lotId.toUpperCase();
  if (upperLot.includes('ERR')) {
    return `<BODY>
  <RESULT>ERROR</RESULT>
  <ERRORDESC>존재하지 않는 LOT ID 입니다. (${lotId})</ERRORDESC>
</BODY>`;
  }

  const isExist = upperLot.includes('EXIST') ? 'Y' : 'N';

  return `<BODY>
  <RESULT>SUCCESS</RESULT>
  <ISEXIST>${isExist}</ISEXIST>
  <LOTNAME>${lotId}</LOTNAME>
  <FACTORYNAME>FAB1</FACTORYNAME>
  <PROCESSOPERATIONNAME>102030</PROCESSOPERATIONNAME>
  <MACHINENAME>SCOPE-01</MACHINENAME>
  <LAYERID>PHOTO_01</LAYERID>
  <FAULTS>
    <FAULT><TYPEVALUE>PARTICLE</TYPEVALUE></FAULT>
    <FAULT><TYPEVALUE>SCRATCH</TYPEVALUE></FAULT>
    <FAULT><TYPEVALUE>PATTERN DEFECT</TYPEVALUE></FAULT>
    <FAULT><TYPEVALUE>CONTAMINATION</TYPEVALUE></FAULT>
    <FAULT><TYPEVALUE>BRIDGE</TYPEVALUE></FAULT>
  </FAULTS>
</BODY>`;
}

export function generateMockSlotInfoResponse(body: string): string {
  if (mockSlotInfoOverride) {
    if (mockSlotInfoOverride.result === 'SUCCESS') {
      return `<BODY>
  <RESULT>SUCCESS</RESULT>
  <WAFERLIST>${mockSlotInfoOverride.waferList || ''}</WAFERLIST>
</BODY>`;
    }
    return `<BODY>
  <RESULT>ERROR</RESULT>
  <ERRORDESC>${mockSlotInfoOverride.errorMessage || ''}</ERRORDESC>
</BODY>`;
  }

  const lotMatch = body.match(/<LOTID>(.*?)<\/LOTID>/);
  const lotId = lotMatch ? lotMatch[1].trim() : 'TESTLOT01';

  if (lotId.toUpperCase().includes('EMPTY')) {
    return `<BODY>
  <RESULT>SUCCESS</RESULT>
  <WAFERLIST></WAFERLIST>
</BODY>`;
  }

  // Generate 25 wafers by default
  const defaultWafers = Array.from({ length: 25 }, (_, i) => {
    const num = (i + 1).toString().padStart(2, '0');
    return `${lotId}.${num}`;
  }).join(',');

  return `<BODY>
  <RESULT>SUCCESS</RESULT>
  <WAFERLIST>${defaultWafers}</WAFERLIST>
</BODY>`;
}

export function generateMockInputScopeDataResponse(): string {
  if (mockInputScopeDataOverride) {
    if (mockInputScopeDataOverride.result === 'SUCCESS') {
      return `<BODY>
  <RESULT>SUCCESS</RESULT>
  <MESSAGE>${mockInputScopeDataOverride.message || '데이터가 저장 되었습니다.'}</MESSAGE>
</BODY>`;
    }
    return `<BODY>
  <RESULT>ERROR</RESULT>
  <ERRORDESC>${mockInputScopeDataOverride.errorMessage || ''}</ERRORDESC>
</BODY>`;
  }

  return `<BODY>
  <RESULT>SUCCESS</RESULT>
  <MESSAGE>데이터가 저장 되었습니다.</MESSAGE>
</BODY>`;
}

let isMockInstalled = false;

export function setupInputScopeDataMock(client: AxiosInstance): void {
  if (isMockInstalled) return;
  isMockInstalled = true;

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (config.url?.includes('/hifos/message')) {
      const headers = config.headers as unknown as {
        get?: (name: string) => string | null;
        MESSAGENAME?: string;
        messagename?: string;
      };

      const messageName =
        (typeof headers?.get === 'function'
          ? headers.get('MESSAGENAME') || headers.get('messagename')
          : null) ||
        headers?.MESSAGENAME ||
        headers?.messagename ||
        '';

      if (
        messageName === 'GETSCOPELOTINFO' ||
        messageName === 'SLOTINFO' ||
        messageName === 'INPUTSCOPEDATA'
      ) {
        const body = typeof config.data === 'string' ? config.data : '';

        let xmlResponse = '';
        if (messageName === 'GETSCOPELOTINFO') {
          xmlResponse = generateMockGetScopeLotInfoResponse(body);
        } else if (messageName === 'SLOTINFO') {
          xmlResponse = generateMockSlotInfoResponse(body);
        } else if (messageName === 'INPUTSCOPEDATA') {
          xmlResponse = generateMockInputScopeDataResponse();
        }

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
