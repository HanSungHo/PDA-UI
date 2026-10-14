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
});
