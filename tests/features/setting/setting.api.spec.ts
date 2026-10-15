import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('src/services/api-client', () => ({ default: { post } }));

import { DeviceInfo } from 'src/constants/device-info';
import { settingApi } from 'src/features/setting/services/setting.api';

describe('settingApi legacy contract', () => {
  beforeEach(() => {
    post.mockReset().mockResolvedValue({
      data: { statusCode: 200, result: JSON.stringify({ MSGBODY: {}, STATUS: 'PASS' }) },
    });
    Object.assign(DeviceInfo, {
      FACILITY: 'GUMI',
      AREA: 'PHOTO',
      BAY: 'P01',
      DEVICE_NAME: 'ANDROID_001',
      OPERATOR_ID: 'OP001',
    });
  });

  it('sends the exact six CONFIG parameters used by MessageFactoryUtil.config', async () => {
    await settingApi.sendConfig('192.168.0.10');

    expect(post).toHaveBeenCalledWith('/hifos/config', {
      FACILITY: 'GUMI',
      AREA: 'PHOTO',
      BAY: 'P01',
      DEVICENAME: 'ANDROID_001',
      IPADDR: '192.168.0.10',
      USERID: 'OP001',
    });
  });

  it('uses the legacy lowercase CONFINFO and AREABAYINFO endpoints and parses both BAYS shapes', async () => {
    post
      .mockResolvedValueOnce({
        data: {
          statusCode: 200,
          result: JSON.stringify({ MSGBODY: { ITEMS: [{ VALUE: 'GUMI' }] }, STATUS: 'PASS' }),
        },
      })
      .mockResolvedValueOnce({
        data: {
          statusCode: 200,
          result: JSON.stringify({ MSGBODY: { ITEMS: [{ VALUE: 'PHOTO' }] }, STATUS: 'PASS' }),
        },
      })
      .mockResolvedValueOnce({
        data: {
          statusCode: 200,
          result: JSON.stringify({ MSGBODY: { BAYS: { BAY: 'P01' } }, STATUS: 'PASS' }),
        },
      });

    await expect(settingApi.getFacility()).resolves.toEqual(['GUMI']);
    await expect(settingApi.getArea('GUMI')).resolves.toEqual(['PHOTO']);
    await expect(settingApi.getBay('PHOTO', 'GUMI')).resolves.toEqual(['P01']);

    expect(post).toHaveBeenNthCalledWith(1, '/hifos/confinfo', { IDENTCODE: 'F' });
    expect(post).toHaveBeenNthCalledWith(2, '/hifos/confinfo', {
      IDENTCODE: 'A',
      VALUE: 'GUMI',
    });
    expect(post).toHaveBeenNthCalledWith(3, '/hifos/areabayinfo', {
      AREA: 'PHOTO',
      FACILITY: 'GUMI',
    });
  });

  it('throws the legacy business error from a FAIL response envelope', async () => {
    post.mockResolvedValueOnce({
      data: {
        statusCode: 200,
        result: JSON.stringify({ ERRMSG: 'AREA DATA Empty!', MSGBODY: '', STATUS: 'FAIL' }),
      },
    });

    await expect(settingApi.getArea('FAIL-AREA')).rejects.toThrow('AREA DATA Empty!');
  });
});
