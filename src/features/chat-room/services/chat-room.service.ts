import { DeviceInfo } from 'src/constants/device-info';
import apiClient from 'src/services/api-client';
import { CommonUtil } from 'src/utils/common-util';

import {
  legacyItems,
  sendLegacyChatMessage,
  xmlMessage,
} from '../../chat-list/services/chat-legacy.service';
import type { ChatMessage, ChatRoomData, SendChatMessageRequest } from '../types/chat-room.types';

function text(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

export async function fetchChatRoom(roomId: string, roomName: string): Promise<ChatRoomData> {
  const wifiIp = (await CommonUtil.wifiIpAddress()) ?? '';
  const messageBody = await sendLegacyChatMessage(
    xmlMessage(
      'GETPDAROOMMESSAGEBYROOM',
      `<FACILITY>${DeviceInfo.FACILITY}</FACILITY>\n<ROOMID>${roomId}</ROOMID>\n<ROOMNAME>${roomName}</ROOMNAME>\n<IPADDR>${wifiIp}</IPADDR>`,
    ),
  );
  const items = legacyItems(messageBody, 'ITEMS');
  const users = legacyItems(messageBody, 'USERS', 'USER');
  let recipientIp = '';
  let recipientId = '';

  const messages = items.map((item) => {
    const rawMessage = item as Record<string, unknown>;
    const senderIp = text(rawMessage.SENDER_IP);
    const senderId = text(rawMessage.ROOM_NAME);

    if (senderIp !== wifiIp) {
      recipientIp = senderIp;
      recipientId = senderId;
    }

    return {
      roomId,
      senderId,
      senderIp,
      text: text(rawMessage.CONTENT),
      time: text(rawMessage.CREATED_AT),
      level: text(rawMessage.MESSAGE_LEVEL),
    } satisfies ChatMessage;
  });

  return {
    messages,
    participants: users.map((user) => text((user as Record<string, unknown>).PDAID)),
    recipientIp,
    recipientId,
  };
}

export async function sendChatMessage(request: SendChatMessageRequest): Promise<void> {
  await apiClient.post('/hifos/sendPdaMessage', request);
}
