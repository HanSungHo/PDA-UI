import { testResultInputService as service } from 'src/features/test-result-input/services/test-result-input.service';
import apiClient from 'src/services/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/api-client', () => ({ default: { post: vi.fn() } }));

const device = {
  mobileServerName: 'SERVER',
  deviceName: 'PDA',
  operatorId: 'USER',
  operatorName: 'Operator',
};
const reply = (body: unknown, status = 'PASS') => ({
  data: {
    statusCode: 200,
    result: JSON.stringify({ STATUS: status, ERRMSG: 'server error', MSGBODY: body }),
  },
});
const info = {
  SERIALNO: '001234',
  PELLICLE: 'Y',
  TODATE: '2026-10-27',
  FABINDATE: '',
  EQPIDS: { EQPID: [{ ITEM1: 'EQP01' }] },
  INSPTYPES: { INSPTYPE: [{ ITEM1: '입고 검사' }] },
  INSPRESULTS: { INSPRESULT: [{ ITEM1: '사용불가' }] },
  INSPTYPE2S: { INSPTYPE2: [{ ITEM1: 'VISUAL' }] },
};

beforeEach(() => vi.mocked(apiClient.post).mockReset());

describe('test result input API', () => {
  it('maps lookup scalars and all four nested lists without choosing a value', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(reply(info));
    expect(await service.inspMaskInfo('MASK01', device)).toEqual({
      ok: true,
      data: {
        serialNo: '001234',
        pellicle: 'Y',
        testDay: '2026-10-27',
        fabInDate: '',
        eqpIds: ['EQP01'],
        inspTypes: ['입고 검사'],
        inspResults: ['사용불가'],
        inspType2s: ['VISUAL'],
      },
    });
    expect(apiClient.post).toHaveBeenCalledWith('/hifos/inspmaskinfo', {
      sMsg: expect.stringContaining('<MASKTAG>MASK01</MASKTAG>'),
    });
  });

  it('maps absent list containers to empty lists', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(reply({ SERIALNO: '12' }));
    expect(await service.inspMaskInfo('M', device)).toEqual({
      ok: true,
      data: {
        serialNo: '12',
        pellicle: '',
        testDay: '',
        fabInDate: '',
        eqpIds: [],
        inspTypes: [],
        inspResults: [],
        inspType2s: [],
      },
    });
  });

  it.each([
    ['EQPIDS', 'EQPID'],
    ['INSPTYPES', 'INSPTYPE'],
    ['INSPRESULTS', 'INSPRESULT'],
    ['INSPTYPE2S', 'INSPTYPE2'],
  ])('propagates a missing %s.%s array instead of reporting API FAIL', async (group, item) => {
    vi.mocked(apiClient.post).mockResolvedValue(reply({ ...info, [group]: {} }));
    await expect(service.inspMaskInfo('M', device)).rejects.toThrow(`${group}.${item} is missing`);
  });

  it('uses exact status and insert endpoints and payload field order', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(reply({ STATUS: 'RUN', MASK_TAG: 'RUN' }));
    expect(await service.inspMaskStatCheck('M&1', device)).toEqual({
      ok: true,
      data: { status: 'RUN', maskTag: 'RUN' },
    });
    expect(apiClient.post).toHaveBeenCalledWith('/hifos/inspmaskstatcheck', {
      sMsg: expect.stringContaining('<RETICLESEQ>M&1</RETICLESEQ>'),
    });
    const fields = {
      reticleSeq: 'M',
      eqpId: 'ALL',
      inspType: '입고 검사',
      inspType2: 'VISUAL',
      inspResult: '사용불가',
      inspText: '<note>',
      holdText: 'HOLD',
      fabInDate: '',
    };
    expect(await service.inspMaskInsert(fields, device)).toEqual({ ok: true, data: undefined });
    const [url, payload] = vi.mocked(apiClient.post).mock.calls[1]!;
    expect(url).toBe('/hifos/inspmaskinsert');
    const xml = (payload as { sMsg: string }).sMsg;
    expect(xml).toContain('<MSGNAME>INSPMASKINSERT</MSGNAME>');
    expect(xml).toContain('<INSPTEXT><note></INSPTEXT>');
    expect(xml).toContain('<USERID>USER</USERID>');
    expect(xml).toContain('<USERNAME>Operator</USERNAME>');
    const names = [
      'RETICLESEQ',
      'EQPID',
      'INSPTYPE',
      'INSPTYPE2',
      'INSPRESULT',
      'INSPTEXT',
      'HOLDTEXT',
      'USERID',
      'USERNAME',
      'FABINDATE',
    ];
    expect(names.map((name) => xml.indexOf(`<${name}>`))).toEqual(
      [...names.map((name) => xml.indexOf(`<${name}>`))].sort((a, b) => a - b),
    );
  });

  it('preserves FAIL and network errors and rejects missing body', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce(reply({}, 'FAIL'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(reply(null));
    expect(await service.inspMaskInfo('M', device)).toEqual({ ok: false, message: 'server error' });
    expect(await service.inspMaskInfo('M', device)).toEqual({ ok: false, message: 'offline' });
    expect(await service.inspMaskInfo('M', device)).toEqual({
      ok: false,
      message: 'BODY가 존재하지 않습니다',
    });
  });

  it('uses an empty message when FAIL JSON omits ERRMSG', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { statusCode: 200, result: JSON.stringify({ STATUS: 'FAIL', MSGBODY: {} }) },
    });
    expect(await service.inspMaskInfo('M', device)).toEqual({ ok: false, message: '' });
  });

  it('preserves raw XML field values from Android payload generation', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(reply({ STATUS: 'READY', MASK_TAG: '' }));
    await service.inspMaskStatCheck('M&<1', device);
    expect(apiClient.post).toHaveBeenCalledWith('/hifos/inspmaskstatcheck', {
      sMsg: expect.stringContaining('<RETICLESEQ>M&<1</RETICLESEQ>'),
    });
  });
});
