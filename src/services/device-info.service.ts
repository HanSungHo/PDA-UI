import { HifosSystemSetting } from 'src/utils/common-util';

export interface PdaDeviceNameInfo {
  deviceName: string;
}

interface HifosSystemSettingRuntime {
  getBluetoothName(): Promise<{ bluetoothName?: string | null } | string>;
}

interface DevicePluginRuntime {
  HifosSystemSetting?: HifosSystemSettingRuntime;
}

const DEFAULT_DEVICE_NAME = 'AR-DEMO';

export async function loadDeviceInfo(
  runtime: DevicePluginRuntime = { HifosSystemSetting },
): Promise<PdaDeviceNameInfo> {
  const deviceName = (await readPdaBluetoothName(runtime)) ?? DEFAULT_DEVICE_NAME;

  return { deviceName };
}

async function readPdaBluetoothName(runtime: DevicePluginRuntime): Promise<string | undefined> {
  try {
    const bluetoothName = await runtime.HifosSystemSetting?.getBluetoothName();
    const rawName =
      typeof bluetoothName === 'string'
        ? bluetoothName
        : (bluetoothName?.bluetoothName ?? undefined);

    return normalizeDeviceName(rawName);
  } catch {
    return undefined;
  }
}

function normalizeDeviceName(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim().toUpperCase();

  return normalizedValue || undefined;
}
