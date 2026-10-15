import { DEV_SERVER, PROD_SERVER } from 'src/constants/server';
import { createSystemSettingApi } from 'src/features/system-setting/services/system-setting.service';
import type { SystemSettingDependencies } from 'src/features/system-setting/types/system-setting.types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('SystemSettingDialogActivity service parity', () => {
  let dependencies: SystemSettingDependencies;

  beforeEach(() => {
    dependencies = {
      readServerConfigs: vi.fn(() => []),
      saveServerConfigs: vi.fn(),
      checkAPI: vi.fn(async () => ({ statusCode: 200 })),
      applyServerInfo: vi.fn(),
      downloadApk: vi.fn(async () => undefined),
    };
  });

  it('loads legacy defaults for a fresh device', () => {
    expect(createSystemSettingApi(dependencies).getServerInfo()).toEqual({
      editProdServer: '127.0.0.1',
      editDevServer: '10.0.0.1',
      selectedServer: PROD_SERVER,
    });
  });

  it.each([PROD_SERVER, DEV_SERVER] as const)(
    'checks selected %s before persisting both records',
    async (selectedServer) => {
      const form = { editProdServer: '172.16.0.10', editDevServer: '172.16.0.20', selectedServer };
      expect(await createSystemSettingApi(dependencies).saveServerInfo(form)).toBe(true);
      const host = selectedServer === PROD_SERVER ? form.editProdServer : form.editDevServer;
      expect(dependencies.checkAPI).toHaveBeenCalledWith(`http://${host}:8080`);
      expect(dependencies.saveServerConfigs).toHaveBeenCalledWith([
        {
          serverType: PROD_SERVER,
          serverName: 'L4-DEVICE',
          serverUrl: form.editProdServer,
          selectedServer: selectedServer === PROD_SERVER,
        },
        {
          serverType: DEV_SERVER,
          serverName: 'DEV-SERVER',
          serverUrl: form.editDevServer,
          selectedServer: selectedServer === DEV_SERVER,
        },
      ]);
      expect(dependencies.applyServerInfo).toHaveBeenCalledWith({
        mobileServerUrl: `http://${host}:8080`,
        updateServerUrl: 'http://172.16.0.10:8081',
        mobileServerName: selectedServer === PROD_SERVER ? 'L4-DEVICE' : 'DEV-SERVER',
      });
    },
  );

  it.each([0, 201, 400, 500])(
    'does not persist or change the runtime on status %s',
    async (statusCode) => {
      vi.mocked(dependencies.checkAPI).mockResolvedValue({ statusCode });
      const api = createSystemSettingApi(dependencies);
      expect(await api.saveServerInfo(api.getServerInfo())).toBe(false);
      expect(dependencies.saveServerConfigs).not.toHaveBeenCalled();
      expect(dependencies.applyServerInfo).not.toHaveBeenCalled();
    },
  );

  it('preserves runtime and storage on a network exception', async () => {
    vi.mocked(dependencies.checkAPI).mockRejectedValue(new Error('offline'));
    const api = createSystemSettingApi(dependencies);
    await expect(api.saveServerInfo(api.getServerInfo())).rejects.toThrow('offline');
    expect(dependencies.saveServerConfigs).not.toHaveBeenCalled();
    expect(dependencies.applyServerInfo).not.toHaveBeenCalled();
  });

  it('does not apply runtime if persistence fails', async () => {
    vi.mocked(dependencies.saveServerConfigs).mockImplementation(() => {
      throw new Error('storage');
    });
    const api = createSystemSettingApi(dependencies);
    await expect(api.saveServerInfo(api.getServerInfo())).rejects.toThrow('storage');
    expect(dependencies.applyServerInfo).not.toHaveBeenCalled();
  });

  it('downloads exact APK names from the persisted PROD, not unsaved input', async () => {
    vi.mocked(dependencies.readServerConfigs).mockReturnValue([
      {
        serverType: PROD_SERVER,
        serverName: 'L4-DEVICE',
        serverUrl: '172.16.0.10',
        selectedServer: false,
      },
      {
        serverType: DEV_SERVER,
        serverName: 'DEV-SERVER',
        serverUrl: '172.16.0.20',
        selectedServer: true,
      },
    ]);
    const api = createSystemSettingApi(dependencies);
    expect(api.getServerInfo().selectedServer).toBe(DEV_SERVER);
    await api.downLoadBatterMonitor();
    await api.downLoadPmdm();
    expect(dependencies.downloadApk).toHaveBeenNthCalledWith(
      1,
      'http://172.16.0.10:8081/upload/EmBatteryMonitor.apk',
      'EmBatteryMonitor.apk',
    );
    expect(dependencies.downloadApk).toHaveBeenNthCalledWith(
      2,
      'http://172.16.0.10:8081/upload/PMDMAgent.apk',
      'PMDMAgent.apk',
    );
  });
});
