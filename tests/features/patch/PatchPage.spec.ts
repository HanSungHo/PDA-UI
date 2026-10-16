import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MOCK_PATCH_MESSAGE } from '~/features/patch/mocks/patch.mock';
import PatchPage from '~/features/patch/pages/PatchPage.vue';
import type { DownloadProgress } from '~/features/patch/types/patch.types';

type AppStateListener = (state: { isActive: boolean }) => void;
type ProgressReceiver = (action: string, data: DownloadProgress | null) => void;

const serviceMock = vi.hoisted(() => ({
  registerReceiver: vi.fn(),
  unregisterReceiver: vi.fn(),
  startDownloadService: vi.fn(),
  isDownloaded: vi.fn(),
}));
const appMock = vi.hoisted(() => ({ addListener: vi.fn() }));

vi.mock('~/features/patch/services/patch.service', () => ({ patchService: serviceMock }));
vi.mock('@capacitor/app', () => ({ App: { addListener: appMock.addListener } }));

// Stub BaseModal, BaseButton and QLinearProgress to keep the page test isolated
const BaseModalStub = {
  name: 'BaseModal',
  props: ['open', 'width', 'closable', 'overlayClosable'],
  emits: ['cancel', 'update:open'],
  template: `
    <div v-if="open" class="base-modal-stub">
      <slot name="title" />
      <slot />
      <slot name="footer" />
    </div>
  `,
};

const BaseButtonStub = {
  name: 'BaseButton',
  props: ['label', 'disabled', 'loading', 'variant', 'size'],
  emits: ['click'],
  template: `
    <button
      class="base-button-stub"
      :disabled="disabled"
      @click="$emit('click')"
    >
      {{ label }}
    </button>
  `,
};

const QLinearProgressStub = {
  name: 'QLinearProgress',
  props: ['value', 'color', 'trackColor', 'size', 'rounded', 'indeterminate'],
  template: `
    <div
      class="q-linear-progress-stub"
      :data-value="value"
    />
  `,
};

