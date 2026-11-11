import { mount } from '@vue/test-utils';
import GlobalDialogHost from 'src/components/GlobalDialogHost.vue';
import OkDialog from 'src/components/OkDialog.vue';
import { initializeNotificationUdpBridge } from 'src/services/notification-udp.service';
import { okDialog } from 'src/services/ok-dialog.service';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/app', () => ({
  App: { addListener: () => Promise.resolve({ remove: () => Promise.resolve() }) },
}));

describe('GlobalDialogHost NotificationPage (UDP HIGH, empty ROOMNAME)', () => {
  it('shows the Notification screen with UDP_RECEIVER_MESSAGE and finishes it on close', async () => {
    const { plugin, emit } = (() => {
      let listener: (payload: { id?: string; message: string }) => void = () => undefined;
      return {
        plugin: {
          addListener: vi.fn(async (_name: 'notification', cb: typeof listener) => {
            listener = cb;
            return { remove: vi.fn(async () => undefined) };
          }),
          getPendingAlarms: vi.fn(async () => ({ events: [] })),
          acknowledgeAlarm: vi.fn(async () => undefined),
          startListening: vi.fn(async () => undefined),
        },
        emit: (payload: { id?: string; message: string }) => listener(payload),
      };
    })();
    const wrapper = mount(GlobalDialogHost, {
      global: {
        stubs: {
          AlarmCommonPopup: true,
          EQPspcOverlay: true,
          MDSSpcOverlay: true,
          StepperIdleDialog: true,
          RecipeInterlockDialog: true,
          PremptyDialog: true,
          OkDialog: true,
          OkCancelDialog: true,
          NotificationPage: true,
        },
      },
    });
    expect(wrapper.findComponent({ name: 'NotificationPage' }).exists()).toBe(false);

    await initializeNotificationUdpBridge({ isNativePlatform: () => true, plugin });
    emit({ id: 'host-1', message: 'plain text' });
    await wrapper.vm.$nextTick();

    const page = wrapper.findComponent({ name: 'NotificationPage' });
    expect(page.exists()).toBe(true);
    expect(page.props()).toMatchObject({
      modelValue: true,
      inboundParams: { UDP_RECEIVER_MESSAGE: 'plain text' },
    });

    page.vm.$emit('close');
    await vi.waitFor(() => expect(plugin.acknowledgeAlarm).toHaveBeenCalledWith({ id: 'host-1' }));
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'NotificationPage' }).exists()).toBe(false);
    wrapper.unmount();
  });
});

describe('GlobalDialogHost OkDialog', () => {
  afterEach(() => {
    okDialog.confirm();
  });

  it('opens OkDialog from the okDialog service and resolves RETURN_CODE_OK on confirm', async () => {
    const wrapper = mount(GlobalDialogHost, {
      global: {
        stubs: {
          AlarmCommonPopup: true,
          EQPspcOverlay: true,
          MDSSpcOverlay: true,
          StepperIdleDialog: true,
          RecipeInterlockDialog: true,
          PremptyDialog: true,
          OkCancelDialog: true,
        },
      },
    });
    const dialog = wrapper.findComponent(OkDialog);
    expect(dialog.props('open')).toBe(false);

    const result = okDialog.show('에  러', '장비를 입력해주세요', 'OK');
    await wrapper.vm.$nextTick();

    expect(dialog.props('open')).toBe(true);
    expect(dialog.props('title')).toBe('에  러');
    expect(dialog.vm.$attrs['aria-label']).toBe('에  러');
    expect(dialog.props('message')).toBe('장비를 입력해주세요');
    expect(dialog.props('confirmLabel')).toBe('OK');

    dialog.vm.$emit('confirm');
    await expect(result).resolves.toBe(1);
    await wrapper.vm.$nextTick();
    expect(dialog.props('open')).toBe(false);
    wrapper.unmount();
  });
});
