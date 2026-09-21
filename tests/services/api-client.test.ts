import { describe, expect, it } from 'vitest';

import apiClient, { setApiBaseUrl } from 'src/services/api-client';

describe('api client runtime config', () => {
  it('updates the mobile API base URL at runtime', () => {
    setApiBaseUrl('http://127.0.0.1:8080');

    expect(apiClient.defaults.baseURL).toBe('http://127.0.0.1:8080');
  });
});
