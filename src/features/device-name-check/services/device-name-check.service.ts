import { CommonUtil } from 'src/utils/common-util';

/**
 * Service for PDA Device Name Check Dialog.
 * Mirrors business logic from legacy `DeviceNameCheckActivity.kt` and `CommonUtil.kt`.
 */
export const deviceNameCheckService = {
  /**
   * Retrieves the current Wi-Fi IP address of the PDA.
   * Mirrors legacy: `CommonUtil.wifiIpAddress(context)`
   */
  async getPdaIpAddress(): Promise<string> {
    const ip = await CommonUtil.wifiIpAddress();
    return ip || '';
  },

  /**
   * Retrieves the current Bluetooth/PDA device name.
   * Mirrors legacy: `BluetoothAdapter.getDefaultAdapter().name` / `DeviceInfo.DEVICE_NAME`
   */
  async getCurrentDeviceName(): Promise<string> {
    return await CommonUtil.getPDAName();
  },

  /**
   * Applies the new device name by updating Bluetooth name and global DeviceInfo.
   * Mirrors legacy: `bluetoothAdapter.name = newName; DeviceInfo.DEVICE_NAME = newName`
   */
  async updateDeviceName(digits: string): Promise<string> {
    const newName = `AR${digits.trim()}`;
    return await CommonUtil.setPDAName(newName);
  },
};
