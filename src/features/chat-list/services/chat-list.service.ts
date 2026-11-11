import { DeviceInfo } from 'src/constants/device-info';

import type { ChatListRoom } from '../types/chat-list.types';
import { ipText, legacyItems, sendPdaListMessage } from './chat-legacy.service';

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export async function fetchChatRooms(localIp: string | null): Promise<ChatListRoom[]> {
  const messageBody = await sendPdaListMessage('GETPDAMESSAGE', [
    ['FACILITY', DeviceInfo.FACILITY],
    ['AREA', ''],
    ['IPADDR', ipText(localIp)],
  ]);
  const items = legacyItems(messageBody, 'ITEMS');

  return items.map((item) => {
    const room = item as Record<string, unknown>;

    return {
      id: text(room.ROOM_ID),
      name: text(room.ROOM_KEY),
      lastMessage: text(room.LAST_MESSAGE),
      time: text(room.LAST_MESSAGE_AT),
      unreadCount: text(room.UNREAD_COUNT),
    };
  });
}
