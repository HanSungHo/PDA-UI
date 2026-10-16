import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import { usePatch } from '~/features/patch/composables/usePatch';
import { MOCK_PATCH_MESSAGE } from '~/features/patch/mocks/patch.mock';

type AppStateListener = (state: { isActive: boolean }) => void;

const serviceMock = vi.hoisted(() => ({
  registerReceiver: vi.fn(),
  unregisterReceiver: vi.fn(),
  startDownloadService: vi.fn(),
  isDownloaded: vi.fn(),
}));
const appMock = vi.hoisted(() => ({ addListener: vi.fn() }));

vi.mock('~/features/patch/services/patch.service', () => ({ patchService: serviceMock }));
vi.mock('@capacitor/app', () => ({ App: { addListener: appMock.addListener } }));

// Mounts a tiny host component so lifecycle hooks (onMounted, onUnmounted) really run
function mountComposable() {
  let result!: ReturnType<typeof usePatch>;
  const wrapper = mount(
    defineComponent({
      setup() {
        result = usePatch();
        return () => h('div');
      },
    }),
  );
  return { wrapper, result };
}

describe('usePatch Composable', () => {
  let appStateListener: AppStateListener | undefined;
  const removeHandle = vi.fn();

  // Lets pending promises settle while fake timers are active
  const flush = () => vi.advanceTimersByTimeAsync(0);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    appStateListener = undefined;
    removeHandle.mockResolvedValue(undefined);
    serviceMock.isDownloaded.mockReturnValue(false);
    serviceMock.startDownloadService.mockResolvedValue(true);
    appMock.addListener.mockImplementation(async (_event: string, listener: AppStateListener) => {
      appStateListener = listener;
      return { remove: removeHandle };
    });
    // Most tests call usePatch outside a component, so Vue warns about lifecycle hooks
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initializes the state with an exact 1:1 mapping', () => {
    const { viewBinding, isDownloading } = usePatch();

    expect(viewBinding.txtPatchText).toBe('');
    expect(viewBinding.progressBar).toBe(0);
    expect(viewBinding.btnDownload.isEnabled).toBe(true);
    expect(viewBinding.btnDownload.text).toBe('Download');
    expect(isDownloading.value).toBe(false);
  });

  it('onCreate() registers the receiver and sets the Korean message', () => {
    const { viewBinding, broadcastReceiver, onCreate } = usePatch();

    onCreate();

    expect(serviceMock.registerReceiver).toHaveBeenCalledWith(
      'message_progress',
      broadcastReceiver.onReceive,
    );
    expect(viewBinding.txtPatchText).toBe(MOCK_PATCH_MESSAGE);
  });

  describe('broadcastReceiver.onReceive', () => {
    it('assigns the absolute percent instead of accumulating it', () => {
      const { viewBinding, broadcastReceiver } = usePatch();

      broadcastReceiver.onReceive('message_progress', { progress: 20 });
      expect(viewBinding.progressBar).toBe(20);

      broadcastReceiver.onReceive('message_progress', { progress: 55 });
      expect(viewBinding.progressBar).toBe(55);

      broadcastReceiver.onReceive('message_progress', { progress: 100 });
      expect(viewBinding.progressBar).toBe(100);
    });

    it('caps the value at 100 and truncates decimals like Kotlin toInt()', () => {
      const { viewBinding, broadcastReceiver } = usePatch();

      broadcastReceiver.onReceive('message_progress', { progress: 20.9 });
      expect(viewBinding.progressBar).toBe(20);

      broadcastReceiver.onReceive('message_progress', { progress: 120 });
      expect(viewBinding.progressBar).toBe(100);
    });

    it('ignores the broadcast when the action is not message_progress or the data is null', () => {
      const { viewBinding, broadcastReceiver } = usePatch();

      broadcastReceiver.onReceive('other_action', { progress: 50 });
      expect(viewBinding.progressBar).toBe(0);

      broadcastReceiver.onReceive('message_progress', null);
      expect(viewBinding.progressBar).toBe(0);
    });
  });

  describe('executeDownLoad', () => {
    it('locks the button while the download runs and keeps it locked until the app resumes', async () => {
      let resolveDownload!: (launched: boolean) => void;
      serviceMock.startDownloadService.mockImplementation(
        () =>
          new Promise<boolean>((resolve) => {
            resolveDownload = resolve;
          }),
      );
      const { viewBinding, isDownloading, executeDownLoad } = usePatch();

      const pending = executeDownLoad();

      expect(viewBinding.btnDownload.isEnabled).toBe(false);
      expect(isDownloading.value).toBe(true);
      expect(serviceMock.startDownloadService).toHaveBeenCalledTimes(1);

      resolveDownload(true);
      await pending;

      // The installer is open: wait for appStateChange before switching to INSTALL
      expect(viewBinding.btnDownload.isEnabled).toBe(false);
      expect(viewBinding.btnDownload.text).toBe('Download');
      expect(isDownloading.value).toBe(true);
    });

    it('switches to INSTALL immediately when no installer exists (browser)', async () => {
      serviceMock.startDownloadService.mockResolvedValue(false);
      const { viewBinding, isDownloading, executeDownLoad } = usePatch();

      await executeDownLoad();

      expect(viewBinding.progressBar).toBe(100);
      expect(viewBinding.btnDownload.text).toBe('INSTALL');
      expect(viewBinding.btnDownload.isEnabled).toBe(true);
      expect(isDownloading.value).toBe(false);
    });

    it('restores the initial state when the download fails', async () => {
      serviceMock.startDownloadService.mockRejectedValue(new Error('Network error'));
      serviceMock.isDownloaded.mockReturnValue(false);
      const { viewBinding, broadcastReceiver, isDownloading, executeDownLoad } = usePatch();
      broadcastReceiver.onReceive('message_progress', { progress: 40 });

      await executeDownLoad();

      expect(viewBinding.progressBar).toBe(0);
      expect(viewBinding.btnDownload.text).toBe('Download');
      expect(viewBinding.btnDownload.isEnabled).toBe(true);
      expect(isDownloading.value).toBe(false);
    });

    it('goes to INSTALL when only the installer failed to open after a finished download', async () => {
      serviceMock.startDownloadService.mockRejectedValue(new Error('Cannot open installer'));
      serviceMock.isDownloaded.mockReturnValue(true);
      const { viewBinding, executeDownLoad } = usePatch();

      await executeDownLoad();

      expect(viewBinding.progressBar).toBe(100);
      expect(viewBinding.btnDownload.text).toBe('INSTALL');
      expect(viewBinding.btnDownload.isEnabled).toBe(true);
    });
  });

  it('onResume() only updates the state when the Download button is disabled (Rule #3)', () => {
    const { viewBinding, isDownloading, onResume } = usePatch();

    // Case 1: isEnabled = true -> do nothing
    viewBinding.btnDownload.isEnabled = true;
    onResume();
    expect(viewBinding.progressBar).toBe(0);
    expect(viewBinding.btnDownload.text).toBe('Download');

    // Case 2: isEnabled = false -> switch to INSTALL and progress = 100
    viewBinding.btnDownload.isEnabled = false;
    isDownloading.value = true;
    onResume();
    expect(viewBinding.progressBar).toBe(100);
    expect(viewBinding.btnDownload.text).toBe('INSTALL');
    expect(viewBinding.btnDownload.isEnabled).toBe(true);
    expect(isDownloading.value).toBe(false);
  });

  describe('handleResume', () => {
    it('ignores a return from background while the download has not finished', () => {
      serviceMock.isDownloaded.mockReturnValue(false);
      const { viewBinding, handleResume } = usePatch();
      viewBinding.btnDownload.isEnabled = false;

      handleResume();

      expect(viewBinding.btnDownload.text).toBe('Download');
      expect(viewBinding.btnDownload.isEnabled).toBe(false);
    });

    it('switches to INSTALL once the download has finished', () => {
      serviceMock.isDownloaded.mockReturnValue(true);
      const { viewBinding, handleResume } = usePatch();
      viewBinding.btnDownload.isEnabled = false;

      handleResume();

      expect(viewBinding.btnDownload.text).toBe('INSTALL');
      expect(viewBinding.btnDownload.isEnabled).toBe(true);
    });
  });

  it('singleClickListener prevents double clicks (anti-spam lock)', async () => {
    const { singleClickListener } = usePatch();

    // Double click
    singleClickListener.onSingleClick();
    singleClickListener.onSingleClick();
    await flush();
    expect(serviceMock.startDownloadService).toHaveBeenCalledTimes(1);

    // Wait for the 1000ms lock to expire
    await vi.advanceTimersByTimeAsync(1000);

    singleClickListener.onSingleClick();
    await flush();
    expect(serviceMock.startDownloadService).toHaveBeenCalledTimes(2);
  });

  it('onBackPressed() always returns false (Rule #1)', () => {
    const { onBackPressed } = usePatch();
    expect(onBackPressed()).toBe(false);
  });

  describe('lifecycle hooks and Capacitor resume', () => {
    it('onMounted runs onCreate and registers the appStateChange listener', async () => {
      const { wrapper, result } = mountComposable();
      await flush();

      expect(serviceMock.registerReceiver).toHaveBeenCalledWith(
        'message_progress',
        result.broadcastReceiver.onReceive,
      );
      expect(result.viewBinding.txtPatchText).toBe(MOCK_PATCH_MESSAGE);
      expect(appMock.addListener).toHaveBeenCalledWith('appStateChange', expect.any(Function));

      wrapper.unmount();
    });

    it('appStateChange with isActive true triggers the resume logic', async () => {
      serviceMock.isDownloaded.mockReturnValue(true);
      const { wrapper, result } = mountComposable();
      await flush();
      result.viewBinding.btnDownload.isEnabled = false;

      appStateListener?.({ isActive: true });

      expect(result.viewBinding.btnDownload.text).toBe('INSTALL');
      expect(result.viewBinding.btnDownload.isEnabled).toBe(true);

      wrapper.unmount();
    });

    it('appStateChange with isActive false does nothing', async () => {
      serviceMock.isDownloaded.mockReturnValue(true);
      const { wrapper, result } = mountComposable();
      await flush();
      result.viewBinding.btnDownload.isEnabled = false;

      appStateListener?.({ isActive: false });

      expect(result.viewBinding.btnDownload.text).toBe('Download');
      expect(result.viewBinding.btnDownload.isEnabled).toBe(false);

      wrapper.unmount();
    });

    it('onUnmounted unregisters the same receiver and removes the appStateChange listener', async () => {
      const { wrapper, result } = mountComposable();
      await flush();

      wrapper.unmount();

      expect(serviceMock.unregisterReceiver).toHaveBeenCalledWith(
        'message_progress',
        result.broadcastReceiver.onReceive,
      );
      expect(removeHandle).toHaveBeenCalledTimes(1);
    });

    it('removes the listener right away when the component is unmounted before addListener resolves', async () => {
      let resolveHandle!: (handle: { remove: typeof removeHandle }) => void;
      appMock.addListener.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveHandle = resolve;
          }),
      );
      const { wrapper } = mountComposable();

      wrapper.unmount();
      resolveHandle({ remove: removeHandle });
      await flush();

      expect(removeHandle).toHaveBeenCalledTimes(1);
    });
  });
});
