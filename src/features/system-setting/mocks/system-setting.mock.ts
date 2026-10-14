import { DEV_SERVER, PROD_SERVER } from 'src/constants/server';
import type { RuntimeServerInfo, ServerConfig } from 'src/services/server-config.service';

import { createSystemSettingApi } from '../services/system-setting.service';
import type { SystemSettingMockCase } from '../types/system-setting.types';

export const systemSettingMockData: ServerConfig[] = [
  {
    serverType: PROD_SERVER,
    serverName: 'L4-DEVICE',
    serverUrl: '172.16.0.10',
    selectedServer: true,
  },
  {
    serverType: DEV_SERVER,
    serverName: 'DEV-SERVER',
    serverUrl: '172.16.0.20',
    selectedServer: false,
  },
];

export type SystemSettingMockRequest =
  | { operation: 'checkAPI'; checkUrl: string }
  | { operation: 'saveServerConfigs'; configs: ServerConfig[] }
  | { operation: 'applyServerInfo'; info: RuntimeServerInfo }
  | { operation: 'downloadApk'; url: string; fileName: string };

export function createSystemSettingMockApi(mockCase: SystemSettingMockCase = 'success') {
  const requests: SystemSettingMockRequest[] = [];
  let configs = systemSettingMockData.map((config) => ({
    ...config,
    selectedServer:
      mockCase === 'dev-selected' ? config.serverType === DEV_SERVER : config.selectedServer,
  }));
  if (mockCase === 'empty') configs = [];
  if (mockCase === 'missing-prod')
    configs = configs.filter((config) => config.serverType !== PROD_SERVER);
  if (mockCase === 'missing-dev')
    configs = configs.filter((config) => config.serverType !== DEV_SERVER);

  const api = createSystemSettingApi({
    readServerConfigs() {
      if (mockCase === 'load-error') throw new Error('Server info unavailable');
      return configs.map((config) => ({ ...config }));
    },
    saveServerConfigs(value) {
      requests.push({
        operation: 'saveServerConfigs',
        configs: value.map((config) => ({ ...config })),
      });
      if (mockCase === 'storage-error') throw new Error('Storage unavailable');
      configs = value.map((config) => ({ ...config }));
    },
    checkAPI(checkUrl) {
      requests.push({ operation: 'checkAPI', checkUrl });
      if (mockCase === 'network-error') return Promise.reject(new Error('Network unavailable'));
      return Promise.resolve({ statusCode: mockCase === 'check-rejected' ? 503 : 200 });
    },
    applyServerInfo(info) {
      requests.push({ operation: 'applyServerInfo', info: { ...info } });
    },
    downloadApk(url, fileName) {
      requests.push({ operation: 'downloadApk', url, fileName });
      if (mockCase === 'download-error') return Promise.reject(new Error('APK download failed'));
      if (mockCase === 'permission-denied')
        return Promise.reject(new Error('설치 권한이 필요합니다.'));
      return Promise.resolve();
    },
  });

  return { ...api, getRequests: () => structuredClone(requests) };
}
