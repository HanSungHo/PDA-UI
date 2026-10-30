import { DeviceInfo } from 'src/constants/device-info';
import { MOBILE_SERVER_NAME } from 'src/constants/server';
import { useMainStore } from 'src/features/main/stores/main.store';
import apiClient from 'src/services/api-client';
import type { MessageResponseData } from 'src/types/api';

export type AifMessageField = readonly [name: string, value: string];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildAifMessage(messageName: string, fields: readonly AifMessageField[]): string {
  const mainStore = useMainStore();
  const receiver = mainStore.mobileServerName || MOBILE_SERVER_NAME;
  const sender = mainStore.deviceName || DeviceInfo.DEVICE_NAME;
  const body = fields.map(([name, value]) => `<${name}>${escapeXml(value)}</${name}>`).join('\n');

  return [
    '<AIFMSG>',
    `<MSGNAME>${escapeXml(messageName)}</MSGNAME>`,
    `<RECEIVER>${escapeXml(receiver)}</RECEIVER>`,
    `<SENDER>${escapeXml(sender)}</SENDER>`,
    '<MSGTYPE>P</MSGTYPE>',
    '<WITHREPLY>YES</WITHREPLY>',
    '<STATUS></STATUS>',
    '<ERRMSG></ERRMSG>',
    '<TID></TID>',
    '<MSGBODY>',
    body,
    '</MSGBODY>',
    '</AIFMSG>',
  ].join('\n');
}

export async function postAifMessage(
  endpointName: string,
  messageName: string,
  fields: readonly AifMessageField[],
): Promise<MessageResponseData> {
  const response = await apiClient.post<MessageResponseData>(
    `/hifos/${endpointName.toLowerCase()}`,
    { sMsg: buildAifMessage(messageName, fields) },
  );
  return response.data;
}
