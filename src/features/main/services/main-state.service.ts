import { setApiBaseUrl } from 'src/services/api-client';
import { loadDeviceInfo } from 'src/services/device-info.service';
import { loadServerInfo } from 'src/services/server-config.service';

import type { MainSettingInfo, MainStateProvider, MainUserInfo } from './main-state.types';

const SETTING_STORAGE_KEY = 'main.settingInfo';
const USER_STORAGE_KEY = 'main.userInfo';

export const mainStateProvider: MainStateProvider = {
  loadDeviceInfo,
  loadServerInfo() {
    const serverInfo = loadServerInfo();
    setApiBaseUrl(serverInfo.mobileServerUrl);

    return Promise.resolve(serverInfo);
  },
  loadSettingInfo() {
    return Promise.resolve(readStorageJson<MainSettingInfo>(SETTING_STORAGE_KEY));
  },
  loadUserInfo() {
    return Promise.resolve(readStorageJson<MainUserInfo>(USER_STORAGE_KEY));
  },
  logout() {
    localStorage.removeItem(USER_STORAGE_KEY);

    return Promise.resolve();
  },
};

function readStorageJson<TValue>(key: string): TValue | null {
  const storedValue = localStorage.getItem(key);

  if (!storedValue) return null;

  return JSON.parse(storedValue) as TValue;
}
