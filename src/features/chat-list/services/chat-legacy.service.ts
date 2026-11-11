import { DeviceInfo } from 'src/constants/device-info';
import { type AifMessageField, postAifMessage } from 'src/services/aif-message.service';
import apiClient from 'src/services/api-client';
import { isResponseSuccessful, parseMessageBody } from 'src/services/message-response.helper';

export interface LegacyDevice {
  id: string;
  ip: string;
  bay: string;
  area: string;
  userName: string;
}

/**
 * Kotlin string-template/`toString()` of a nullable IP: a null `getLocalIpAddress()` is sent as the
 * literal text "null" (MessageFactoryUtil `$wifiIp`, `wifiIp.toString()`), never as an empty string.
 * Intentional Android parity; see docs/migration chat-list review (IP source).
 */
export function ipText(ip: string | null): string {
  return ip ?? 'null';
}

/**
 * Android `MessageSender.send(..., MessageName.NEWPDALIST)`: every chat-list/chat-room message
 * (GETPDAMESSAGE, NEWPDALIST, GETPDAROOMMESSAGEBYROOM) is posted to `/hifos/NEWPDALIST` in exact
 * case (`preserveRouteCase`); a non-successful response yields no body.
 */
export async function sendPdaListMessage(
  messageName: string,
  fields: readonly AifMessageField[],
): Promise<Record<string, unknown>> {
  const response = await postAifMessage('NEWPDALIST', messageName, fields, {
    preserveRouteCase: true,
  });
  if (!isResponseSuccessful(response)) return {};
  return parseMessageBody(response);
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

export async function fetchPdaList(localIp: string | null): Promise<LegacyDevice[]> {
  const body = await sendPdaListMessage('NEWPDALIST', [
    ['FACILITY', DeviceInfo.FACILITY],
    ['AREA', ''],
    ['BAY', ''],
    ['MYIP', ipText(localIp)],
  ]);
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
