import { describe, expect, it } from 'vitest';

import { loadDeviceInfo } from 'src/services/device-info.service';

describe('loadDeviceInfo', () => {
  it('uses the native Bluetooth adapter name before the browser fallback', async () => {
    await expect(
      loadDeviceInfo({
        HifosSystemSetting: {
          getBluetoothName: () => Promise.resolve({ bluetoothName: ' pda-bt-01 ' }),
        },
      }),
    ).resolves.toEqual({ deviceName: 'PDA-BT-01' });
  });

  it('does not fall back to Capacitor Device name or env when bluetooth name is unavailable', async () => {
    await expect(
      loadDeviceInfo({
        HifosSystemSetting: {
          getBluetoothName: () => Promise.resolve({ bluetoothName: null }),
        },
      }),
    ).resolves.toEqual({ deviceName: 'AR-DEMO' });
  });

  it('falls back to the default device name for browser preview', async () => {
    await expect(loadDeviceInfo({})).resolves.toEqual({
      deviceName: 'AR-DEMO',
    });
  });

  it('uses the legacy-safe default when every runtime source is empty or fails', async () => {
    await expect(
      loadDeviceInfo({
        HifosSystemSetting: {
          getBluetoothName: () => Promise.resolve({ bluetoothName: '' }),
        },
      }),
    ).resolves.toEqual({ deviceName: 'AR-DEMO' });
  });
});
