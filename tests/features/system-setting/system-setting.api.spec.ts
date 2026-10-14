import { createPinia, setActivePinia } from 'pinia';
import { DeviceInfo } from 'src/constants/device-info';
import { DEV_SERVER, PROD_SERVER } from 'src/constants/server';
import { useMainStore } from 'src/features/main/stores/main.store';
import {
  checkAPI,
  systemSettingApi,
} from 'src/features/system-setting/services/system-setting.api';
import type * as ApiClientModule from 'src/services/api-client';
import apiClient, { createApiClient, setApiBaseUrl } from 'src/services/api-client';
import { loadServerInfo, readServerConfigs } from 'src/services/server-config.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const transport = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('src/services/api-client', async (importOriginal) => {
  const original = await importOriginal<typeof ApiClientModule>();
  return { ...original, createApiClient: vi.fn(() => ({ get: transport.get })) };
});

describe('System Setting real transport and runtime integration', () => {
  const previousServerName = DeviceInfo.MOBILE_SERVER_NAME;

  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    setApiBaseUrl('http://current-server:8080');
    transport.get.mockReset();
  });

  afterEach(() => {
    DeviceInfo.MOBILE_SERVER_NAME = previousServerName;
  });

  it('GETs /hifos/check at the candidate host with legacy 10-second timeout without changing shared baseURL', async () => {
    transport.get.mockResolvedValue({ status: 200, data: { result: '', statusCode: 200 } });
    expect(await checkAPI('http://5.6.7.8:8080')).toEqual({ statusCode: 200 });
    expect(createApiClient).toHaveBeenCalledWith({ baseURL: 'http://5.6.7.8:8080' });
    expect(transport.get).toHaveBeenCalledWith('/hifos/check', { timeout: 10000 });
    expect(apiClient.defaults.baseURL).toBe('http://current-server:8080');
  });

  it('uses JSON statusCode, not HTTP status', async () => {
    transport.get.mockResolvedValue({ status: 200, data: { result: '', statusCode: 503 } });
    expect(await checkAPI('http://5.6.7.8:8080')).toEqual({ statusCode: 503 });
  });

  it.each([null, '', [], {}, { statusCode: '200' }])(
    'rejects malformed JSON contract %j',
    async (data) => {
      transport.get.mockResolvedValue({ data });
      await expect(checkAPI('http://5.6.7.8:8080')).rejects.toThrow('Invalid hifosCheck response');
      expect(apiClient.defaults.baseURL).toBe('http://current-server:8080');
    },
  );

  it('propagates a timeout without replacing the active server', async () => {
    transport.get.mockRejectedValue(new Error('timeout'));
    await expect(checkAPI('http://5.6.7.8:8080')).rejects.toThrow('timeout');
    expect(apiClient.defaults.baseURL).toBe('http://current-server:8080');
  });

  it('seeds the two shared legacy defaults when opened directly', () => {
    expect(systemSettingApi.getServerInfo()).toEqual({
      editProdServer: '127.0.0.1',
      editDevServer: '10.0.0.1',
      selectedServer: PROD_SERVER,
    });
    expect(readServerConfigs()).toHaveLength(2);
  });

  it.each([PROD_SERVER, DEV_SERVER] as const)(
    'updates persisted records, store, DeviceInfo, and the shared API for %s',
    async (selectedServer) => {
      transport.get.mockResolvedValue({ data: { statusCode: 200 } });
      const form = { editProdServer: '172.16.0.10', editDevServer: '172.16.0.20', selectedServer };
      expect(await systemSettingApi.saveServerInfo(form)).toBe(true);
      const expected = {
        mobileServerName: selectedServer === PROD_SERVER ? 'L4-DEVICE' : 'DEV-SERVER',
        mobileServerUrl: `http://172.16.0.${selectedServer === PROD_SERVER ? '10' : '20'}:8080`,
        updateServerUrl: 'http://172.16.0.10:8081',
      };
      expect(loadServerInfo()).toEqual(expected);
      expect(useMainStore()).toMatchObject(expected);
      expect(DeviceInfo.MOBILE_SERVER_NAME).toBe(expected.mobileServerName);
      expect(apiClient.defaults.baseURL).toBe(expected.mobileServerUrl);
      expect(readServerConfigs().filter((config) => config.selectedServer)).toHaveLength(1);
      expect(systemSettingApi.getServerInfo()).toEqual(form);
    },
  );

  it('a rejected check leaves persisted records and runtime unchanged', async () => {
    const form = systemSettingApi.getServerInfo();
    const original = localStorage.getItem('server.info');
    transport.get.mockResolvedValue({ data: { statusCode: 0 } });
    expect(await systemSettingApi.saveServerInfo({ ...form, editProdServer: '9.8.7.6' })).toBe(
      false,
    );
    expect(localStorage.getItem('server.info')).toBe(original);
    expect(apiClient.defaults.baseURL).toBe('http://current-server:8080');
    expect(useMainStore().mobileServerUrl).toBe('');
  });
});
