import { Capacitor, type PluginListenerHandle, registerPlugin } from '@capacitor/core';
import { computed, shallowRef } from 'vue';

/** Native `notification` event: the UDPReceiver.kt NotificationActivity extra UDP_RECEIVER_MESSAGE. */
export interface NotificationUdpPayload {
  id?: string;
  message: string;
}

interface NotificationUdpEntry {
  key: number;
  payload: NotificationUdpPayload;
}

interface NotificationUdpBridge {
  startListening(): Promise<void>;
  addListener(
    eventName: 'notification',
    listener: (payload: NotificationUdpPayload) => void,
  ): Promise<PluginListenerHandle>;
  getPendingAlarms(options: {
    eventName: 'notification';
  }): Promise<{ events: NotificationUdpPayload[] }>;
  acknowledgeAlarm(options: { id: string }): Promise<void>;
}

interface NotificationUdpDependencies {
  isNativePlatform: () => boolean;
  plugin: NotificationUdpBridge;
}

const HifosUdpAlarm = registerPlugin<NotificationUdpBridge>('HifosUdpAlarm');
const defaultDependencies: NotificationUdpDependencies = {
  isNativePlatform: () => Capacitor.isNativePlatform(),
  plugin: HifosUdpAlarm,
};

/**
 * Legacy startActivity(NEW_TASK) per broadcast: the newest notification is shown first and
 * finishing it reveals the previous one. The last element is the visible notification.
 */
const notificationStack: NotificationUdpEntry[] = [];
const visibleEntry = shallowRef<NotificationUdpEntry | undefined>();
const queuedIds = new Set<string>();
let activePlugin: NotificationUdpBridge | undefined;
let nextKey = 0;

function showTopNotification(): void {
  visibleEntry.value = notificationStack[notificationStack.length - 1];
}

function enqueueNotification(payload: NotificationUdpPayload): void {
  if (typeof payload.message !== 'string') return;
  if (payload.id && queuedIds.has(payload.id)) return;
  if (payload.id) queuedIds.add(payload.id);
  nextKey += 1;
  notificationStack.push({ key: nextKey, payload });
  showTopNotification();
}

/** OK / back of the visible NotificationActivity: finish(), acknowledge and reveal the previous one. */
export async function completeNotification(key?: number): Promise<void> {
  const top = notificationStack[notificationStack.length - 1];
  if (!top || (key !== undefined && key !== top.key)) return;
  notificationStack.pop();
  showTopNotification();
  if (top.payload.id) {
    queuedIds.delete(top.payload.id);
    await activePlugin?.acknowledgeAlarm({ id: top.payload.id });
  }
}

export async function initializeNotificationUdpBridge(
  dependencies: NotificationUdpDependencies = defaultDependencies,
): Promise<PluginListenerHandle | undefined> {
  if (!dependencies.isNativePlatform()) return undefined;
  activePlugin = dependencies.plugin;
  let listenerHandle: PluginListenerHandle | undefined;
  try {
    listenerHandle = await dependencies.plugin.addListener('notification', enqueueNotification);
    const pending = await dependencies.plugin.getPendingAlarms({ eventName: 'notification' });
    pending.events.forEach(enqueueNotification);
    await dependencies.plugin.startListening();
    return listenerHandle;
  } catch {
    await listenerHandle?.remove();
    return undefined;
  }
}

export const notificationUdp = {
  /** Key of the visible entry; changes for every notification so the screen is recreated. */
  key: computed(() => visibleEntry.value?.key),
  open: computed(() => visibleEntry.value !== undefined),
  /** Android intent.getStringExtra(DeviceInfo.UDP_RECEIVER_MESSAGE). */
  receiverMessage: computed(() => visibleEntry.value?.payload.message ?? null),
  complete: completeNotification,
};
