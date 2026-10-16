export interface DownloadProgress {
  // Absolute percent (0..100), same as DownloadService.kt
  progress: number;
  // Sizes in MB, sent by the legacy service but unused by the screen
  totalFileSize?: number;
  currentFileSize?: number;
}

export interface PatchViewBinding {
  txtPatchText: string;
  progressBar: number;
  btnDownload: {
    isEnabled: boolean;
    text: 'Download' | 'INSTALL';
  };
}

export interface PatchInboundParams {
  version?: string;
  appCode?: string;
}
