import type { ServerType } from 'src/constants/server';
import type { RuntimeServerInfo, ServerConfig } from 'src/services/server-config.service';

export interface SystemSettingForm {
  editProdServer: string;
  editDevServer: string;
  selectedServer: ServerType;
}

export interface SystemSettingDependencies {
  readServerConfigs(): ServerConfig[];
  saveServerConfigs(configs: ServerConfig[]): void;
  checkAPI(checkUrl: string): Promise<{ statusCode: number }>;
  applyServerInfo(info: RuntimeServerInfo): void;
  downloadApk(url: string, fileName: string): Promise<void>;
}

export interface SystemSettingApi {
  getServerInfo(): SystemSettingForm;
  saveServerInfo(form: SystemSettingForm): Promise<boolean>;
  downLoadBatterMonitor(): Promise<void>;
  downLoadPmdm(): Promise<void>;
}
