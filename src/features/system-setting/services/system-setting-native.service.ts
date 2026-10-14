import { Capacitor, registerPlugin } from '@capacitor/core';
import { createApiClient } from 'src/services/api-client';

export interface HifosSystemSettingBridge {
  downloadApk(options: { url: string; fileName: string }): Promise<void>;
  setBackBlocked(options: { blocked: boolean }): Promise<void>;
}

const HifosSystemSetting = registerPlugin<HifosSystemSettingBridge>('HifosSystemSetting');

export async function setBackBlocked(blocked: boolean): Promise<void> {
  if (Capacitor.isNativePlatform()) await HifosSystemSetting.setBackBlocked({ blocked });
}

export async function downloadApk(url: string, fileName: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await HifosSystemSetting.downloadApk({ url, fileName });
    return;
  }

  const response = await createApiClient().get<Blob>(url, {
    responseType: 'blob',
    timeout: 10000,
  });
  const objectUrl = URL.createObjectURL(response.data);
  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
