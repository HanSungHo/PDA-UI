import { defineStore } from 'pinia';
import { BuildConfig } from 'src/constants/build-config';
import { DeviceInfo } from 'src/constants/device-info';
import { setApiBaseUrl } from 'src/services/api-client';
import type { RuntimeServerInfo } from 'src/services/server-config.service';
import { computed, ref } from 'vue';

import { mainStateProvider } from '../services/main-state.service';
import type { MainStateProvider } from '../services/main-state.types';
import type { MainSettingInfo, MainUserInfo } from '../services/main-state.types';

function syncDeviceInfo(partial: Partial<typeof DeviceInfo>) {
  Object.assign(DeviceInfo, partial);
}

interface MainLoginPayload {
  operatorId: string;
  operatorName: string;
  permission: string;
  gasInput: string;
}

const DEFAULT_DEVICE_NAME = 'AR-DEMO';
const DEFAULT_MOBILE_SERVER_NAME = '';
const DEFAULT_OPERATOR_NAME = 'OPERATOR_NAME';
const DEFAULT_OPERATOR_ID = 'OPERATOR_ID';
const DEFAULT_PERMISSION = 'PERMISSION';
const DEFAULT_GAS_INPUT = 'N';

export const SETTING_RESULT = {
  CANCELED: 'CANCELED',
  OK: 'OK',
} as const;

export type SettingResult = (typeof SETTING_RESULT)[keyof typeof SETTING_RESULT];

