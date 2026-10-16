import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

import type { DownloadProgress } from '../types/patch.types';

type ReceiverCallback = (action: string, data: DownloadProgress | null) => void;

// Base url of the update server (use 10.0.2.2 instead of localhost on an Android emulator)
const API_BASE_URL = import.meta.env.VITE_UPDATE_SERVER_URL ?? 'http://localhost:3000';
// Same defaults as DownloadService.kt
const DEFAULT_FILE_URL = 'upload/hifos.apk';
const DEFAULT_FILE_NAME = 'hifos.apk';
// Same folder as getExternalFilesDir(DIRECTORY_DOWNLOADS)/DOWNLOADS
const SAVE_DIRECTORY = 'Download/DOWNLOADS';
const APK_MIME_TYPE = 'application/vnd.android.package-archive';
const BYTES_PER_MB = 1024 ** 2;

class PatchService {
  private receivers: Map<string, ReceiverCallback[]> = new Map();
  // Equivalent of the static downloadFlag in DownloadService.kt
  private downloadFlag = false;
  private savedFilePath: string | null = null;
  private downloadPromise: Promise<void> | null = null;

  public registerReceiver(action: string, callback: ReceiverCallback): void {
    const list = this.receivers.get(action) || [];
    // Ignore duplicates so one callback is never invoked twice per broadcast
    if (!list.includes(callback)) {
      list.push(callback);
    }
    this.receivers.set(action, list);
  }

  public unregisterReceiver(action: string, callback: ReceiverCallback): void {
    const list = this.receivers.get(action);
    if (list) {
      this.receivers.set(
        action,
        list.filter((cb) => cb !== callback),
      );
    }
  }

  private sendBroadcast(action: string, data: DownloadProgress | null): void {
    const list = this.receivers.get(action);
    if (list) {
      // Iterate over a copy so a receiver can unregister itself while being called
      [...list].forEach((callback) => callback(action, data));
    }
  }

  public isDownloaded(): boolean {
    return this.downloadFlag;
  }

  // Mirrors DownloadService.onHandleIntent: install when already downloaded, otherwise download then install
  // Resolves to true when the installer was launched
  public async startDownloadService(
    fileUrl: string = DEFAULT_FILE_URL,
    fileName: string = DEFAULT_FILE_NAME,
  ): Promise<boolean> {
    if (this.downloadFlag) {
      return this.installApplication();
    }

    // Equivalent of synchronized(this): never run two downloads at once
    if (!this.downloadPromise) {
      this.downloadPromise = this.initDownload(fileUrl, fileName).finally(() => {
        this.downloadPromise = null;
      });
    }
    await this.downloadPromise;
    return this.installApplication();
  }

  private async initDownload(fileUrl: string, fileName: string): Promise<void> {
    const url = `${API_BASE_URL.replace(/\/$/, '')}/${fileUrl.replace(/^\//, '')}`;
    let lastPercent = -1;

    const handle = await Filesystem.addListener('progress', (status) => {
      if (status.url !== url || status.contentLength <= 0) return;
      const percent = Math.floor((status.bytes * 100) / status.contentLength);
      if (percent === lastPercent) return;
      lastPercent = percent;
      this.sendBroadcast('message_progress', {
        progress: percent,
        totalFileSize: status.contentLength / BYTES_PER_MB,
        currentFileSize: status.bytes / BYTES_PER_MB,
      });
    });

    try {
      const result = await Filesystem.downloadFile({
        url,
        path: `${SAVE_DIRECTORY}/${fileName}`,
        directory: Directory.External,
        recursive: true,
        progress: true,
      });
      if (!result.path) {
        throw new Error('Downloaded file path is missing');
      }
      this.savedFilePath = result.path;

      // onDownloadComplete
      this.sendBroadcast('message_progress', { progress: 100 });
      this.downloadFlag = true;
    } finally {
      await handle.remove();
    }
  }

  // Returns false when there is no Android installer to open (for example in a browser)
  private async installApplication(): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || !this.savedFilePath) return false;

    await FileOpener.open({
      filePath: this.savedFilePath,
      contentType: APK_MIME_TYPE,
      openWithDefault: true,
    });
    return true;
  }
}

export const patchService = new PatchService();
