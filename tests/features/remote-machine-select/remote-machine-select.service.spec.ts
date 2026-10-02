import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.hoisted(() => vi.fn());

vi.mock('src/services/api-client', () => ({ default: { post } }));
vi.mock('src/features/main/stores/main.store', () => ({
  useMainStore: () => ({ mobileServerName: 'SERVER', deviceName: 'DEVICE' }),
}));

import * as service from 'src/features/remote-machine-select/services/remote-machine-select.service';

describe('RemoteMachineSelect hifos2 API routes', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({
      data: { statusCode: 200, result: JSON.stringify({ STATUS: 'PASS', MSGBODY: {} }) },
    });
  });

  it('uses each Android MessageName endpoint, including the special EEN route', async () => {
    await service.lotInfo('MVIN', 'LOT-REAL', 'FAB');
    await service.remoteEQPInfo2('EQP-REAL', 'MVIN', 'LOT-REAL', 'FAB', '10000', '00');
    await service.remoteEQPEENInfo('EQP-REAL', 'MVIN', 'LOT-REAL', 'FAB', '10000', '00');
    await service.machinePortStatus('EQP-REAL', 'P01');
    await service.photoChangeEQPStatus('EQP-REAL', 'OP');
    await service.photoLotStart([['MACHINENAME', 'EQP-REAL']]);
    await service.photoLotReserve('EQP-REAL', 'P01', 'LOT-REAL');

    expect(post.mock.calls.map(([url]) => url)).toEqual([
      '/hifos/lotinfo',
      '/hifos/remoteeqpinfo2',
      '/hifos/remoteeqpinfo',
      '/hifos/machineportstatus',
      '/hifos/photochangeeqpstatus',
      '/hifos/photolotstart',
      '/hifos/photolotreserve',
    ]);
    expect(post.mock.calls[2]?.[1]?.sMsg).toContain('<MSGNAME>REMOTEEQPEENINFO</MSGNAME>');
  });

  it('rejects a PASS response without MSGBODY like MessageSender', async () => {
    post.mockResolvedValueOnce({
      data: { statusCode: 200, result: JSON.stringify({ STATUS: 'PASS', MSGBODY: '' }) },
    });

    const response = await service.lotInfo('MVIN', 'LOT-REAL', 'FAB');

    expect(response.isSuccess).toBe(false);
    expect(response.errorMessage).toBe('BODY가 존재하지 않습니다');
  });

  it('uses local fixtures for the documented mock LOT and machine without a network request', async () => {
    await service.lotInfo('MVIN', 'WP00001', 'FAB');
    await service.remoteEQPInfo2('PHOTO01', 'MVIN', 'WP00001', 'FAB', '10000', '00');
    await service.remoteEQPEENInfo('PHOTO01', 'MVIN', 'WP00001', 'FAB', '10000', '00');
    await service.machinePortStatus('PHOTO01', 'P01');
    await service.photoChangeEQPStatus('PHOTO01', 'OP');
    await service.photoLotStart([['MACHINENAME', 'PHOTO01']]);
    await service.photoLotReserve('PHOTO01', 'P01', 'WP00001');

    expect(post).not.toHaveBeenCalled();
  });

  it('surfaces server failures and connection errors instead of reporting success', async () => {
    post.mockResolvedValueOnce({
      data: {
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'Server rejected LOT' }),
      },
    });
    expect(await service.lotInfo('MVIN', 'LOT-REAL', 'FAB')).toMatchObject({
      isSuccess: false,
      errorMessage: 'Server rejected LOT',
    });

    post.mockRejectedValueOnce(new Error('Connection lost'));
    expect(await service.lotInfo('MVIN', 'LOT-REAL', 'FAB')).toMatchObject({
      isSuccess: false,
      errorMessage: 'Connection lost',
    });
  });

  it('escapes XML characters in request fields', async () => {
    await service.lotInfo('MVIN', 'LOT<&>"\'', 'FAB');

    expect(post.mock.calls[0]?.[1]?.sMsg).toContain('<LOTID>LOT&lt;&amp;&gt;&quot;&apos;</LOTID>');
  });
});
