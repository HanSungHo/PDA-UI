import apiClient, { getApiBaseUrl, setApiBaseUrl } from 'src/services/api-client';
import { afterEach, describe, expect, it } from 'vitest';

describe('api client runtime config', () => {
  afterEach(() => {
    setApiBaseUrl(undefined);
  });

  it('updates the mobile API base URL at runtime', () => {
    setApiBaseUrl('http://127.0.0.1:8080');

    expect(apiClient.defaults.baseURL).toBe('http://127.0.0.1:8080');
    expect(getApiBaseUrl()).toBe('http://127.0.0.1:8080');
  });

  it('clears the API base URL when mock mode ends', () => {
    setApiBaseUrl('http://127.0.0.1:8080');

    setApiBaseUrl(undefined);

    expect(apiClient.defaults.baseURL).toBeUndefined();
    expect(getApiBaseUrl()).toBeUndefined();
  });
});
