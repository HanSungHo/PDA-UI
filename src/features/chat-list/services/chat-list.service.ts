import { DeviceInfo } from 'src/constants/device-info';
import { CommonUtil } from 'src/utils/common-util';

import type { ChatListRoom } from '../types/chat-list.types';
import { legacyItems, sendLegacyChatMessage, xmlMessage } from './chat-legacy.service';

function text(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

export async function fetchChatRooms(): Promise<ChatListRoom[]> {
  const wifiIp = (await CommonUtil.wifiIpAddress()) ?? '';
  const messageBody = await sendLegacyChatMessage(
    xmlMessage(
      'GETPDAMESSAGE',
      `<FACILITY>${DeviceInfo.FACILITY}</FACILITY>\n<AREA></AREA>\n<IPADDR>${wifiIp}</IPADDR>`,
    ),
  );
  const items = legacyItems(messageBody, 'ITEMS');

  return items.map((item) => {
    const room = item as Record<string, unknown>;

    return {
      id: text(room.ROOM_ID),
      name: text(room.ROOM_KEY),
      lastMessage: text(room.LAST_MESSAGE),
      time: text(room.LAST_MESSAGE_AT),
      unreadCount: text(room.UNREAD_COUNT, '0'),
    };
  });
}
