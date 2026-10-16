import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('src/services/api-client', () => ({ default: { post } }));
vi.mock('src/features/main/stores/main.store', () => ({
  useMainStore: () => ({ mobileServerName: 'SERVER', deviceName: 'DEVICE' }),
}));

import { impApi } from 'src/features/remote-imp-main/services/remote-imp-main.service';

describe('Remote IMP message contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    post.mockResolvedValue({
      data: { statusCode: 200, result: JSON.stringify({ STATUS: 'PASS', MSGBODY: {} }) },
    });
  });

  it('sends the exact legacy IMPREMOTESTART body and escapes XML values', async () => {
    const result = await impApi.impRemoteStart({
      machineName: 'IMP-1',
      machineType: 'VARIAN_MC',
      lotName: 'LOT&A',
      portName: '1',
      recipeName: 'RCP<A>',
      jobCode: 'JOB-1',
      productName: 'PRODUCT',
      operation: '20000',
      isCarry: 'Y',
      bay: 'B1',
      stocker: 'S1',
      eventUser: 'OP-A',
    });
    expect(result.ok).toBe(true);
    expect(post).toHaveBeenCalledWith(
      '/hifos/impremotestart',
      expect.objectContaining({ sMsg: expect.any(String) }),
    );
    const xml = (post.mock.calls[0]?.[1] as { sMsg: string }).sMsg;
    expect(xml).toContain('<LOTNAME1>LOT&amp;A</LOTNAME1>');
    expect(xml).toContain('<LOTNAME2></LOTNAME2>');
    expect(xml).toContain('<RECIPENAME>RCP&lt;A&gt;</RECIPENAME>');
    expect(xml).toContain('<JOBCODE1>JOB-1</JOBCODE1>');
    expect(xml).toContain('<OPERATION1>20000</OPERATION1>');
    expect(xml).toContain('<ISCARRY>Y</ISCARRY>');
    expect(xml).toContain('<EVENTUSER>OP-A</EVENTUSER>');
  });

  it('returns the server error instead of treating a failed message as success', async () => {
    post.mockResolvedValueOnce({
      data: { statusCode: 200, result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'PORT busy' }) },
    });
    expect(await impApi.machinePortStatus('IMP-1', '1')).toEqual({
      ok: false,
      message: 'PORT busy',
    });
  });

  it.each([
    [
      'lotInfo',
      () => impApi.lotInfo('LOT-1', 'FAB-A'),
      '/hifos/lotinfo',
      ['<TYPE>MVIN</TYPE>', '<LOTID>LOT-1</LOTID>', '<FACILITY>FAB-A</FACILITY>'],
    ],
    [
      'remoteEqpInfo',
      () => impApi.remoteEqpInfo('IMP-1'),
      '/hifos/remoteeqpinfo',
      ['<EQPID>IMP-1</EQPID>'],
    ],
    [
      'recipeInfo',
      () => impApi.recipeInfo('LOT-1', '20000', '01', 'PRD', 'IMP-1', 'P', 'FAB-A'),
      '/hifos/recipeinfo',
      [
        '<ISPHOTO>N</ISPHOTO>',
        '<OPERATION>20000</OPERATION>',
        '<SUBOPERATION>01</SUBOPERATION>',
        '<PRODUCT>PRD</PRODUCT>',
        '<OPTYPE>P</OPTYPE>',
      ],
    ],
    [
      'memorization',
      () => impApi.memorization('IMP-1', 'RCP', 'LOT-1'),
      '/hifos/memorization',
      [
        '<RECIPE>RCP</RECIPE>',
        '<CH_EQPID>IMP-1</CH_EQPID>',
        '<EQP_TYPE>IMP</EQP_TYPE>',
        '<PORTNAME></PORTNAME>',
      ],
    ],
    [
      'machinePortStatus',
      () => impApi.machinePortStatus('IMP-1', '2'),
      '/hifos/machineportstatus',
      ['<EQPID>IMP-1</EQPID>', '<PORTNAME>2</PORTNAME>'],
    ],
    [
      'machinePortClean',
      () => impApi.machinePortClean('IMP-1', '2'),
      '/hifos/machineportclear',
      ['<MACHINENAME>IMP-1</MACHINENAME>', '<PORTNAME>2</PORTNAME>'],
    ],
    [
      'areaBayInfo',
      () => impApi.areaBayInfo('FAB-A'),
      '/hifos/areabayinfo',
      ['<FACILITY>FAB-A</FACILITY>'],
    ],
    [
      'bayStockerInfo',
      () => impApi.bayStockerInfo('B1', 'FAB-A'),
      '/hifos/baystockerinfo',
      ['<BAY>B1</BAY>', '<FACILITY>FAB-A</FACILITY>'],
    ],
  ])('builds the %s request', async (_name, call, url, fragments) => {
    await call();
    expect(post.mock.calls[0]?.[0]).toBe(url);
    const xml = (post.mock.calls[0]?.[1] as { sMsg: string }).sMsg;
    expect(xml).toContain('<RECEIVER>SERVER</RECEIVER>');
    expect(xml).toContain('<SENDER>DEVICE</SENDER>');
    fragments.forEach((fragment) => expect(xml).toContain(fragment));
  });

  it('returns an empty body when the response has no MSGBODY', async () => {
    post.mockResolvedValueOnce({
      data: { statusCode: 200, result: JSON.stringify({ STATUS: 'PASS' }) },
    });
    expect(await impApi.areaBayInfo('FAB-A')).toEqual({ ok: true, body: {} });
  });

  it('returns the Error message when the request throws', async () => {
    post.mockRejectedValueOnce(new Error('network down'));
    expect(await impApi.areaBayInfo('FAB-A')).toEqual({ ok: false, message: 'network down' });
  });

  it('returns a generic message when a non-Error is thrown', async () => {
    post.mockRejectedValueOnce('boom');
    expect(await impApi.lotInfo('LOT-1', 'FAB-A')).toEqual({
      ok: false,
      message: 'LOTINFO request failed.',
    });
  });
});
