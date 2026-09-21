import { describe, expect, it } from 'vitest';

import { loadDeviceInfo } from 'src/services/device-info.service';

describe('loadDeviceInfo', () => {
  it('uses the native PDA bluetooth name before other fallbacks', async () => {
    await expect(
      loadDeviceInfo({
        PdaDevice: {
          getBluetoothName: () => Promise.resolve({ name: ' pda-bt-01 ' }),
        },
      }),
    ).resolves.toEqual({ deviceName: 'PDA-BT-01' });
  });

  it('does not fall back to Capacitor Device name or env when bluetooth name is unavailable', async () => {
    await expect(
      loadDeviceInfo({
        Device: {
          getInfo: () => Promise.resolve({ name: ' pda-device ' }),
        },
      } as never),
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
        PdaDevice: {
          getBluetoothName: () => Promise.resolve({ name: '' }),
        },
      }),
    ).resolves.toEqual({ deviceName: 'AR-DEMO' });
  });
});
