import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface ProgressStatus {
  url: string;
  bytes: number;
  contentLength: number;
}
type ProgressListener = (status: ProgressStatus) => void;

const filesystemMock = vi.hoisted(() => ({
  addListener: vi.fn(),
  downloadFile: vi.fn(),
}));
const fileOpenerMock = vi.hoisted(() => ({ open: vi.fn() }));
const capacitorMock = vi.hoisted(() => ({ isNativePlatform: vi.fn() }));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    addListener: filesystemMock.addListener,
    downloadFile: filesystemMock.downloadFile,
  },
  Directory: { External: 'EXTERNAL' },
}));
vi.mock('@capacitor-community/file-opener', () => ({
  FileOpener: { open: fileOpenerMock.open },
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: capacitorMock.isNativePlatform },
}));

const BASE_URL = 'http://mock-host:3000';
const APK_URL = `${BASE_URL}/upload/hifos.apk`;
const SAVED_PATH = '/storage/emulated/0/Android/data/app/files/Download/DOWNLOADS/hifos.apk';
const MB = 1024 * 1024;

describe('patchService', () => {
  let progressListener: ProgressListener | undefined;
  const removeHandle = vi.fn();

  // The service is a singleton with state (downloadFlag), so load a fresh copy for every test
  async function loadService() {
    vi.resetModules();
    vi.stubEnv('VITE_UPDATE_SERVER_URL', BASE_URL);
    const module = await import('~/features/patch/services/patch.service');
    return module.patchService;
  }

  beforeEach(() => {
    vi.resetAllMocks();
    progressListener = undefined;
    removeHandle.mockResolvedValue(undefined);
    capacitorMock.isNativePlatform.mockReturnValue(true);
    fileOpenerMock.open.mockResolvedValue(undefined);
    filesystemMock.addListener.mockImplementation(
      async (_event: string, listener: ProgressListener) => {
        progressListener = listener;
        return { remove: removeHandle };
      },
    );
    filesystemMock.downloadFile.mockResolvedValue({ path: SAVED_PATH });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('downloads the default file and forwards absolute progress to registered receivers', async () => {
    filesystemMock.downloadFile.mockImplementation(async () => {
      progressListener?.({ url: APK_URL, bytes: 1 * MB, contentLength: 4 * MB });
      progressListener?.({ url: APK_URL, bytes: 2 * MB, contentLength: 4 * MB });
      return { path: SAVED_PATH };
    });
    const service = await loadService();
    const callback = vi.fn();
    service.registerReceiver('message_progress', callback);

    await service.startDownloadService();

    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenNthCalledWith(1, 'message_progress', {
      progress: 25,
      totalFileSize: 4,
      currentFileSize: 1,
    });
    expect(callback).toHaveBeenNthCalledWith(2, 'message_progress', {
      progress: 50,
      totalFileSize: 4,
      currentFileSize: 2,
    });
    // onDownloadComplete
    expect(callback).toHaveBeenNthCalledWith(3, 'message_progress', { progress: 100 });
  });

  it('calls Filesystem.downloadFile with the same url and folder as the legacy service', async () => {
    const service = await loadService();

    await service.startDownloadService();

    expect(filesystemMock.downloadFile).toHaveBeenCalledWith({
      url: APK_URL,
      path: 'Download/DOWNLOADS/hifos.apk',
      directory: 'EXTERNAL',
      recursive: true,
      progress: true,
    });
  });

  it('builds the url correctly from a custom file url and file name', async () => {
    const service = await loadService();

    await service.startDownloadService('/upload/other.apk', 'other.apk');

    expect(filesystemMock.downloadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${BASE_URL}/upload/other.apk`,
        path: 'Download/DOWNLOADS/other.apk',
      }),
    );
  });

  it('ignores progress events of other urls or without content length', async () => {
    filesystemMock.downloadFile.mockImplementation(async () => {
      progressListener?.({
        url: 'http://other-host/file.apk',
        bytes: 1 * MB,
        contentLength: 4 * MB,
      });
      progressListener?.({ url: APK_URL, bytes: 1 * MB, contentLength: 0 });
      progressListener?.({ url: APK_URL, bytes: 1 * MB, contentLength: -1 });
      return { path: SAVED_PATH };
    });
    const service = await loadService();
    const callback = vi.fn();
    service.registerReceiver('message_progress', callback);

    await service.startDownloadService();

    // Only the completion broadcast is sent
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('message_progress', { progress: 100 });
  });

  it('does not repeat a broadcast when the percent did not change', async () => {
    filesystemMock.downloadFile.mockImplementation(async () => {
      progressListener?.({ url: APK_URL, bytes: 10, contentLength: 1000 });
      progressListener?.({ url: APK_URL, bytes: 11, contentLength: 1000 });
      progressListener?.({ url: APK_URL, bytes: 12, contentLength: 1000 });
      return { path: SAVED_PATH };
    });
    const service = await loadService();
    const callback = vi.fn();
    service.registerReceiver('message_progress', callback);

    await service.startDownloadService();

    // 1% once, then 100%
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('removes the progress listener after a successful download', async () => {
    const service = await loadService();

    await service.startDownloadService();

    expect(removeHandle).toHaveBeenCalledTimes(1);
  });

  it('opens the installer with the apk mime type after the download and returns true', async () => {
    const service = await loadService();

    const launched = await service.startDownloadService();

    expect(launched).toBe(true);
    expect(service.isDownloaded()).toBe(true);
    expect(fileOpenerMock.open).toHaveBeenCalledWith({
      filePath: SAVED_PATH,
      contentType: 'application/vnd.android.package-archive',
      openWithDefault: true,
    });
  });

  it('returns false without opening an installer when not running on a native platform', async () => {
    capacitorMock.isNativePlatform.mockReturnValue(false);
    const service = await loadService();

    const launched = await service.startDownloadService();

    expect(launched).toBe(false);
    expect(service.isDownloaded()).toBe(true);
    expect(fileOpenerMock.open).not.toHaveBeenCalled();
  });

  it('only reinstalls (no new download) when the file was already downloaded', async () => {
    const service = await loadService();

    await service.startDownloadService();
    await service.startDownloadService();

    expect(filesystemMock.downloadFile).toHaveBeenCalledTimes(1);
    expect(fileOpenerMock.open).toHaveBeenCalledTimes(2);
  });

  it('shares one download between two simultaneous starts', async () => {
    const service = await loadService();

    await Promise.all([service.startDownloadService(), service.startDownloadService()]);

    expect(filesystemMock.downloadFile).toHaveBeenCalledTimes(1);
  });

  it('rejects, keeps the downloaded flag false and removes the listener when the download fails', async () => {
    filesystemMock.downloadFile.mockRejectedValueOnce(new Error('Network error'));
    const service = await loadService();

    await expect(service.startDownloadService()).rejects.toThrow('Network error');

    expect(service.isDownloaded()).toBe(false);
    expect(removeHandle).toHaveBeenCalledTimes(1);
    expect(fileOpenerMock.open).not.toHaveBeenCalled();
  });

  it('downloads again after a failed attempt', async () => {
    filesystemMock.downloadFile.mockRejectedValueOnce(new Error('Network error'));
    const service = await loadService();

    await expect(service.startDownloadService()).rejects.toThrow('Network error');
    await service.startDownloadService();

    expect(filesystemMock.downloadFile).toHaveBeenCalledTimes(2);
    expect(service.isDownloaded()).toBe(true);
  });

  it('rejects when the downloaded file path is missing', async () => {
    filesystemMock.downloadFile.mockResolvedValueOnce({});
    const service = await loadService();

    await expect(service.startDownloadService()).rejects.toThrow('Downloaded file path is missing');

    expect(service.isDownloaded()).toBe(false);
  });

  it('stops delivering broadcasts after unregisterReceiver', async () => {
    const service = await loadService();
    const callback = vi.fn();
    service.registerReceiver('message_progress', callback);
    service.unregisterReceiver('message_progress', callback);

    await service.startDownloadService();

    expect(callback).not.toHaveBeenCalled();
  });

  it('does not register the same callback twice', async () => {
    const service = await loadService();
    const callback = vi.fn();
    service.registerReceiver('message_progress', callback);
    service.registerReceiver('message_progress', callback);

    await service.startDownloadService();

    // Completion broadcast only, delivered once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not throw when unregistering a callback that was never registered', async () => {
    const service = await loadService();

    expect(() => {
      service.unregisterReceiver('non_existing_action', vi.fn());
    }).not.toThrow();
  });
});
