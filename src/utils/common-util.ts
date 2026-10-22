import { Capacitor, registerPlugin } from '@capacitor/core';
import { DeviceInfo } from 'src/constants/device-info';

export interface HifosSystemSettingBridge {
  getWifiIpAddress(): Promise<{ ipAddress: string | null }>;
  getBluetoothName(): Promise<{ bluetoothName: string | null }>;
  setBluetoothName(options: { name: string }): Promise<{ success: boolean; bluetoothName: string }>;
}

export const HifosSystemSetting = registerPlugin<HifosSystemSettingBridge>('HifosSystemSetting');

/**
 * Common utility functions mirroring legacy Android `CommonUtil.kt`.
 * Provides shared hardware, network, and input utility logic for all screens.
 */
export class CommonUtil {
  /**
   * Hide soft keyboard.
   * Mirrors legacy: `CommonUtil.hideKeyboard(context: AppCompatActivity, current: View?)`
   */
  static hideKeyboard(): void {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  /**
   * Retrieves the current Wi-Fi IP address of the PDA device.
   * Mirrors legacy: `CommonUtil.wifiIpAddress(context: Context): String?`
   * Calls native Capacitor plugin `HifosSystemSetting.getWifiIpAddress()`.
   */
  static async wifiIpAddress(): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    try {
      const result = await HifosSystemSetting.getWifiIpAddress();
      return result?.ipAddress || null;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves the current PDA device name (Bluetooth adapter name).
   * Mirrors legacy: `BluetoothAdapter.getDefaultAdapter()?.name` / `DeviceInfo.DEVICE_NAME`
   * Queries native `HifosSystemSetting.getBluetoothName()` on Android devices and syncs DeviceInfo.
   */
  static async getPDAName(): Promise<string> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await HifosSystemSetting.getBluetoothName();
        if (result?.bluetoothName) {
          DeviceInfo.DEVICE_NAME = result.bluetoothName;
          return result.bluetoothName;
        }
      } catch {
        // Fallback to in-memory DeviceInfo if native call fails
      }
    }
    return DeviceInfo.DEVICE_NAME || '';
  }

  /**
   * Updates the PDA device name across global state and native Bluetooth hardware.
   * Mirrors legacy: `bluetoothAdapter.name = newName; DeviceInfo.DEVICE_NAME = newName`
   * Invokes native `HifosSystemSetting.setBluetoothName(...)` on Android devices and syncs DeviceInfo.
   */
  static async setPDAName(name: string): Promise<string> {
    const trimmed = name.trim();
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await HifosSystemSetting.setBluetoothName({ name: trimmed });
        if (result?.bluetoothName) {
          DeviceInfo.DEVICE_NAME = result.bluetoothName;
          return result.bluetoothName;
        }
      } catch {
        // Fallback to in-memory DeviceInfo if native call fails
      }
    }
    DeviceInfo.DEVICE_NAME = trimmed;
    return trimmed;
  }

  /**
   * Validates if a PDA device name follows the required convention:
   * Starts with "AR" (case-insensitive) and total length <= 10.
   * Mirrors legacy: `CommonUtil.checkPDAName(context: Context)`
   */
  static isValidPDAName(pdaName?: string | null): boolean {
    if (!pdaName) {
      return false;
    }

    const trimmed = pdaName.trim().toUpperCase();
    return trimmed.startsWith('AR') && trimmed.length <= 10;
  }
}
