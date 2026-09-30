export interface PdaDeviceNameInfo {
  deviceName: string;
}

interface PdaDevicePlugin {
  getBluetoothName(): Promise<{ name?: string } | string>;
}

interface DevicePluginRuntime {
  PdaDevice?: PdaDevicePlugin;
}

const DEFAULT_DEVICE_NAME = 'AR-DEMO';

export async function loadDeviceInfo(
  runtime: DevicePluginRuntime = getDeviceRuntime(),
): Promise<PdaDeviceNameInfo> {
  const deviceName = (await readPdaBluetoothName(runtime)) ?? DEFAULT_DEVICE_NAME;

  return { deviceName };
}

async function readPdaBluetoothName(runtime: DevicePluginRuntime): Promise<string | undefined> {
  try {
    const bluetoothName = await runtime.PdaDevice?.getBluetoothName();
    const rawName = typeof bluetoothName === 'string' ? bluetoothName : bluetoothName?.name;

    return normalizeDeviceName(rawName);
  } catch {
    return undefined;
  }
}

function normalizeDeviceName(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim().toUpperCase();

  return normalizedValue || undefined;
}

function getDeviceRuntime(): DevicePluginRuntime {
  const runtime = globalThis as typeof globalThis & {
    Capacitor?: {
      Plugins?: DevicePluginRuntime;
    };
  };

  return runtime.Capacitor?.Plugins ?? {};
}
