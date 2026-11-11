import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { HifosUdpAlarm } from 'src/services/hifos-udp-alarm.plugin';
import type { Router } from 'vue-router';

/** Mirrors the extras of Android UDPService.showChatNotification (roomId, roomName, clearMessages). */
export interface ChatRoomOpenRequest {
  roomId: string;
  roomName: string;
  clearMessages: boolean;
}

interface ChatNotificationBridge {
  addListener(
    eventName: 'chatRoomOpen',
    listener: (request: ChatRoomOpenRequest) => void,
  ): Promise<PluginListenerHandle>;
  consumePendingChatRoomOpen(): Promise<{ request: ChatRoomOpenRequest | null }>;
}

interface ChatNotificationDependencies {
  isNativePlatform: () => boolean;
  plugin: ChatNotificationBridge;
}

const defaultDependencies: ChatNotificationDependencies = {
  isNativePlatform: () => Capacitor.isNativePlatform(),
  plugin: HifosUdpAlarm,
};

/** Same route/query contract as the chat-list row tap (routes.ts reads clearMessages === 'true'). */
async function openChatRoom(router: Router, request: ChatRoomOpenRequest): Promise<void> {
  await router.push({
    name: 'chat-room',
    query: {
      roomId: request.roomId ?? '',
      roomName: request.roomName ?? '',
      ...(request.clearMessages ? { clearMessages: 'true' } : {}),
    },
  });
}

/**
 * Opens the chat room when a UDP chat notification is tapped, both from a cold start (pending
 * request queued by MainActivity before the WebView loaded) and while the app is running.
 */
export async function initializeChatNotificationBridge(
  router: Router,
  dependencies: ChatNotificationDependencies = defaultDependencies,
): Promise<PluginListenerHandle | undefined> {
  if (!dependencies.isNativePlatform()) return undefined;

  let handle: PluginListenerHandle | undefined;

  try {
    handle = await dependencies.plugin.addListener('chatRoomOpen', (request) => {
      // Native also keeps the tap pending; clear it so a later WebView reload does not reopen it.
      void openChatRoom(router, request)
        .then(() => dependencies.plugin.consumePendingChatRoomOpen())
        .catch(() => undefined);
    });
    // Cold start: the tap was queued by MainActivity before the WebView loaded (read-and-clear).
    const { request } = await dependencies.plugin.consumePendingChatRoomOpen();
    if (request) await openChatRoom(router, request);
    return handle;
  } catch {
    await handle?.remove();
    return undefined;
  }
}
