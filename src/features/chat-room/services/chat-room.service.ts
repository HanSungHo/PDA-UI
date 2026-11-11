import { DeviceInfo } from 'src/constants/device-info';
import apiClient from 'src/services/api-client';

import {
  ipText,
  legacyItems,
  sendPdaListMessage,
} from '../../chat-list/services/chat-legacy.service';
import type { ChatMessage, ChatRoomData, SendChatMessageRequest } from '../types/chat-room.types';

function text(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

export async function fetchChatRoom(
  roomId: string,
  roomName: string,
  localIp: string | null,
): Promise<ChatRoomData> {
  const messageBody = await sendPdaListMessage('GETPDAROOMMESSAGEBYROOM', [
    ['FACILITY', DeviceInfo.FACILITY],
    ['ROOMID', roomId],
    ['ROOMNAME', roomName],
    ['IPADDR', ipText(localIp)],
  ]);
  const items = legacyItems(messageBody, 'ITEMS');
  const users = legacyItems(messageBody, 'USERS', 'USER');
  let recipientIp = '';
  let recipientId = '';

  const messages = items.map((item) => {
    const rawMessage = item as Record<string, unknown>;
    const senderIp = text(rawMessage.SENDER_IP);
    const senderId = text(rawMessage.ROOM_NAME);

    // Kotlin `wifiIp != senderIp`: a null local IP never equals a sender IP.
    if (localIp === null || senderIp !== localIp) {
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
