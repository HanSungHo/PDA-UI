import { createSystemSettingMockApi } from 'src/features/system-setting/mocks/system-setting.mock';
import { SYSTEM_SETTING_MOCK_CASES } from 'src/features/system-setting/types/system-setting.types';
import { describe, expect, it } from 'vitest';

describe('System Setting full-case fixtures', () => {
  it.each(SYSTEM_SETTING_MOCK_CASES)(
    'provides deterministic isolated case %s',
    async (mockCase) => {
      const api = createSystemSettingMockApi(mockCase);
      if (mockCase === 'load-error') {
        expect(() => api.getServerInfo()).toThrow('Server info unavailable');
        return;
      }
      const form = api.getServerInfo();
      if (mockCase === 'network-error' || mockCase === 'storage-error') {
        await expect(api.saveServerInfo(form)).rejects.toThrow();
      } else {
        expect(await api.saveServerInfo(form)).toBe(mockCase !== 'check-rejected');
      }
      expect(localStorage.getItem('server.info')).toBeNull();
    },
  );

  it('returns defensive request snapshots and never shares modified state between instances', async () => {
    const first = createSystemSettingMockApi();
    await first.saveServerInfo({ ...first.getServerInfo(), editProdServer: '1.2.3.4' });
    const snapshot = first.getRequests();
    snapshot.length = 0;
    expect(first.getRequests()).toHaveLength(3);
    expect(createSystemSettingMockApi().getServerInfo().editProdServer).toBe('172.16.0.10');
  });
});
