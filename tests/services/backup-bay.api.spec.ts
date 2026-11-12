import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getBayDataApi,
  getFloorDataApi,
  getProcessFactoryLotApi,
  sendInFactoryApi,
} from '../../src/services/backup-bay.api';

const { postAifMessage } = vi.hoisted(() => ({ postAifMessage: vi.fn() }));
vi.mock('src/services/aif-message.service', () => ({ postAifMessage }));

const pass = (body: unknown) => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }),
});
const fail = (message: string) => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: message, MSGBODY: '' }),
});

describe('backup-bay.api (hifos2 BackupBayDialogActivity over the mock server)', () => {
  beforeEach(() => {
    postAifMessage.mockReset();
  });

  it('GETFLOORDATA sends no fields and maps FABS.ITEM[].FLOOR', async () => {
    postAifMessage.mockResolvedValue(
      pass({ FABS: { ITEM: [{ FLOOR: '1F' }, { FLOOR: '2F' }, { FLOOR: '3F' }] } }),
    );

    expect(await getFloorDataApi()).toEqual(['1F', '2F', '3F']);
    expect(postAifMessage).toHaveBeenCalledWith('message', 'GETFLOORDATA', []);
  });

  it('GETBAYDATA sends FLOOR and maps AREANAME, accepting a single item object', async () => {
    postAifMessage.mockResolvedValueOnce(
      pass({ FABS: { ITEM: [{ AREANAME: 'BAY-A01' }, { AREANAME: 'BAY-A02' }] } }),
    );
    expect(await getBayDataApi('1F')).toEqual(['BAY-A01', 'BAY-A02']);
    expect(postAifMessage).toHaveBeenCalledWith('message', 'GETBAYDATA', [['FLOOR', '1F']]);

    postAifMessage.mockResolvedValueOnce(pass({ FABS: { ITEM: { AREANAME: 'BAY-B01' } } }));
    expect(await getBayDataApi('2F')).toEqual(['BAY-B01']);
  });

  it('GETPROCESSFACTORYLOT upper-cases the LOT and maps the interlock attributes', async () => {
    postAifMessage.mockResolvedValue(
      pass({
        LOTPROCESSSTATE: 'RUN',
        LOTHOLDSTATE: 'OnHold',
        LOTSTATE: 'Released',
        JOBCODE: 'JOB-8822',
        PRODUCTQUANTITY: '25',
        OPERATIONDESCRIPTION: 'DIFFUSION OXIDATION',
      }),
    );

    const lot = await getProcessFactoryLotApi(' wa2409002 ');

    expect(postAifMessage).toHaveBeenCalledWith('message', 'GETPROCESSFACTORYLOT', [
      ['LOTID', 'WA2409002'],
    ]);
    expect(lot).toEqual({
      lotId: 'WA2409002',
      lotProcessState: 'RUN',
      lotHoldState: 'OnHold',
      lotState: 'Released',
      jobCode: 'JOB-8822',
      productQuantity: '25',
      operationDescription: 'DIFFUSION OXIDATION',
    });
  });

  it('INFACTORY sends CHANGEFACTORY0..6 as LOT|BAY|OPERATOR and returns SUCCESSLOT', async () => {
    postAifMessage.mockResolvedValue(pass({ SUCCESSLOT: '2' }));

    const result = await sendInFactoryApi(
      [
        { lotId: 'WA2409001', bay: 'BAY-A01', operatorId: 'OP10023' },
        { lotId: 'WA2409002', bay: 'BAY-A01', operatorId: 'OP10023' },
      ],
      'OP10023',
    );

    expect(postAifMessage).toHaveBeenCalledWith('message', 'INFACTORY', [
      ['CHANGEFACTORY0', 'WA2409001|BAY-A01|OP10023'],
      ['CHANGEFACTORY1', 'WA2409002|BAY-A01|OP10023'],
      ['CHANGEFACTORY2', ''],
      ['CHANGEFACTORY3', ''],
      ['CHANGEFACTORY4', ''],
      ['CHANGEFACTORY5', ''],
      ['CHANGEFACTORY6', ''],
    ]);
    expect(result).toEqual({ success: true, successCount: 2, message: '2 LOTs were completed.' });
  });

  it('throws the server ERRMSG when a message fails', async () => {
    postAifMessage.mockResolvedValue(fail('LOT 정보가 없습니다.'));

    await expect(getProcessFactoryLotApi('X')).rejects.toThrow('LOT 정보가 없습니다.');
    await expect(sendInFactoryApi([])).rejects.toThrow('LOT 정보가 없습니다.');
  });
});
