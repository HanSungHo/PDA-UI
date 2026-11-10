import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('src/services/api-client', () => ({ default: { post } }));

import { createPinia, setActivePinia } from 'pinia';
import { DeviceInfo } from 'src/constants/device-info';
import { settingApi } from 'src/features/setting/services/setting.api';

function reply(body: unknown, statusCode = 200) {
  return { data: { statusCode, result: typeof body === 'string' ? body : JSON.stringify(body) } };
}
function pass(msgBody: unknown) {
  return reply({ STATUS: 'PASS', MSGBODY: msgBody });
}
function sentXml(call = 0): string {
  return (post.mock.calls[call]?.[1] as { sMsg: string }).sMsg;
}

describe('settingApi legacy contract', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    post.mockReset().mockResolvedValue(pass({ CONFIG: 'OK' }));
    Object.assign(DeviceInfo, {
      FACILITY: 'GUMI',
      AREA: 'PHOTO',
      BAY: 'P01',
      DEVICE_NAME: 'ANDROID_001',
      OPERATOR_ID: 'OP001',
    });
  });

  it('posts the AIFMSG CONFIG envelope with the six MessageFactoryUtil.config fields', async () => {
    await settingApi.sendConfig('192.168.0.10');
    expect(post).toHaveBeenCalledWith('/hifos/config', { sMsg: expect.any(String) });
    const xml = sentXml();
    expect(xml).toContain('<MSGNAME>CONFIG</MSGNAME>');
    expect(xml).toContain('<MSGTYPE>P</MSGTYPE>');
    expect(xml).toContain('<WITHREPLY>YES</WITHREPLY>');
    const fields = [
      ['FACILITY', 'GUMI'],
      ['AREA', 'PHOTO'],
      ['BAY', 'P01'],
      ['DEVICENAME', 'ANDROID_001'],
      ['IPADDR', '192.168.0.10'],
      ['USERID', 'OP001'],
    ].map(([k, v]) => `<${k}>${v}</${k}>`);
    expect(fields.every((f) => xml.includes(f))).toBe(true);
    expect(fields.map((f) => xml.indexOf(f))).toEqual(
      [...fields.map((f) => xml.indexOf(f))].sort((a, b) => a - b),
    );
  });

  it('uses CONFINFO / AREABAYINFO envelopes and parses ITEMS.ITEM and BAYS.ITEM', async () => {
    post
      .mockResolvedValueOnce(pass({ ITEMS: { ITEM: [{ VALUE: 'GUMI' }, { VALUE: 'ICHEON' }] } }))
      .mockResolvedValueOnce(pass({ ITEMS: { ITEM: { VALUE: 'PHOTO' } } }))
      .mockResolvedValueOnce(pass({ BAYS: { ITEM: [{ BAY: 'P01' }, { BAY: 'P02' }] } }))
      .mockResolvedValueOnce(pass({ BAYS: { ITEM: { BAY: 'P01' } } }));

    await expect(settingApi.getFacility()).resolves.toEqual(['GUMI', 'ICHEON']);
    await expect(settingApi.getArea('GUMI')).resolves.toEqual(['PHOTO']);
    await expect(settingApi.getBay('PHOTO', 'GUMI')).resolves.toEqual(['P01', 'P02']);
    await expect(settingApi.getBay('PHOTO', 'GUMI')).resolves.toEqual(['P01']);

    expect(post.mock.calls.map((c) => c[0])).toEqual([
      '/hifos/confinfo',
      '/hifos/confinfo',
      '/hifos/areabayinfo',
      '/hifos/areabayinfo',
    ]);
    expect(sentXml(0)).toContain('<MSGNAME>CONFINFO</MSGNAME>');
    expect(sentXml(0)).toContain('<IDENTCODE>F</IDENTCODE>');
    expect(sentXml(1)).toContain('<IDENTCODE>A</IDENTCODE>');
    expect(sentXml(1)).toContain('<VALUE>GUMI</VALUE>');
    expect(sentXml(2)).toContain('<MSGNAME>AREABAYINFO</MSGNAME>');
    expect(sentXml(2)).toContain('<AREA>PHOTO</AREA>');
    expect(sentXml(2)).toContain('<FACILITY>GUMI</FACILITY>');
  });

  it('returns empty lists for missing/malformed containers and non-string members', async () => {
    post
      .mockResolvedValueOnce(pass({}))
      .mockResolvedValueOnce(pass({ ITEMS: { ITEM: [{ VALUE: 1 }, null, { VALUE: 'X' }] } }))
      .mockResolvedValueOnce(pass({ BAYS: 'x' }));
    await expect(settingApi.getFacility()).resolves.toEqual([]);
    await expect(settingApi.getArea('A')).resolves.toEqual(['X']);
    await expect(settingApi.getBay('A', 'B')).resolves.toEqual([]);
  });

  it('throws ERRMSG of a FAIL reply, and an empty message when ERRMSG is absent', async () => {
    post
      .mockResolvedValueOnce(reply({ ERRMSG: 'AREA DATA Empty!', MSGBODY: '', STATUS: 'FAIL' }))
      .mockResolvedValueOnce(reply({ STATUS: 'FAIL' }))
      .mockResolvedValueOnce(reply({ ERRMSG: 'x', STATUS: 'PASS', MSGBODY: {} }, 500));
    await expect(settingApi.getArea('FAIL-AREA')).rejects.toThrow('AREA DATA Empty!');
    await expect(settingApi.getFacility()).rejects.toHaveProperty('message', '');
    await expect(settingApi.getFacility()).rejects.toThrow('x');
  });

  it('throws the raw result when the reply is not JSON', async () => {
    post.mockResolvedValueOnce(reply('plain failure'));
    await expect(settingApi.sendConfig('1.1.1.1')).rejects.toThrow('plain failure');
  });

  it('turns a PASS with an empty MSGBODY into the MessageSender body error', async () => {
    post
      .mockResolvedValueOnce(reply({ STATUS: 'PASS', MSGBODY: '' }))
      .mockResolvedValueOnce(reply({ STATUS: 'PASS' }))
      .mockResolvedValueOnce(reply({ STATUS: 'PASS', MSGBODY: 'text' }));
    await expect(settingApi.sendConfig('1.1.1.1')).rejects.toThrow('BODY가 존재하지 않습니다');
    await expect(settingApi.getFacility()).rejects.toThrow('BODY가 존재하지 않습니다');
    await expect(settingApi.getFacility()).resolves.toEqual([]);
  });
});
