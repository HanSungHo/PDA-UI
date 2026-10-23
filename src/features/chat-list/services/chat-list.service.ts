import { DeviceInfo } from 'src/constants/device-info';
import { sendMessage } from 'src/services/message.service';
import { isResponseSuccessful, parseMessageBody } from 'src/services/message-response.helper';
import { CommonUtil } from 'src/utils/common-util';

import type { ChatListRoom } from '../types/chat-list.types';

function text(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

export async function fetchChatRooms(): Promise<ChatListRoom[]> {
  const wifiIp = (await CommonUtil.wifiIpAddress()) ?? '';
  const response = await sendMessage('NEWPDALIST', {
    FACILITY: DeviceInfo.FACILITY,
    AREA: '',
    IPADDR: wifiIp,
  });

  if (!isResponseSuccessful(response)) return [];

  const messageBody = parseMessageBody(response) as Record<string, unknown>;
  const items = Array.isArray(messageBody.ITEMS) ? messageBody.ITEMS : [];

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
