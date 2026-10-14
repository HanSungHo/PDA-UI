import {
  DEV_MOBILE_SERVER_IP,
  DEV_MOBILE_SERVER_NAME,
  DEV_SERVER,
  MOBILE_SERVER_PORT,
  PROD_MOBILE_SERVER_IP,
  PROD_MOBILE_SERVER_NAME,
  PROD_SERVER,
  UPDATE_SERVER_PORT,
} from 'src/constants/server';
import type { ServerConfig } from 'src/services/server-config.service';

import type {
  SystemSettingApi,
  SystemSettingDependencies,
  SystemSettingForm,
} from '../types/system-setting.types';

export function createSystemSettingApi(dependencies: SystemSettingDependencies): SystemSettingApi {
  function getServerInfo(): SystemSettingForm {
    const configs = dependencies.readServerConfigs();
    const prodServerInfo = configs.find((config) => config.serverType === PROD_SERVER);
    const devServerInfo = configs.find((config) => config.serverType === DEV_SERVER);

    return {
      editProdServer: prodServerInfo?.serverUrl ?? PROD_MOBILE_SERVER_IP,
      editDevServer: devServerInfo?.serverUrl ?? DEV_MOBILE_SERVER_IP,
      selectedServer: prodServerInfo?.selectedServer === false ? DEV_SERVER : PROD_SERVER,
    };
  }

  async function saveServerInfo(form: SystemSettingForm): Promise<boolean> {
    const host = form.selectedServer === PROD_SERVER ? form.editProdServer : form.editDevServer;
    const checkUrl = `http://${host}:${MOBILE_SERVER_PORT}`;
    const response = await dependencies.checkAPI(checkUrl);
    if (response.statusCode !== 200) return false;

    const configs: ServerConfig[] = [
      {
        serverType: PROD_SERVER,
        serverName: PROD_MOBILE_SERVER_NAME,
        serverUrl: form.editProdServer,
        selectedServer: form.selectedServer === PROD_SERVER,
      },
      {
        serverType: DEV_SERVER,
        serverName: DEV_MOBILE_SERVER_NAME,
        serverUrl: form.editDevServer,
        selectedServer: form.selectedServer === DEV_SERVER,
      },
    ];
    dependencies.saveServerConfigs(configs);
    dependencies.applyServerInfo({
      mobileServerUrl: checkUrl,
      updateServerUrl: `http://${form.editProdServer}:${UPDATE_SERVER_PORT}`,
      mobileServerName:
        form.selectedServer === PROD_SERVER ? PROD_MOBILE_SERVER_NAME : DEV_MOBILE_SERVER_NAME,
    });
    return true;
  }

  async function download(fileName: string): Promise<void> {
    const { editProdServer } = getServerInfo();
    await dependencies.downloadApk(
      `http://${editProdServer}:${UPDATE_SERVER_PORT}/upload/${fileName}`,
      fileName,
    );
  }

  return {
    getServerInfo,
    saveServerInfo,
    downLoadBatterMonitor: () => download('EmBatteryMonitor.apk'),
    downLoadPmdm: () => download('PMDMAgent.apk'),
  };
}
