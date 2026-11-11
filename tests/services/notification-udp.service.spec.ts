import {
  completeNotification,
  initializeNotificationUdpBridge,
  notificationUdp,
  type NotificationUdpPayload,
} from 'src/services/notification-udp.service';
import { describe, expect, it, vi } from 'vitest';

function createPlugin(pending: NotificationUdpPayload[] = []) {
  let emit: (payload: NotificationUdpPayload) => void = () => undefined;
  const remove = vi.fn(async () => undefined);
  const plugin = {
    addListener: vi.fn(
      async (_name: 'notification', listener: (payload: NotificationUdpPayload) => void) => {
        emit = listener;
        return { remove };
      },
    ),
    getPendingAlarms: vi.fn(async () => ({ events: pending })),
    acknowledgeAlarm: vi.fn(async () => undefined),
    startListening: vi.fn(async () => undefined),
  };
  return { plugin, remove, emit: (payload: NotificationUdpPayload) => emit(payload) };
}

describe('notification UDP bridge (UDPReceiver.kt NotificationActivity branch)', () => {
  it('does nothing outside the native platform', async () => {
    const { plugin } = createPlugin();
    await expect(
      initializeNotificationUdpBridge({ isNativePlatform: () => false, plugin }),
    ).resolves.toBeUndefined();
    expect(plugin.addListener).not.toHaveBeenCalled();
  });

  it('uses the Capacitor platform check by default (web: no native bridge)', async () => {
    await expect(initializeNotificationUdpBridge()).resolves.toBeUndefined();
  });

  it('listens to the notification event, replays pending ones, then starts listening', async () => {
    const { plugin } = createPlugin();
    await initializeNotificationUdpBridge({ isNativePlatform: () => true, plugin });
    expect(plugin.addListener).toHaveBeenCalledWith('notification', expect.any(Function));
    expect(plugin.getPendingAlarms).toHaveBeenCalledWith({ eventName: 'notification' });
    expect(plugin.startListening).toHaveBeenCalled();
    expect(notificationUdp.open.value).toBe(false);
    expect(notificationUdp.receiverMessage.value).toBeNull();
  });

  it('hands the message over as UDP_RECEIVER_MESSAGE, newest first; OK acknowledges and reveals the previous one', async () => {
    const { plugin, emit } = createPlugin([
      { id: 'n-a', message: 'first' },
      { id: 'n-b', message: 'second' },
    ]);
    await initializeNotificationUdpBridge({ isNativePlatform: () => true, plugin });

    expect(notificationUdp.open.value).toBe(true);
    expect(notificationUdp.receiverMessage.value).toBe('second');

    emit({ id: 'n-c', message: 'third' });
    expect(notificationUdp.receiverMessage.value).toBe('third');
    const thirdKey = notificationUdp.key.value;

    await notificationUdp.complete(thirdKey);
    expect(plugin.acknowledgeAlarm).toHaveBeenCalledWith({ id: 'n-c' });
    expect(notificationUdp.receiverMessage.value).toBe('second');

    await completeNotification();
    expect(plugin.acknowledgeAlarm).toHaveBeenCalledWith({ id: 'n-b' });
    expect(notificationUdp.receiverMessage.value).toBe('first');

    await completeNotification();
    expect(plugin.acknowledgeAlarm).toHaveBeenCalledWith({ id: 'n-a' });
    expect(notificationUdp.open.value).toBe(false);
    expect(notificationUdp.key.value).toBeUndefined();

    await completeNotification();
    expect(plugin.acknowledgeAlarm).toHaveBeenCalledTimes(3);
  });

  it('drops a duplicate native id while queued, keeps id-less ones and ignores a stale key', async () => {
    const { plugin, emit } = createPlugin();
    await initializeNotificationUdpBridge({ isNativePlatform: () => true, plugin });

    emit({ id: 'dup', message: 'A' });
    const staleKey = notificationUdp.key.value;
    emit({ id: 'dup', message: 'A again' });
    emit({ message: 'B' });
    emit({ message: undefined as unknown as string });
    expect(notificationUdp.receiverMessage.value).toBe('B');

    await notificationUdp.complete(staleKey);
    expect(notificationUdp.receiverMessage.value).toBe('B');

    await notificationUdp.complete(notificationUdp.key.value);
    expect(notificationUdp.receiverMessage.value).toBe('A');
    expect(plugin.acknowledgeAlarm).not.toHaveBeenCalled();

    await notificationUdp.complete();
    expect(plugin.acknowledgeAlarm).toHaveBeenCalledWith({ id: 'dup' });
    expect(notificationUdp.open.value).toBe(false);
  });

  it('shows an empty-string message (non-null extra) like Android', async () => {
    const { plugin, emit } = createPlugin();
    await initializeNotificationUdpBridge({ isNativePlatform: () => true, plugin });
    emit({ message: '' });
    expect(notificationUdp.open.value).toBe(true);
    expect(notificationUdp.receiverMessage.value).toBe('');
    await completeNotification();
  });

  it('removes the listener and returns undefined when native startup fails', async () => {
    const { plugin, remove } = createPlugin();
    plugin.startListening.mockRejectedValueOnce(new Error('bind failed'));
    await expect(
      initializeNotificationUdpBridge({ isNativePlatform: () => true, plugin }),
    ).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalled();
  });
});
