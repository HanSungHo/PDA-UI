import { DeviceInfo } from 'src/constants/device-info';
import { CommonUtil } from 'src/utils/common-util';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const bridge = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => false),
  getWifiIpAddress: vi.fn(),
  getBluetoothName: vi.fn(),
  setBluetoothName: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: bridge.isNativePlatform,
  },
  registerPlugin: vi.fn(() => ({
    getWifiIpAddress: bridge.getWifiIpAddress,
    getBluetoothName: bridge.getBluetoothName,
    setBluetoothName: bridge.setBluetoothName,
  })),
}));

describe('CommonUtil', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    bridge.isNativePlatform.mockReset().mockReturnValue(false);
    bridge.getWifiIpAddress.mockReset().mockResolvedValue({ ipAddress: null });
    bridge.getBluetoothName.mockReset().mockResolvedValue({ bluetoothName: null });
    bridge.setBluetoothName.mockReset().mockResolvedValue({ success: true, bluetoothName: '' });
    DeviceInfo.DEVICE_NAME = 'ANDROID_000';
  });

  describe('hideKeyboard', () => {
    it('calls blur on active element if it is an HTMLElement', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
      const blurSpy = vi.spyOn(input, 'blur');

      CommonUtil.hideKeyboard();

      expect(blurSpy).toHaveBeenCalledOnce();
      document.body.removeChild(input);
    });

    it('does not throw when active element is not an HTMLElement', () => {
      expect(() => CommonUtil.hideKeyboard()).not.toThrow();
    });
  });

  describe('wifiIpAddress', () => {
    it('returns null when not on native platform', async () => {
      bridge.isNativePlatform.mockReturnValue(false);

      const ip = await CommonUtil.wifiIpAddress();

      expect(ip).toBeNull();
    });

    it('calls native plugin and returns ipAddress when on native platform', async () => {
      bridge.isNativePlatform.mockReturnValue(true);
      bridge.getWifiIpAddress.mockResolvedValue({ ipAddress: '192.168.1.100' });

      const ip = await CommonUtil.wifiIpAddress();

      expect(ip).toBe('192.168.1.100');
      expect(bridge.getWifiIpAddress).toHaveBeenCalledOnce();
    });

    it('returns null when native plugin throws error', async () => {
      bridge.isNativePlatform.mockReturnValue(true);
      bridge.getWifiIpAddress.mockRejectedValue(new Error('Native error'));

      const ip = await CommonUtil.wifiIpAddress();

      expect(ip).toBeNull();
    });
  });

  describe('getPDAName & setPDAName', () => {
    it('gets current device name from DeviceInfo when not on native platform', async () => {
      bridge.isNativePlatform.mockReturnValue(false);
      DeviceInfo.DEVICE_NAME = 'AR123';
      const name = await CommonUtil.getPDAName();
      expect(name).toBe('AR123');
    });

    it('queries native plugin for bluetooth name and syncs DeviceInfo when on native platform', async () => {
      bridge.isNativePlatform.mockReturnValue(true);
      bridge.getBluetoothName.mockResolvedValue({ bluetoothName: 'AR789' });

      const name = await CommonUtil.getPDAName();
      expect(name).toBe('AR789');
      expect(DeviceInfo.DEVICE_NAME).toBe('AR789');
      expect(bridge.getBluetoothName).toHaveBeenCalledOnce();
    });

    it('falls back to DeviceInfo when native getBluetoothName throws', async () => {
      bridge.isNativePlatform.mockReturnValue(true);
      bridge.getBluetoothName.mockRejectedValue(new Error('Bluetooth unavailable'));
      DeviceInfo.DEVICE_NAME = 'AR_FALLBACK';

      const name = await CommonUtil.getPDAName();
      expect(name).toBe('AR_FALLBACK');
    });

    it('sets new device name to DeviceInfo with trimmed value on non-native platform', async () => {
      bridge.isNativePlatform.mockReturnValue(false);
      const updated = await CommonUtil.setPDAName('  AR999  ');
      expect(updated).toBe('AR999');
      expect(DeviceInfo.DEVICE_NAME).toBe('AR999');
      expect(await CommonUtil.getPDAName()).toBe('AR999');
    });

    it('calls native setBluetoothName and syncs DeviceInfo on native platform', async () => {
      bridge.isNativePlatform.mockReturnValue(true);
      bridge.setBluetoothName.mockResolvedValue({
        success: true,
        bluetoothName: 'AR555',
      });

      const updated = await CommonUtil.setPDAName('AR555');
      expect(bridge.setBluetoothName).toHaveBeenCalledWith({ name: 'AR555' });
      expect(updated).toBe('AR555');
      expect(DeviceInfo.DEVICE_NAME).toBe('AR555');
    });

    it('falls back to DeviceInfo when native setBluetoothName throws', async () => {
      bridge.isNativePlatform.mockReturnValue(true);
      bridge.setBluetoothName.mockRejectedValue(new Error('Set failed'));

      const updated = await CommonUtil.setPDAName('AR888');
      expect(updated).toBe('AR888');
      expect(DeviceInfo.DEVICE_NAME).toBe('AR888');
    });
  });

  describe('isValidPDAName', () => {
    it('returns false for empty or null', () => {
      expect(CommonUtil.isValidPDAName(null)).toBe(false);
      expect(CommonUtil.isValidPDAName(undefined)).toBe(false);
      expect(CommonUtil.isValidPDAName('')).toBe(false);
      expect(CommonUtil.isValidPDAName('   ')).toBe(false);
    });

    it('returns false when name does not start with AR', () => {
      expect(CommonUtil.isValidPDAName('BR123')).toBe(false);
      expect(CommonUtil.isValidPDAName('ANDROID_000')).toBe(false);
      expect(CommonUtil.isValidPDAName('123AR')).toBe(false);
    });

    it('returns false when name length exceeds 10 characters', () => {
      expect(CommonUtil.isValidPDAName('AR123456789')).toBe(false); // 11 chars
    });

    it('returns true for valid PDA names', () => {
      expect(CommonUtil.isValidPDAName('AR123')).toBe(true);
      expect(CommonUtil.isValidPDAName('ar456')).toBe(true);
      expect(CommonUtil.isValidPDAName('AR-DEMO')).toBe(true);
      expect(CommonUtil.isValidPDAName('AR12345678')).toBe(true); // 10 chars
    });
  });
});
