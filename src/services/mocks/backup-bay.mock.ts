import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import { isE2EApiMockEnabled } from '../e2e-api-mock-mode';

export interface MockLotRecord {
  lotProcessState: string;
  lotHoldState: string;
  lotState: string;
  jobCode: string;
  productQuantity: string;
  operationDescription: string;
}

export const MOCK_LOT_FIXTURES: Record<string, MockLotRecord> = {
  WA2409001: {
    lotProcessState: 'WAIT',
    lotHoldState: 'NotOnHold',
    lotState: 'Released',
    jobCode: 'JOB-8821',
    productQuantity: '25',
    operationDescription: 'PHOTO ETCHING PROCESS',
  },
  WA2409002: {
    lotProcessState: 'RUN',
    lotHoldState: 'NotOnHold',
    lotState: 'Released',
    jobCode: 'JOB-8822',
    productQuantity: '25',
    operationDescription: 'DIFFUSION OXIDATION',
  },
  WA2409003: {
    lotProcessState: 'WAIT',
    lotHoldState: 'OnHold',
    lotState: 'Released',
    jobCode: 'JOB-8823',
    productQuantity: '20',
    operationDescription: 'ION IMPLANTATION',
  },
  WA2409004: {
    lotProcessState: 'WAIT',
    lotHoldState: 'NotOnHold',
    lotState: 'Created',
    jobCode: 'JOB-8824',
    productQuantity: '25',
    operationDescription: 'CHEMICAL VAPOR DEPOSITION',
  },
};

export const MOCK_FLOORS = ['1F', '2F', '3F'];

export const MOCK_BAYS_BY_FLOOR: Record<string, string[]> = {
  '1F': ['BAY-A01', 'BAY-A02', 'BAY-A03', 'BAY-A04', 'BAY-A05'],
  '2F': ['BAY-B01', 'BAY-B02', 'BAY-B03', 'BAY-B04'],
  '3F': ['BAY-C01', 'BAY-C02', 'BAY-C03'],
};

/**
 * Generates HiFOS XML message response conforming to technical_requirement.md section 4
 */
export function generateMockXmlResponse(messageName: string, body: string): string {
  switch (messageName) {
    case 'GETFLOORDATA': {
      const items = MOCK_FLOORS.map((f) => `<ITEM><FLOOR>${f}</FLOOR></ITEM>`).join('');
      return `<FABS>${items}</FABS>`;
    }

    case 'GETBAYDATA': {
      const floorMatch = body.match(/<FLOOR>(.*?)<\/FLOOR>/);
      const floor = floorMatch ? floorMatch[1].trim() : '1F';
      const bays = MOCK_BAYS_BY_FLOOR[floor] || [];
      const items = bays.map((b) => `<ITEM><AREANAME>${b}</AREANAME></ITEM>`).join('');
      return `<FABS>${items}</FABS>`;
    }

    case 'GETPROCESSFACTORYLOT': {
      const lotMatch = body.match(/<LOTID>(.*?)<\/LOTID>/);
      const lotId = (lotMatch ? lotMatch[1].trim() : '').toUpperCase();
      const existing = MOCK_LOT_FIXTURES[lotId];

      const record: MockLotRecord = existing || {
        lotProcessState: 'WAIT',
        lotHoldState: 'NotOnHold',
        lotState: 'Released',
        jobCode: `JOB-${Math.floor(1000 + Math.random() * 9000)}`,
        productQuantity: '25',
        operationDescription: 'ETCHING & THIN FILM FABRICATION',
      };

      return `<BODY>
  <LOTPROCESSSTATE>${record.lotProcessState}</LOTPROCESSSTATE>
  <LOTHOLDSTATE>${record.lotHoldState}</LOTHOLDSTATE>
  <LOTSTATE>${record.lotState}</LOTSTATE>
  <JOBCODE>${record.jobCode}</JOBCODE>
  <PRODUCTQUANTITY>${record.productQuantity}</PRODUCTQUANTITY>
  <OPERATIONDESCRIPTION>${record.operationDescription}</OPERATIONDESCRIPTION>
</BODY>`;
    }

    case 'INFACTORY': {
      let count = 0;
      for (let i = 0; i <= 6; i++) {
        const regex = new RegExp(`<CHANGEFACTORY${i}>(.*?)</CHANGEFACTORY${i}>`);
        const match = body.match(regex);
        if (match && match[1].trim()) {
          count++;
        }
      }
      return `<BODY>
  <SUCCESSLOT>${count}</SUCCESSLOT>
</BODY>`;
    }

    default:
      return `<BODY><RESULT>UNKNOWN_MESSAGE</RESULT></BODY>`;
  }
}

let isMockInstall = false;

/**
 * Installs mock interceptor on axios instance for /hifos/message endpoint
 */
export function setupBackupBayMock(client: AxiosInstance): void {
  if (isMockInstall) return;
  isMockInstall = true;

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    if (isE2EApiMockEnabled()) return config;

    if (config.url?.includes('/hifos/message')) {
      const messageName = (config.headers?.MESSAGENAME ||
        config.headers?.messagename ||
        '') as string;
      const body = typeof config.data === 'string' ? config.data : '';

      // Simulate network roundtrip latency (60-120ms)
      await new Promise((resolve) => setTimeout(resolve, 80));

      const xmlResponse = generateMockXmlResponse(messageName, body);

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
    return config;
  });
}
