import { mainStateProvider } from 'src/features/main/services/main-state.service';
import apiClient from 'src/services/api-client';
import { beforeEach, describe, expect, it } from 'vitest';

describe('main state provider', () => {
  beforeEach(() => {
    localStorage.clear();
    apiClient.defaults.baseURL = undefined;
  });

  it('reconfigures the API client with the selected mobile server URL', async () => {
    const serverInfo = await mainStateProvider.loadServerInfo();

    expect(apiClient.defaults.baseURL).toBe(serverInfo.mobileServerUrl);
  });

  it('keeps the most recent user for login history after logout', async () => {
    const userInfo = { operId: 'ATOP', operName: 'Kim', permission: 'H' };

    await mainStateProvider.saveUserInfo(userInfo);
    await mainStateProvider.logout();

    await expect(mainStateProvider.loadUserInfo()).resolves.toBeNull();
    await expect(mainStateProvider.loadHistoryUserInfo()).resolves.toEqual(userInfo);
  });
});
