import { createPinia, setActivePinia } from 'pinia';
import { BuildConfig } from 'src/constants/build-config';
import { DeviceInfo } from 'src/constants/device-info';
import { createMainStateMock } from 'src/features/main/mocks/main-state.mock';
import { useMainStore } from 'src/features/main/stores/main.store';
import { beforeEach, describe, expect, it } from 'vitest';

describe('useMainStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts with deterministic launcher defaults', () => {
    const store = useMainStore();

    expect(store.deviceName).toBe('AR-DEMO');
    expect(store.mainTitle).toBe('HiFOS AR-DEMO');
    expect(store.isSettingReady).toBe(false);
    expect(store.isLoggedIn).toBe(false);
    expect(store.operatorName).toBe('OPERATOR_NAME');
    expect(store.permission).toBe('PERMISSION');
    expect(store.gasInput).toBe('N');
    expect(store.facility).toBe('');
    expect(store.area).toBe('');
    expect(store.bay).toBe('');
    expect(store.operatorId).toBe('OPERATOR_ID');
    expect(store.lastErrorMessage).toBe('');
    expect(store.versionName).toBe(BuildConfig.VERSION_NAME);
  });

  it('loads setting and server info during main init', async () => {
    const store = useMainStore();
    store.setStateProvider(createMainStateMock());

    await store.initMain();

    expect(store.isSettingReady).toBe(true);
    expect(store.facility).toBe('FAB');
    expect(store.area).toBe('AREA');
    expect(store.bay).toBe('BAY');
    expect(store.mobileServerName).toBe('DEV');
    expect(store.deviceName).toBe('AR-DEMO');
    expect(store.mainTitle).toBe('HiFOS AR-DEMO');
  });

  it('updates the device name', () => {
    const store = useMainStore();

    store.setDeviceName('PDA-02');

    expect(store.deviceName).toBe('PDA-02');
    expect(store.mainTitle).toBe('HiFOS PDA-02');
  });

  it('uses BuildConfig as the default version and allows runtime updates', () => {
    const store = useMainStore();

    store.setVersionName('1.227');
    expect(store.versionName).toBe('1.227');

    store.setVersionName('');
    expect(store.versionName).toBe(BuildConfig.VERSION_NAME);
  });

  it('restores existing user state during main init without login API calls or GASINPUT', async () => {
    const store = useMainStore();
    store.setStateProvider(
      createMainStateMock({
        userInfo: {
          operId: 'ATOP',
          operName: 'Kim',
          permission: 'H',
        },
      }),
    );
    await store.initMain();

    expect(store.isLoggedIn).toBe(true);
    expect(store.operatorId).toBe('ATOP');
    expect(store.operatorName).toBe('Kim');
    expect(store.permission).toBe('H');
    expect(store.gasInput).toBe('N');
  });

  it('keeps runtime GASINPUT when main init restores persisted user state', async () => {
    const store = useMainStore();
    store.setStateProvider(
      createMainStateMock({
        userInfo: {
          operId: 'ATOP',
          operName: 'Kim',
          permission: 'H',
        },
      }),
    );
    store.applyLoginState({
      operatorId: 'ATOP',
      operatorName: 'Kim',
      permission: 'H',
      gasInput: 'Y',
    });

    await store.initMain();

    expect(store.isLoggedIn).toBe(true);
    expect(store.operatorId).toBe('ATOP');
    expect(store.operatorName).toBe('Kim');
    expect(store.permission).toBe('H');
    expect(store.gasInput).toBe('Y');
  });

  it('persists setting and logged-in location through the state provider', async () => {
    const store = useMainStore();
    const provider = createMainStateMock({
      settingInfo: null,
      userInfo: { operId: 'ATOP', operName: 'Kim', permission: 'H' },
    });
    store.setStateProvider(provider);
    await store.initMain();

    await store.saveSettingInfo(
      { facility: 'GUMI', area: 'PHOTO', bay: 'P01', historyCount: '2000', forwardCount: '2000' },
      { historyCount: '3000', forwardCount: '3001' },
    );

    await expect(provider.loadSettingInfo()).resolves.toMatchObject({
      facility: 'GUMI',
      area: 'PHOTO',
      bay: 'P01',
    });
    await expect(provider.loadUserInfo()).resolves.toMatchObject({
      facility: 'GUMI',
      area: 'PHOTO',
      bay: 'P01',
    });
    expect(DeviceInfo.HISTORY_COUNT).toBe('3000');
    expect(DeviceInfo.FORWARD_COUNT).toBe('3001');
  });

  it('logs out without clearing the setting readiness state', () => {
    const store = useMainStore();
    store.markSettingReady();
    store.applyLoginState({
      operatorId: 'ATOP',
      operatorName: 'Kim',
      permission: 'H',
      gasInput: 'Y',
    });

    store.logout();

    expect(store.isLoggedIn).toBe(false);
    expect(store.operatorId).toBe('OPERATOR_ID');
    expect(store.operatorName).toBe('OPERATOR_NAME');
    expect(store.permission).toBe('PERMISSION');
    expect(store.gasInput).toBe('N');
    expect(store.isSettingReady).toBe(true);
  });
});