describe('PatchPage.vue', () => {
  let wrapper: VueWrapper | null = null;
  let appStateListener: AppStateListener | undefined;

  // Lets pending promises and Vue updates settle while fake timers are active
  const flush = () => vi.advanceTimersByTimeAsync(0);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    appStateListener = undefined;
    serviceMock.isDownloaded.mockReturnValue(false);
    serviceMock.startDownloadService.mockResolvedValue(true);
    appMock.addListener.mockImplementation(async (_event: string, listener: AppStateListener) => {
      appStateListener = listener;
      return { remove: vi.fn().mockResolvedValue(undefined) };
    });
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function createWrapper(props = { modelValue: true }) {
    wrapper = mount(PatchPage, {
      props,
      global: {
        stubs: {
          BaseModal: BaseModalStub,
          BaseButton: BaseButtonStub,
          QLinearProgress: QLinearProgressStub,
        },
      },
    });
    // onMounted fills the message and registers listeners after the first render
    await flush();
    return wrapper;
  }

  function getProgress(w: VueWrapper) {
    return w.findComponent(QLinearProgressStub);
  }

  function getButton(w: VueWrapper) {
    return w.findComponent(BaseButtonStub);
  }

  function getProgressReceiver(): ProgressReceiver {
    return serviceMock.registerReceiver.mock.calls[0][1] as ProgressReceiver;
  }

  async function clickDownload(w: VueWrapper) {
    await getButton(w).trigger('click');
    await flush();
  }

  it('displays the title, patch message, progress bar and Download button', async () => {
    const w = await createWrapper();

    expect(w.find('.patch-modal__title').text()).toBe('Patch');
    expect(w.find('.patch-message-card__text').text()).toContain(MOCK_PATCH_MESSAGE);

    const progress = w.find('.q-linear-progress-stub');
    expect(progress.exists()).toBe(true);
    expect(progress.attributes('data-value')).toBe('0');
    expect(getProgress(w).props('indeterminate')).toBe(false);

    const button = getButton(w);
    expect(button.text()).toBe('Download');
    expect(button.props('disabled')).toBe(false);
    expect(button.props('loading')).toBe(false);
  });

  it('configures the modal with strict blocking properties (no close button, no closing on outside click)', async () => {
    const w = await createWrapper();
    const modal = w.findComponent(BaseModalStub);

    expect(modal.props('closable')).toBe(false);
    expect(modal.props('overlayClosable')).toBe(false);
  });

  it('disables the button, shows loading and starts the download when Download is clicked', async () => {
    // Keep the download pending so the "downloading" state can be inspected
    serviceMock.startDownloadService.mockImplementation(() => new Promise<boolean>(() => {}));
    const w = await createWrapper();

    await clickDownload(w);

    const button = getButton(w);
    expect(serviceMock.startDownloadService).toHaveBeenCalledTimes(1);
    expect(button.props('disabled')).toBe(true);
    expect(button.props('loading')).toBe(true);
    // No progress yet: indeterminate state
    expect(getProgress(w).props('indeterminate')).toBe(true);
  });

  it('shows the received absolute percent on the progress bar (value is 0..1 for Quasar)', async () => {
    serviceMock.startDownloadService.mockImplementation(() => new Promise<boolean>(() => {}));
    const w = await createWrapper();
    await clickDownload(w);

    getProgressReceiver()('message_progress', { progress: 40 });
    await flush();

    expect(getProgress(w).props('value')).toBeCloseTo(0.4);
    expect(getProgress(w).props('indeterminate')).toBe(false);

    getProgressReceiver()('message_progress', { progress: 75 });
    await flush();

    expect(getProgress(w).props('value')).toBeCloseTo(0.75);
  });

  it('switches to INSTALL when the app becomes active after the download finished', async () => {
    const w = await createWrapper();
    await clickDownload(w);

    // The installer is open and the button stays locked until the app resumes
    expect(getButton(w).props('disabled')).toBe(true);
    expect(getButton(w).text()).toBe('Download');

    serviceMock.isDownloaded.mockReturnValue(true);
    appStateListener?.({ isActive: true });
    await flush();

    const button = getButton(w);
    expect(button.text()).toBe('INSTALL');
    expect(button.props('disabled')).toBe(false);
    expect(button.props('loading')).toBe(false);
    expect(getProgress(w).props('value')).toBe(1);
  });

  it('stays locked when the app becomes active while the download is still running', async () => {
    const w = await createWrapper();
    await clickDownload(w);

    serviceMock.isDownloaded.mockReturnValue(false);
    appStateListener?.({ isActive: true });
    await flush();

    expect(getButton(w).text()).toBe('Download');
    expect(getButton(w).props('disabled')).toBe(true);
  });

  it('switches to INSTALL immediately when there is no installer (browser)', async () => {
    serviceMock.startDownloadService.mockResolvedValue(false);
    const w = await createWrapper();

    await clickDownload(w);

    const button = getButton(w);
    expect(button.text()).toBe('INSTALL');
    expect(button.props('disabled')).toBe(false);
    expect(getProgress(w).props('value')).toBe(1);
  });

  it('restores the Download button and resets progress when the download fails', async () => {
    serviceMock.startDownloadService.mockRejectedValue(new Error('Network error'));
    const w = await createWrapper();

    await clickDownload(w);

    const button = getButton(w);
    expect(button.text()).toBe('Download');
    expect(button.props('disabled')).toBe(false);
    expect(button.props('loading')).toBe(false);
    expect(getProgress(w).props('value')).toBe(0);
  });

  it('calls the service again when INSTALL is pressed (reinstall without downloading again)', async () => {
    serviceMock.startDownloadService.mockResolvedValue(false);
    const w = await createWrapper();
    await clickDownload(w);
    expect(getButton(w).text()).toBe('INSTALL');

    // Wait for the anti double-click lock to expire
    await vi.advanceTimersByTimeAsync(1000);
    await clickDownload(w);

    expect(serviceMock.startDownloadService).toHaveBeenCalledTimes(2);
  });

  it('prevents the modal from closing through handleModalOpenChange and handleClose (onBackPressed returns false)', async () => {
    const w = await createWrapper();
    const modal = w.findComponent(BaseModalStub);

    // Request to close through update:open
    await modal.vm.$emit('update:open', false);
    expect(w.emitted('update:modelValue')).toBeUndefined();
    expect(w.emitted('close')).toBeUndefined();

    // Request to close through cancel
    await modal.vm.$emit('cancel');
    expect(w.emitted('update:modelValue')).toBeUndefined();
    expect(w.emitted('close')).toBeUndefined();
  });

  it('still forwards update:open with true to the parent', async () => {
    const w = await createWrapper();
    const modal = w.findComponent(BaseModalStub);

    await modal.vm.$emit('update:open', true);

    expect(w.emitted('update:modelValue')?.[0]).toEqual([true]);
    expect(w.emitted('close')).toBeUndefined();
  });

  it('keeps the button as Download when the modal is reopened and the button is enabled', async () => {
    const w = await createWrapper({ modelValue: false });

    await w.setProps({ modelValue: true });

    const button = getButton(w);
    expect(button.exists()).toBe(true);
    expect(button.text()).toBe('Download');
    expect(button.props('disabled')).toBe(false);
  });

  it('switches to INSTALL when the modal is reopened after the download finished', async () => {
    const w = await createWrapper();
    await clickDownload(w);
    serviceMock.isDownloaded.mockReturnValue(true);

    await w.setProps({ modelValue: false });
    await w.setProps({ modelValue: true });

    const button = getButton(w);
    expect(button.text()).toBe('INSTALL');
    expect(button.props('disabled')).toBe(false);
  });

  it('keeps the button locked when the modal is reopened while the download is still running', async () => {
    const w = await createWrapper();
    await clickDownload(w);
    serviceMock.isDownloaded.mockReturnValue(false);

    await w.setProps({ modelValue: false });
    await w.setProps({ modelValue: true });

    const button = getButton(w);
    expect(button.text()).toBe('Download');
    expect(button.props('disabled')).toBe(true);
  });
});
