import { DeviceInfo } from 'src/constants/device-info';
import apiClient from 'src/services/api-client';
import { isResponseSuccessful, parseMessageBody } from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

export interface LegacyDevice {
  id: string;
  ip: string;
  bay: string;
  area: string;
  userName: string;
}

export function xmlMessage(messageName: string, body: string): string {
  return `<AIFMSG>\n<MSGNAME>${messageName}</MSGNAME>\n<RECEIVER>${DeviceInfo.MOBILE_SERVER_NAME}</RECEIVER>\n<SENDER>${DeviceInfo.DEVICE_NAME}</SENDER>\n<MSGTYPE>P</MSGTYPE>\n<WITHREPLY>YES</WITHREPLY>\n<STATUS></STATUS>\n<ERRMSG></ERRMSG>\n<TID></TID>\n<MSGBODY>\n${body}\n</MSGBODY>\n</AIFMSG>`;
}

export async function sendLegacyChatMessage(body: string): Promise<Record<string, unknown>> {
  const response = await apiClient.post<MessageResponseData>('/hifos/NEWPDALIST', { sMsg: body });
  if (!isResponseSuccessful(response.data)) return {};
  return parseMessageBody(response.data);
}

export function legacyItems(body: Record<string, unknown>, key: string, child = 'ITEM'): unknown[] {
  const value = body[key];
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  const items = (value as Record<string, unknown>)[child];
  return Array.isArray(items) ? items : [];
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export async function fetchPdaList(wifiIp: string): Promise<LegacyDevice[]> {
  const body = await sendLegacyChatMessage(
    xmlMessage(
      'NEWPDALIST',
      `<FACILITY>${DeviceInfo.FACILITY}</FACILITY>\n<AREA></AREA>\n<BAY></BAY>\n<MYIP>${wifiIp}</MYIP>`,
    ),
  );
  return legacyItems(body, 'PDAS').map((item) => {
    const value = item as Record<string, unknown>;
    return {
      id: text(value.PDAID),
      ip: text(value.IPADDRESS),
      bay: text(value.BAY),
      area: text(value.AREA),
      userName: text(value.USERNAME),
    };
  });
}

export async function createPdaMessageRoom(request: {
  roomType: 'PRIVATE' | 'GROUP';
  roomName: string;
  ipAddrList: string[];
}): Promise<void> {
  await apiClient.post('/hifos/createPdaMessageRoom', { ...request, creatorId: '' });
}
