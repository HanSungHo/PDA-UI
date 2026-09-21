import type {
  MainDeviceInfo,
  MainServerInfo,
  MainSettingInfo,
  MainStateProvider,
  MainUserInfo,
} from '../services/main-state.types';

interface MainStateMockOptions {
  deviceInfo?: MainDeviceInfo;
  serverInfo?: MainServerInfo;
  settingInfo?: MainSettingInfo | null;
  userInfo?: MainUserInfo | null;
}

export function createMainStateMock(options: MainStateMockOptions = {}): MainStateProvider {
  let userInfo = options.userInfo ?? null;

  return {
    loadDeviceInfo() {
      return Promise.resolve(options.deviceInfo ?? { deviceName: 'AR-DEMO' });
    },
    loadServerInfo() {
      return Promise.resolve(
        options.serverInfo ?? {
          mobileServerName: 'DEV',
          mobileServerUrl: 'http://127.0.0.1:8080',
          updateServerUrl: 'http://127.0.0.1:8081',
        },
      );
    },
    loadSettingInfo() {
      if ('settingInfo' in options) return Promise.resolve(options.settingInfo ?? null);

      return Promise.resolve({
        area: 'AREA',
        bay: 'BAY',
        facility: 'FAB',
        forwardCount: '10',
        historyCount: '10',
      });
    },
    loadUserInfo() {
      return Promise.resolve(userInfo);
    },
    logout() {
      userInfo = null;

      return Promise.resolve();
    },
  };
}
