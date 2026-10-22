import { createPinia, setActivePinia } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { DeviceInfo } from 'src/constants/device-info';
import { deviceNameCheckService } from 'src/features/device-name-check/services/device-name-check.service';
import { useDeviceNameCheckStore } from 'src/features/device-name-check/stores/device-name-check.store';
import { CommonUtil } from 'src/utils/common-util';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('useDeviceNameCheckStore & deviceNameCheckService', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    DeviceInfo.DEVICE_NAME = 'ANDROID_000';
    vi.restoreAllMocks();
  });

  describe('deviceNameCheckService', () => {
    it('returns empty string when Wi-Fi IP is null', async () => {
      vi.spyOn(CommonUtil, 'wifiIpAddress').mockResolvedValue(null);
      const ip = await deviceNameCheckService.getPdaIpAddress();
      expect(ip).toBe('');
    });

    it('returns Wi-Fi IP when CommonUtil provides it', async () => {
      vi.spyOn(CommonUtil, 'wifiIpAddress').mockResolvedValue('192.168.0.50');
      const ip = await deviceNameCheckService.getPdaIpAddress();
      expect(ip).toBe('192.168.0.50');
    });

    it('returns current device name from CommonUtil / DeviceInfo', async () => {
      DeviceInfo.DEVICE_NAME = 'AR-DEMO';
      const name = await deviceNameCheckService.getCurrentDeviceName();
      expect(name).toBe('AR-DEMO');
    });

    it('updates device name with prefix AR', async () => {
      const result = await deviceNameCheckService.updateDeviceName('777');
      expect(result).toBe('AR777');
      expect(DeviceInfo.DEVICE_NAME).toBe('AR777');
    });
  });

  describe('useDeviceNameCheckStore', () => {
    it('initializes with default values', () => {
      const store = useDeviceNameCheckStore();
      expect(store.pdaIp).toBe('');
      expect(store.currentPdaName).toBe('');
      expect(store.newPdaDigits).toBe('');
      expect(store.isLoading).toBe(false);
      expect(store.isOpen).toBe(false);
      expect(store.alertState.isOpen).toBe(false);
      expect(store.fullNewDeviceName).toBe('AR');
    });

    it('initializes modal with service data when no params provided', async () => {
      vi.spyOn(CommonUtil, 'wifiIpAddress').mockResolvedValue('192.168.1.100');
      DeviceInfo.DEVICE_NAME = 'AR-DEMO';

      const store = useDeviceNameCheckStore();
      await store.initModal();

      expect(store.pdaIp).toBe('192.168.1.100');
      expect(store.currentPdaName).toBe('AR-DEMO');
      expect(store.newPdaDigits).toBe('');
      expect(store.isOpen).toBe(true);
    });

    it('initializes modal with override params when provided', async () => {
      const store = useDeviceNameCheckStore();
      await store.initModal({ ip: '10.10.10.10', deviceName: 'AR-CUSTOM' });

      expect(store.pdaIp).toBe('10.10.10.10');
      expect(store.currentPdaName).toBe('AR-CUSTOM');
      expect(store.isOpen).toBe(true);
    });

    it('sanitizes non-digits and restricts to 3 characters in setNewPdaDigits', () => {
      const store = useDeviceNameCheckStore();

      store.setNewPdaDigits('abc123xyz');
      expect(store.newPdaDigits).toBe('123');

      store.setNewPdaDigits('12345');
      expect(store.newPdaDigits).toBe('123');

      store.setNewPdaDigits('9');
      expect(store.newPdaDigits).toBe('9');
    });

    it('computes fullNewDeviceName reactively', () => {
      const store = useDeviceNameCheckStore();
      store.setNewPdaDigits('555');
      expect(store.fullNewDeviceName).toBe('AR555');
    });

    describe('validation logic', () => {
      it('fails validation when input is empty', () => {
        const store = useDeviceNameCheckStore();
        store.newPdaDigits = '';

        const result = store.validateInput();
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('EMPTY');
        expect(result.message).toBe('새로운 PDA 명이 비어있습니다.');
      });

      it('fails validation when input length is less than 3 digits', () => {
        const store = useDeviceNameCheckStore();
        store.newPdaDigits = '12';

        const result = store.validateInput();
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('INVALID_LENGTH');
        expect(result.message).toBe('3자리 숫자를 입력해주세요.');
      });

      it('passes validation when input has exactly 3 digits', () => {
        const store = useDeviceNameCheckStore();
        store.newPdaDigits = '123';

        const result = store.validateInput();
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('alert dialog controls', () => {
      it('shows alert dialog with title and message', () => {
        const store = useDeviceNameCheckStore();
        store.showAlert('오류', '오류 메시지');

        expect(store.alertState).toEqual({
          isOpen: true,
          title: '오류',
          message: '오류 메시지',
        });
      });

      it('dismisses alert dialog and resets alert state', () => {
        const store = useDeviceNameCheckStore();
        store.showAlert('오류', '오류 메시지');
        store.dismissAlert();

        expect(store.alertState).toEqual({
          isOpen: false,
          title: '',
          message: '',
        });
      });
    });

    describe('closeModal & reset', () => {
      it('closes modal', () => {
        const store = useDeviceNameCheckStore();
        store.isOpen = true;
        store.closeModal();
        expect(store.isOpen).toBe(false);
      });

      it('resets all state to initial values', () => {
        const store = useDeviceNameCheckStore();
        store.pdaIp = '192.168.1.1';
        store.currentPdaName = 'AR001';
        store.newPdaDigits = '999';
        store.isOpen = true;
        store.isLoading = true;
        store.showAlert('오류', '메시지');

        store.reset();

        expect(store.pdaIp).toBe('');
        expect(store.currentPdaName).toBe('');
        expect(store.newPdaDigits).toBe('');
        expect(store.isOpen).toBe(false);
        expect(store.isLoading).toBe(false);
        expect(store.alertState.isOpen).toBe(false);
      });
    });

    describe('submitDeviceNameChange', () => {
      it('shows error dialog and returns null when validation fails on empty input', async () => {
        const store = useDeviceNameCheckStore();
        store.newPdaDigits = '';

        const result = await store.submitDeviceNameChange();

        expect(result).toBeNull();
        expect(store.alertState.isOpen).toBe(true);
        expect(store.alertState.title).toBe(COMMON_FIELD.TXTDIALOGTITLE_ERROR);
        expect(store.alertState.message).toBe('새로운 PDA 명이 비어있습니다.');
      });

      it('shows error dialog and returns null when validation fails on partial digits', async () => {
        const store = useDeviceNameCheckStore();
        store.newPdaDigits = '12';

        const result = await store.submitDeviceNameChange();

        expect(result).toBeNull();
        expect(store.alertState.isOpen).toBe(true);
        expect(store.alertState.title).toBe(COMMON_FIELD.TXTDIALOGTITLE_ERROR);
        expect(store.alertState.message).toBe('3자리 숫자를 입력해주세요.');
      });

      it('successfully updates device name, closes modal, and returns updated name', async () => {
        const store = useDeviceNameCheckStore();
        store.isOpen = true;
        store.newPdaDigits = '789';

        const result = await store.submitDeviceNameChange();

        expect(result).toBe('AR789');
        expect(store.currentPdaName).toBe('AR789');
        expect(DeviceInfo.DEVICE_NAME).toBe('AR789');
        expect(store.isOpen).toBe(false);
        expect(store.isLoading).toBe(false);
      });
    });
  });
});
