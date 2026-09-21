import { beforeEach, describe, expect, it } from 'vitest';

import {
  DEV_SERVER,
  MOBILE_SERVER_PORT,
  PROD_SERVER,
  UPDATE_SERVER_PORT,
} from 'src/constants/server';
import {
  loadServerInfo,
  readServerConfigs,
  saveServerConfigs,
} from 'src/services/server-config.service';

describe('server config service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds PROD and DEV server config using the legacy defaults', () => {
    const serverInfo = loadServerInfo();
    const configs = readServerConfigs();

    expect(configs).toEqual([
      {
        selectedServer: true,
        serverName: 'L4-DEVICE',
        serverType: PROD_SERVER,
        serverUrl: '127.0.0.1',
      },
      {
        selectedServer: false,
        serverName: 'DEV-SERVER',
        serverType: DEV_SERVER,
        serverUrl: '10.0.0.1',
      },
    ]);
    expect(serverInfo).toEqual({
      mobileServerName: 'L4-DEVICE',
      mobileServerUrl: `http://127.0.0.1:${MOBILE_SERVER_PORT}`,
      updateServerUrl: `http://127.0.0.1:${UPDATE_SERVER_PORT}`,
    });
  });

  it('builds the mobile server from selected DEV while update server stays on PROD', () => {
    saveServerConfigs([
      {
        selectedServer: false,
        serverName: 'L4-DEVICE',
        serverType: PROD_SERVER,
        serverUrl: '172.16.0.10',
      },
      {
        selectedServer: true,
        serverName: 'DEV-SERVER',
        serverType: DEV_SERVER,
        serverUrl: '172.16.0.20',
      },
    ]);

    expect(loadServerInfo()).toEqual({
      mobileServerName: 'DEV-SERVER',
      mobileServerUrl: `http://172.16.0.20:${MOBILE_SERVER_PORT}`,
      updateServerUrl: `http://172.16.0.10:${UPDATE_SERVER_PORT}`,
    });
  });
});
