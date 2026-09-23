import {
  getBayDataApi,
  getFloorDataApi,
  getProcessFactoryLotApi,
  sendInFactoryApi,
} from 'src/services/backup-bay.api';
import { describe, expect, it } from 'vitest';

describe('backup-bay.api (XML HTTP API conforming to technical_requirement.md section 4)', () => {
  it('4.1 GETFLOORDATA fetches floor list via XML', async () => {
    const floors = await getFloorDataApi();
    expect(floors).toEqual(['1F', '2F', '3F']);
  });

  it('4.2 GETBAYDATA fetches bay list for given floor via XML', async () => {
    const bays1F = await getBayDataApi('1F');
    expect(bays1F).toEqual(['BAY-A01', 'BAY-A02', 'BAY-A03', 'BAY-A04', 'BAY-A05']);

    const bays2F = await getBayDataApi('2F');
    expect(bays2F).toEqual(['BAY-B01', 'BAY-B02', 'BAY-B03', 'BAY-B04']);
  });

  it('4.3 GETPROCESSFACTORYLOT fetches and parses XML lot interlock attributes', async () => {
    const lotValid = await getProcessFactoryLotApi('WA2409001');
    expect(lotValid.lotId).toBe('WA2409001');
    expect(lotValid.lotProcessState).toBe('WAIT');
    expect(lotValid.lotHoldState).toBe('NotOnHold');
    expect(lotValid.lotState).toBe('Released');
    expect(lotValid.jobCode).toBe('JOB-8821');
    expect(lotValid.productQuantity).toBe('25');
    expect(lotValid.operationDescription).toBe('PHOTO ETCHING PROCESS');

    const lotRun = await getProcessFactoryLotApi('WA2409002');
    expect(lotRun.lotProcessState).toBe('RUN');

    const lotHold = await getProcessFactoryLotApi('WA2409003');
    expect(lotHold.lotHoldState).toBe('OnHold');

    const lotCreated = await getProcessFactoryLotApi('WA2409004');
    expect(lotCreated.lotState).toBe('Created');
  });

  it('4.4 INFACTORY sends XML CHANGEFACTORY tags and returns SUCCESSLOT', async () => {
    const records = [
      { lotId: 'WA2409001', bay: 'BAY-A01', operatorId: 'OP10023' },
      { lotId: 'WA2409002', bay: 'BAY-A01', operatorId: 'OP10023' },
    ];

    const result = await sendInFactoryApi(records, 'OP10023');
    expect(result.success).toBe(true);
    expect(result.successCount).toBe(2);
    expect(result.message).toBe('2 LOTs were completed.');
  });
});
