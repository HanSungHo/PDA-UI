import {
  downloadApk,
  getWifiIpAddress,
  setBackBlocked,
} from 'src/features/system-setting/services/system-setting-native.service';
import { createApiClient } from 'src/services/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const bridge = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  downloadApk: vi.fn(),
  setBackBlocked: vi.fn(),
  getWifiIpAddress: vi.fn(),
  get: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: bridge.isNativePlatform },
  registerPlugin: vi.fn(() => ({
    downloadApk: bridge.downloadApk,
    setBackBlocked: bridge.setBackBlocked,
    getWifiIpAddress: bridge.getWifiIpAddress,
  })),
}));
vi.mock('src/services/api-client', () => ({ createApiClient: vi.fn(() => ({ get: bridge.get })) }));

describe('System Setting platform bridge', () => {
  const url = 'http://172.16.0.10:8081/upload/EmBatteryMonitor.apk';
  const fileName = 'EmBatteryMonitor.apk';
  const createObjectURL = vi.fn(() => 'blob:apk');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    bridge.isNativePlatform.mockReturnValue(false);
    bridge.downloadApk.mockReset().mockResolvedValue(undefined);
    bridge.setBackBlocked.mockReset().mockResolvedValue(undefined);
    bridge.getWifiIpAddress.mockReset().mockResolvedValue({ ipAddress: '192.168.1.10' });
    bridge.get.mockReset();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    const OriginalURL = URL;
    vi.stubGlobal(
      'URL',
      class extends OriginalURL {
        static createObjectURL = createObjectURL;
        static revokeObjectURL = revokeObjectURL;
      },
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('downloads and hands off exact URL/filename to native installer', async () => {
    bridge.isNativePlatform.mockReturnValue(true);
    await downloadApk(url, fileName);
    expect(bridge.downloadApk).toHaveBeenCalledWith({ url, fileName });
    expect(bridge.get).not.toHaveBeenCalled();
  });

  it('propagates denied installation permission from native', async () => {
    bridge.isNativePlatform.mockReturnValue(true);
    bridge.downloadApk.mockRejectedValue(new Error('설치 권한이 필요합니다.'));
    await expect(downloadApk(url, fileName)).rejects.toThrow('설치 권한이 필요합니다.');
  });

  it('downloads a Blob on web, uses the exact filename, and releases the object URL', async () => {
    const blob = new Blob(['apk']);
    bridge.get.mockResolvedValue({ data: blob });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe(fileName);
      expect(this.href).toBe('blob:apk');
    });
    await downloadApk(url, fileName);
    expect(createApiClient).toHaveBeenCalledWith();
    expect(bridge.get).toHaveBeenCalledWith(url, { responseType: 'blob', timeout: 10000 });
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:apk');
    expect(bridge.downloadApk).not.toHaveBeenCalled();
  });

  it('does not create a browser download when fetching fails', async () => {
    bridge.get.mockRejectedValue(new Error('download failed'));
    await expect(downloadApk(url, fileName)).rejects.toThrow('download failed');
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('releases object URL even when launching the download fails', async () => {
    bridge.get.mockResolvedValue({ data: new Blob(['apk']) });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('blocked');
    });
    await expect(downloadApk(url, fileName)).rejects.toThrow('blocked');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:apk');
  });

  it('blocks and releases Android Back without requiring native plugins on web', async () => {
    await setBackBlocked(true);
    expect(bridge.setBackBlocked).not.toHaveBeenCalled();
    bridge.isNativePlatform.mockReturnValue(true);
    await setBackBlocked(true);
    await setBackBlocked(false);
    expect(bridge.setBackBlocked).toHaveBeenNthCalledWith(1, { blocked: true });
    expect(bridge.setBackBlocked).toHaveBeenNthCalledWith(2, { blocked: false });
  });

  it('reads Wi-Fi IP on native and preserves legacy null behavior on web', async () => {
    await expect(getWifiIpAddress()).resolves.toBeNull();
    bridge.isNativePlatform.mockReturnValue(true);
    await expect(getWifiIpAddress()).resolves.toBe('192.168.1.10');
    expect(bridge.getWifiIpAddress).toHaveBeenCalledOnce();
    bridge.getWifiIpAddress.mockResolvedValue({ ipAddress: null });
    await expect(getWifiIpAddress()).resolves.toBeNull();
  });
});
