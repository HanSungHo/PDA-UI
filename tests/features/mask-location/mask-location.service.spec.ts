import { maskLocationService as service } from 'src/features/mask-location/services/mask-location.service';
import apiClient from 'src/services/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('src/services/api-client', () => ({ default: { post: vi.fn() } }));
const device = {
  mobileServerName: 'SERVER',
  deviceName: 'PDA',
  facility: 'FAB',
  operatorId: 'USER',
};
const reply = (body: unknown, status = 'PASS') => ({
  data: {
    statusCode: 200,
    result: JSON.stringify({ STATUS: status, ERRMSG: 'server error', MSGBODY: body }),
  },
});
beforeEach(() => vi.mocked(apiClient.post).mockReset());
describe('mask location transport', () => {
  it.each([
    [
      'maskInfo',
      ['MASK01', device],
      'maskinfo',
      'MASKINFO',
      { RETICLEID: 'MASK01', FACILITY: 'FAB' },
    ],
    ['maskStatusInfo', [device], 'maskstatusinfo', 'MASKSTATUSINFO', { FACILITY: 'FAB' }],
    [
      'maskLocGroupInfo',
      ['READY', '2F', device],
      'masklocgroupinfo',
      'MASKLOCGROUPINFO',
      { STATUS: 'READY', FLOOR: '2F', FACILITY: 'FAB' },
    ],
    [
      'maskLocationInfo',
      ['READY', 'GROUP', '2F', device],
      'masklocgroupinfo',
      'MASKLOCATIONINFO',
      { STATUS: 'READY', LOCGROUP: 'GROUP', FLOOR: '2F', FACILITY: 'FAB' },
    ],
    [
      'checkMaskPMS',
      ['MASK01', 'SHELF01', device],
      'checkmaskpms',
      'CHECKMASKPMS',
      { RETICLEID: 'MASK01', PMSSHELF: 'SHELF01' },
    ],
    [
      'checkPellicle',
      ['MASK01', 'EQP01', device],
      'checkpellicle',
      'CHECKPELLICLE',
      { RETICLEID: 'MASK01', MACHINENAME: 'EQP01' },
    ],
  ])('%s uses exact endpoint and fields', async (method, args, endpoint, name, fields) => {
    vi.mocked(apiClient.post).mockResolvedValue(reply({}));
    await (service[method as keyof typeof service] as (...a: unknown[]) => Promise<unknown>)(
      ...(args as unknown[]),
    );
    expect(apiClient.post).toHaveBeenCalledWith(`/hifos/${endpoint}`, { sMsg: expect.any(String) });
    const xml = (vi.mocked(apiClient.post).mock.calls[0]?.[1] as { sMsg: string }).sMsg;
    expect(xml).toContain(`<MSGNAME>${name}</MSGNAME>`);
    for (const [key, value] of Object.entries(fields))
      expect(xml).toContain(`<${key}>${value}</${key}>`);
    expect(xml).toContain('<RECEIVER>SERVER</RECEIVER>');
    expect(xml).toContain('<SENDER>PDA</SENDER>');
  });
  it('saves all fields through checkpellicle', async () => {
    const fields = {
      RETICLEID: 'MASK01',
      FACILITY: 'FAB',
      LOCTYPE: 'ETC',
      LOCATION: '',
      ETCSTATUS: 'READY',
      ETCLOCATION: 'GROUP',
      ETCDETAILLOC: 'SHELF01',
      SUBLOCATION3: 'EQP01',
      OPERATORID: 'USER',
      FLOOR: '',
    };
    vi.mocked(apiClient.post).mockResolvedValue(reply({ RETCILES: 'MASK01', SCOUNT: '1' }));
    expect(await service.changeMaskLocation(fields, device)).toEqual({
      ok: true,
      data: { RETCILES: 'MASK01', SCOUNT: '1' },
    });
    const [url, payload] = vi.mocked(apiClient.post).mock.calls[0]!;
    expect(url).toBe('/hifos/checkpellicle');
    for (const [key, value] of Object.entries(fields))
      expect((payload as { sMsg: string }).sMsg).toContain(`<${key}>${value}</${key}>`);
    expect((payload as { sMsg: string }).sMsg).toContain('<MSGNAME>CHANGEMASKLOCATION</MSGNAME>');
  });
  it('maps lists and empty lists deterministically', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce(reply({ STATUSES: { ITEM: [{ STATUS: 'READY' }] } }))
      .mockResolvedValueOnce(reply({ LOCGROUPS: { ITEM: [{ LOCGROUP: 'G1' }] } }))
      .mockResolvedValueOnce(reply({ LOCATIONS: { ITEM: [{ LOCATION: 'S1' }] } }))
      .mockResolvedValueOnce(reply({ LOCATIONS: { ITEM: [] } }));
    expect(await service.maskStatusInfo(device)).toEqual({ ok: true, data: ['READY'] });
    expect(await service.maskLocGroupInfo('READY', '', device)).toEqual({ ok: true, data: ['G1'] });
    expect(await service.maskLocationInfo('READY', 'G1', '', device)).toEqual({
      ok: true,
      data: ['S1'],
    });
    expect(await service.maskLocationInfo('READY', 'G1', '', device)).toEqual({
      ok: true,
      data: [],
    });
  });
  it.each([undefined, null, ''])('rejects absent body %s', async (body) => {
    vi.mocked(apiClient.post).mockResolvedValue(reply(body));
    expect(await service.maskInfo('M', device)).toEqual({
      ok: false,
      message: 'BODY가 존재하지 않습니다',
    });
  });
  it('preserves FAIL and network errors and rejects malformed responses', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce(reply('', 'FAIL'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: { statusCode: 200, result: 'bad json' } });
    expect(await service.maskInfo('M', device)).toEqual({ ok: false, message: 'server error' });
    expect(await service.maskInfo('M', device)).toEqual({ ok: false, message: 'offline' });
    expect((await service.maskInfo('M', device)).ok).toBe(false);
  });
  it('escapes XML and maps check values', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce(reply({ CHECKPSMSHELF: 'N' }))
      .mockResolvedValueOnce(reply({ CHECKPELLICLE: 'Y' }));
    expect(await service.checkMaskPMS('&<>"\'', 'S', device)).toEqual({ ok: true, data: 'N' });
    expect((vi.mocked(apiClient.post).mock.calls[0]?.[1] as { sMsg: string }).sMsg).toContain(
      '&amp;&lt;&gt;&quot;&apos;',
    );
    expect(await service.checkPellicle('M', 'E', device)).toEqual({ ok: true, data: 'Y' });
  });
});
