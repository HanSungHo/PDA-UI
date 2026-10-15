export interface MainDeviceInfo {
  deviceName: string;
}

export interface MainSettingInfo {
  area: string;
  bay: string;
  facility: string;
  forwardCount: string;
  historyCount: string;
}

export interface MainServerInfo {
  mobileServerName: string;
  mobileServerUrl: string;
  updateServerUrl: string;
}

export interface MainUserInfo {
  operId: string;
  operName: string;
  permission: string;
  facility?: string;
  area?: string;
  bay?: string;
}

export interface MainStateProvider {
  loadDeviceInfo(): Promise<MainDeviceInfo>;
  loadServerInfo(): Promise<MainServerInfo>;
  loadSettingInfo(): Promise<MainSettingInfo | null>;
  loadUserInfo(): Promise<MainUserInfo | null>;
  saveSettingInfo(settingInfo: MainSettingInfo): Promise<void>;
  saveUserInfo(userInfo: MainUserInfo): Promise<void>;
  logout(): Promise<void>;
}
