import apiClient from 'src/services/api-client';
import type { MessageResponseData } from 'src/types/api';

export type ShelfMessage = 'SHELFCALL' | 'CHECKINSHELFLOT' | 'LOTINSHELF' | 'LOTOUTSHELF';
export interface ShelfDevice {
  mobileServerName: string;
  deviceName: string;
}

function escapeXml(value: string): string {
  return value.replace(
    /[<>&"']/g,
    (char) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char] ?? char,
  );
}

export function shelfMessage(
  name: ShelfMessage,
  fields: [string, string][],
  device: ShelfDevice,
): string {
  return [
    '<AIFMSG>',
    `<MSGNAME>${name}</MSGNAME>`,
    `<RECEIVER>${escapeXml(device.mobileServerName)}</RECEIVER>`,
    `<SENDER>${escapeXml(device.deviceName)}</SENDER>`,
    '<MSGTYPE>P</MSGTYPE>',
    '<WITHREPLY>YES</WITHREPLY>',
    '<STATUS></STATUS>',
    '<ERRMSG></ERRMSG>',
    '<TID></TID>',
    '<MSGBODY>',
    ...fields.map(([key, value]) => `<${key}>${escapeXml(value)}</${key}>`),
    '</MSGBODY>',
    '</AIFMSG>',
  ].join('\n');
}

export async function sendShelfMessage(
  name: ShelfMessage,
  fields: [string, string][],
  device: ShelfDevice,
): Promise<MessageResponseData> {
  // SHELFCALL uses the generic endpoint; MessageSender uses message-specific endpoints.
  const endpoint = name === 'SHELFCALL' ? '/hifos/message' : `/hifos/${name.toLowerCase()}`;
  const response = await apiClient.post<MessageResponseData>(endpoint, {
    sMsg: shelfMessage(name, fields, device),
  });
  return response.data;
}
