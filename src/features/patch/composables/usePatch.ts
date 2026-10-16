import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { onMounted, onUnmounted, reactive, ref } from 'vue';

import { MOCK_PATCH_MESSAGE } from '../mocks/patch.mock';
import { patchService } from '../services/patch.service';
import type { DownloadProgress, PatchViewBinding } from '../types/patch.types';

export function usePatch() {
  const viewBinding = reactive<PatchViewBinding>({
    txtPatchText: '',
    progressBar: 0,
    btnDownload: {
      isEnabled: true,
      text: 'Download',
    },
  });

  const isDownloading = ref(false);

  // BroadcastReceiver 1:1 from Kotlin
  const broadcastReceiver = {
    onReceive: (intentAction: string, downloadProgress: DownloadProgress | null) => {
      if (intentAction === 'message_progress' && downloadProgress != null) {
        // The service sends an absolute percent, so assign it instead of incrementing
        viewBinding.progressBar = Math.min(Math.floor(downloadProgress.progress), 100);
      }
    },
  };

  function registerReceiver() {
    patchService.registerReceiver('message_progress', broadcastReceiver.onReceive);
  }

  function onResume() {
    // Hidden Rule #3: Once the resume and download processes are complete
    if (!viewBinding.btnDownload.isEnabled) {
      viewBinding.progressBar = 100;
      viewBinding.btnDownload.text = 'INSTALL';
      viewBinding.btnDownload.isEnabled = true;
      isDownloading.value = false;
    }
  }

  // Resume entry point: ignore returns from background while the download is still running
  function handleResume() {
    if (!patchService.isDownloaded()) return;
    onResume();
  }

  async function executeDownLoad() {
    viewBinding.btnDownload.isEnabled = false;
    isDownloading.value = true;

    try {
      const launched = await patchService.startDownloadService();
      // No Android installer (browser): no appStateChange will follow, so resume manually
      if (!launched) onResume();
    } catch {
      // The installer could not be opened after a finished download: unlock as if resumed
      if (patchService.isDownloaded()) {
        onResume();
        return;
      }
      // Legacy only printed the stack trace and left the button locked; unlock so the user can retry
      viewBinding.progressBar = 0;
      viewBinding.btnDownload.isEnabled = true;
      isDownloading.value = false;
    }
  }

  // Click listener with protection against repeated clicks
  let isClickProcessing = false;
  const singleClickListener = {
    onSingleClick: () => {
      if (isClickProcessing) return;
      isClickProcessing = true;

      try {
        void executeDownLoad();
      } finally {
        setTimeout(() => {
          isClickProcessing = false;
        }, 1000);
      }
    },
  };

  let appStateHandle: PluginListenerHandle | null = null;
  let isUnmounted = false;

  async function registerAppStateListener() {
    const handle = await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        handleResume();
      }
    });
    // The component may be gone before addListener resolves
    if (isUnmounted) {
      await handle.remove();
      return;
    }
    appStateHandle = handle;
  }

  function onCreate() {
    registerReceiver();
    viewBinding.txtPatchText = MOCK_PATCH_MESSAGE;
  }

  function onBackPressed(): boolean {
    // Hidden Rule #1: Prevent screen exit
    return false;
  }

  onMounted(() => {
    onCreate();
    void registerAppStateListener();
  });

  onUnmounted(() => {
    isUnmounted = true;
    patchService.unregisterReceiver('message_progress', broadcastReceiver.onReceive);
    void appStateHandle?.remove();
  });

  return {
    viewBinding,
    isDownloading,
    singleClickListener,
    executeDownLoad,
    registerReceiver,
    broadcastReceiver,
    onCreate,
    onResume,
    handleResume,
    onBackPressed,
  };
}
