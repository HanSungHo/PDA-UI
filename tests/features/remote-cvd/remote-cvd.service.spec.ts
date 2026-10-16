import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, mainStore } = vi.hoisted(() => ({
  post: vi.fn(),
  mainStore: { mobileServerName: 'MOBILE', deviceName: 'DEVICE' },
}));

vi.mock('src/services/api-client', () => ({ default: { post } }));
vi.mock('src/features/main/stores/main.store', () => ({ useMainStore: () => mainStore }));

import { remoteCvdApi } from '../../../src/features/remote-cvd/services/remote-cvd.service';

describe('remoteCvdApi', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({
      data: {
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { RESULT: 'OK' } }),
      },
    });
  });

  it('preserves Android LOTINFO request fields and parses the response body', async () => {
    const response = await remoteCvdApi.lotInfo('MVIN', 'LOT-01', 'FAB-A');

    expect(post).toHaveBeenCalledWith(
      '/hifos/lotinfo',
      expect.objectContaining({
        sMsg: expect.stringContaining('<TYPE>MVIN</TYPE>'),
      }),
    );
    const request = post.mock.calls[0]?.[1] as { sMsg: string };
    expect(request.sMsg).toContain('<LOTID>LOT-01</LOTID>');
    expect(request.sMsg).toContain('<FACILITY>FAB-A</FACILITY>');
    expect(request.sMsg).toContain('<RECEIVER>MOBILE</RECEIVER>');
    expect(response).toEqual({ isSuccess: true, messageBody: { RESULT: 'OK' }, errorMessage: '' });
  });

  it('escapes request values and sends the Android REMOTESTART field names', async () => {
    await remoteCvdApi.remoteStart({
      machineName: 'CVD&MAIN',
      machineName2: 'CVD01',
      machineType: 'CVD',
      areaName: 'AREA',
      lotName: 'LOT-01',
      portName: '1',
      recipeName: 'RCP-01',
      productQty: '25',
      operation: '10020-00',
      jobCode: 'JOB-01',
      productName: 'PRODUCT',
      eventUser: 'OP-01',
      precedeFlag: 'PT주기',
      qTimeHold: 'Y',
    });

    expect(post).toHaveBeenCalledWith(
      '/hifos/remotestart',
      expect.objectContaining({
        sMsg: expect.stringContaining('<MACHINENAME>CVD&amp;MAIN</MACHINENAME>'),
      }),
    );
    const request = post.mock.calls[0]?.[1] as { sMsg: string };
    expect(request.sMsg).toContain('<MACHINENAME2>CVD01</MACHINENAME2>');
    expect(request.sMsg).toContain('<PRECEDE_FLAG>PT주기</PRECEDE_FLAG>');
    expect(request.sMsg).toContain('<Q_TIME_HOLD>Y</Q_TIME_HOLD>');
  });

  it('returns backend error messages without hiding them', async () => {
    post.mockResolvedValueOnce({
      data: { statusCode: 200, result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'Legacy error' }) },
    });

    await expect(remoteCvdApi.remoteEqpInfo('EQP01')).resolves.toEqual({
      isSuccess: false,
      messageBody: {},
      errorMessage: 'Legacy error',
    });
  });

  it('preserves the remaining legacy message names and payload fields', async () => {
    await remoteCvdApi.remoteEqpInfo('EQP-01');
    await remoteCvdApi.recipeInfo({
      isPhoto: 'N',
      lotId: 'LOT-02',
      operation: '10020',
      subOperation: '00',
      product: 'PRODUCT',
      equipmentId: 'EQP-01',
      operationType: 'C',
      facility: 'FAB-A',
    });
    await remoteCvdApi.teRcpSelection('EQP-01', 'LOT-02');
    await remoteCvdApi.machinePortStatus('MAIN-01', '1', 'LOT-02', 'RCP-01');
    await remoteCvdApi.memorization('MAIN-01', 'RCP-01', 'LOT-02', '1', 'EQP-01', 'OP-01', 'CVD');
    await remoteCvdApi.machinePortClear('MAIN-01', '1');
    await remoteCvdApi.doorOpen('MAIN-01', '1', 'CVD', 'CVD');
    await remoteCvdApi.remoteInterlockCheck('LOT-02', '10020', '00', 'MAIN-01', 'RCP-01');
    await remoteCvdApi.remoteRestart({
      machineName: 'MAIN-01',
      machineName2: 'EQP-01',
      machineType: 'CVD',
      areaName: 'CVD',
      lotName: 'LOT-02',
      portName: '1',
      recipeName: 'RCP-01',
      productQty: '25',
      operation: '10020-00',
      jobCode: 'JOB-01',
      productName: 'PRODUCT',
      eventUser: 'OP-01',
      precedeFlag: '',
    });

    expect(post.mock.calls.map(([path]) => path)).toEqual([
      '/hifos/remoteeqpinfo',
      '/hifos/recipeinfo',
      '/hifos/tercpselection',
      '/hifos/machineportstatus',
      '/hifos/memorization',
      '/hifos/machineportclear',
      '/hifos/dooropen',
      '/hifos/remoteintlkcheck',
      '/hifos/remoterestart',
    ]);
    expect((post.mock.calls[4]?.[1] as { sMsg: string }).sMsg).toContain(
      '<USER_ID>OP-01</USER_ID>',
    );
    expect((post.mock.calls[6]?.[1] as { sMsg: string }).sMsg).toContain(
      '<MACHINETYPE>CVD</MACHINETYPE>',
    );
    expect((post.mock.calls[8]?.[1] as { sMsg: string }).sMsg).not.toContain('Q_TIME_HOLD');
  });

  it('returns a readable failure when the request rejects', async () => {
    post.mockRejectedValueOnce(new Error('Network unavailable'));

    await expect(remoteCvdApi.lotInfo('MVIN', 'LOT-03', 'FAB-A')).resolves.toEqual({
      isSuccess: false,
      messageBody: {},
      errorMessage: 'Network unavailable',
    });
  });
});