export const useMainStore = defineStore('main', () => {
  let stateProvider: MainStateProvider = mainStateProvider;

  const deviceName = ref(DEFAULT_DEVICE_NAME);
  const mobileServerName = ref(DEFAULT_MOBILE_SERVER_NAME);
  const mobileServerUrl = ref('');
  const updateServerUrl = ref('');
  const versionName = ref<string>(BuildConfig.VERSION_NAME);
  const facility = ref('');
  const area = ref('');
  const bay = ref('');
  const historyCount = ref('');
  const forwardCount = ref('');
  const isSettingReady = ref(false);
  const isLoggedIn = ref(false);
  const operatorId = ref(DEFAULT_OPERATOR_ID);
  const operatorName = ref(DEFAULT_OPERATOR_NAME);
  const permission = ref(DEFAULT_PERMISSION);
  const gasInput = ref(DEFAULT_GAS_INPUT);
  const loading = ref(false);
  const lastErrorMessage = ref('');
  const settingResult = ref<SettingResult | null>(null);
  const mainTitle = computed(() => `HiFOS ${deviceName.value}`);

  function setDeviceName(value: string) {
    deviceName.value = value.trim() || DEFAULT_DEVICE_NAME;
    syncDeviceInfo({ DEVICE_NAME: deviceName.value });
  }

  function setVersionName(value: string) {
    versionName.value = value.trim() || BuildConfig.VERSION_NAME;
  }

  function setStateProvider(provider: MainStateProvider) {
    stateProvider = provider;
  }

  function markSettingReady() {
    isSettingReady.value = true;
  }

  function applySettingInfo(
    settingInfo: MainSettingInfo,
    runtimeCounts: Pick<MainSettingInfo, 'historyCount' | 'forwardCount'> = settingInfo,
  ) {
    facility.value = settingInfo.facility;
    area.value = settingInfo.area;
    bay.value = settingInfo.bay;
    historyCount.value = settingInfo.historyCount;
    forwardCount.value = settingInfo.forwardCount;
    isSettingReady.value = true;
    syncDeviceInfo({
      FACILITY: facility.value,
      AREA: area.value,
      BAY: bay.value,
      HISTORY_COUNT: runtimeCounts.historyCount,
      FORWARD_COUNT: runtimeCounts.forwardCount,
    });
  }

  async function loadSettingInfo() {
    return stateProvider.loadSettingInfo();
  }

  async function saveSettingInfo(
    settingInfo: MainSettingInfo,
    runtimeCounts: Pick<MainSettingInfo, 'historyCount' | 'forwardCount'> = settingInfo,
  ) {
    await stateProvider.saveSettingInfo(settingInfo);
    if (isLoggedIn.value) {
      const userInfo: MainUserInfo = {
        operId: operatorId.value,
        operName: operatorName.value,
        permission: permission.value,
        facility: settingInfo.facility,
        area: settingInfo.area,
        bay: settingInfo.bay,
      };
      await stateProvider.saveUserInfo(userInfo);
    }
    applySettingInfo(settingInfo, runtimeCounts);
  }

  async function saveUserInfo(userInfo: MainUserInfo) {
    await stateProvider.saveUserInfo(userInfo);
  }

  function setSettingResult(result: SettingResult | null) {
    settingResult.value = result;
  }

  function applyServerInfo(info: RuntimeServerInfo) {
    mobileServerName.value = info.mobileServerName;
    mobileServerUrl.value = info.mobileServerUrl;
    updateServerUrl.value = info.updateServerUrl;
    syncDeviceInfo({ MOBILE_SERVER_NAME: info.mobileServerName });
    setApiBaseUrl(info.mobileServerUrl);
  }

  async function initMain() {
    loading.value = true;
    lastErrorMessage.value = '';

    try {
      const [deviceInfo, serverInfo, settingInfo] = await Promise.all([
        stateProvider.loadDeviceInfo(),
        stateProvider.loadServerInfo(),
        stateProvider.loadSettingInfo(),
      ]);

      setDeviceName(deviceInfo.deviceName);
      mobileServerName.value = serverInfo.mobileServerName;
      mobileServerUrl.value = serverInfo.mobileServerUrl;
      updateServerUrl.value = serverInfo.updateServerUrl;
      syncDeviceInfo({ MOBILE_SERVER_NAME: mobileServerName.value });

      if (settingInfo) {
        facility.value = settingInfo.facility;
        area.value = settingInfo.area;
        bay.value = settingInfo.bay;
        historyCount.value = settingInfo.historyCount;
        forwardCount.value = settingInfo.forwardCount;
        isSettingReady.value = true;
        syncDeviceInfo({
          FACILITY: facility.value,
          AREA: area.value,
          BAY: bay.value,
          HISTORY_COUNT: historyCount.value,
          FORWARD_COUNT: forwardCount.value,
        });
      } else {
        isSettingReady.value = false;
      }

      const userInfo = await stateProvider.loadUserInfo();
      if (userInfo) {
        restoreUserInfo(userInfo);
      }
    } finally {
      loading.value = false;
    }
  }

  function restoreUserInfo(userInfo: { operId: string; operName: string; permission: string }) {
    isLoggedIn.value = true;
    operatorId.value = userInfo.operId;
    operatorName.value = userInfo.operName;
    permission.value = userInfo.permission;
    syncDeviceInfo({
      OPERATOR_ID: operatorId.value,
      OPERATOR_NAME: operatorName.value,
      PERMISSION: permission.value,
    });
  }

  function applyLoginState(payload: MainLoginPayload) {
    isLoggedIn.value = true;
    operatorId.value = payload.operatorId;
    operatorName.value = payload.operatorName;
    permission.value = payload.permission;
    gasInput.value = payload.gasInput;
    syncDeviceInfo({
      OPERATOR_ID: operatorId.value,
      OPERATOR_NAME: operatorName.value,
      PERMISSION: permission.value,
      GASINPUT: gasInput.value,
    });
  }

  async function logout() {
    isLoggedIn.value = false;
    operatorId.value = DEFAULT_OPERATOR_ID;
    operatorName.value = DEFAULT_OPERATOR_NAME;
    permission.value = DEFAULT_PERMISSION;
    gasInput.value = DEFAULT_GAS_INPUT;
    lastErrorMessage.value = '';
    syncDeviceInfo({
      OPERATOR_ID: operatorId.value,
      OPERATOR_NAME: operatorName.value,
      PERMISSION: permission.value,
      GASINPUT: gasInput.value,
    });
    await stateProvider.logout();
  }

  return {
    applyLoginState,
    applySettingInfo,
    applyServerInfo,
    area,
    bay,
    deviceName,
    facility,
    forwardCount,
    gasInput,
    historyCount,
    initMain,
    isLoggedIn,
    isSettingReady,
    lastErrorMessage,
    logout,
    loadSettingInfo,
    mainTitle,
    markSettingReady,
    mobileServerName,
    mobileServerUrl,
    operatorId,
    operatorName,
    permission,
    setDeviceName,
    setVersionName,
    saveSettingInfo,
    saveUserInfo,
    settingResult,
    setSettingResult,
    setStateProvider,
    updateServerUrl,
    versionName,
  };
});
