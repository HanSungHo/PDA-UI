import type {
  MainDeviceInfo,
  MainServerInfo,
  MainSettingInfo,
  MainStateProvider,
  MainUserInfo,
} from '../services/main-state.types';

interface MainStateMockOptions {
  deviceInfo?: MainDeviceInfo;
  historyUserInfo?: MainUserInfo | null;
  serverInfo?: MainServerInfo;
  settingInfo?: MainSettingInfo | null;
  userInfo?: MainUserInfo | null;
}

export function createMainStateMock(options: MainStateMockOptions = {}): MainStateProvider {
  let historyUserInfo = options.historyUserInfo ?? options.userInfo ?? null;
  let userInfo = options.userInfo ?? null;
  let settingInfo = 'settingInfo' in options ? (options.settingInfo ?? null) : undefined;

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
    loadHistoryUserInfo() {
      return Promise.resolve(historyUserInfo);
    },
    loadSettingInfo() {
      if (settingInfo !== undefined) return Promise.resolve(settingInfo);

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
    saveSettingInfo(value) {
      settingInfo = value;
      return Promise.resolve();
    },
    saveUserInfo(value) {
      userInfo = value;
      historyUserInfo = value;
      return Promise.resolve();
    },
    logout() {
      userInfo = null;

      return Promise.resolve();
    },
  };
}
