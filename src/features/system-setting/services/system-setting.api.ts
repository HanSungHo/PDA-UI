import { RETROFIT_READ_TIMEOUT } from 'src/constants/server';
import { useMainStore } from 'src/features/main/stores/main.store';
import { createApiClient } from 'src/services/api-client';
import {
  loadServerInfo,
  readServerConfigs,
  saveServerConfigs,
} from 'src/services/server-config.service';

import { createSystemSettingApi } from './system-setting.service';
import { downloadApk } from './system-setting-native.service';

export async function checkAPI(checkUrl: string): Promise<{ statusCode: number }> {
  const response = await createApiClient({ baseURL: checkUrl }).get<unknown>('/hifos/check', {
    timeout: RETROFIT_READ_TIMEOUT * 1000,
  });
  const data = response.data;
  if (
    !data ||
    typeof data !== 'object' ||
    !('statusCode' in data) ||
    typeof data.statusCode !== 'number'
  ) {
    throw new Error('Invalid hifosCheck response');
  }
  return { statusCode: data.statusCode };
}

export const systemSettingApi = createSystemSettingApi({
  readServerConfigs() {
    loadServerInfo();
    return readServerConfigs();
  },
  saveServerConfigs,
  checkAPI,
  applyServerInfo(info) {
    useMainStore().applyServerInfo(info);
  },
  downloadApk,
});
