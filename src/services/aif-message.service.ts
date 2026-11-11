import { DeviceInfo } from 'src/constants/device-info';
import { MOBILE_SERVER_NAME } from 'src/constants/server';
import { useMainStore } from 'src/features/main/stores/main.store';
import apiClient from 'src/services/api-client';
import type { MessageResponseData } from 'src/types/api';

/** Nested XML (e.g. a list of <ITEM> elements) that MessageFactoryUtil inserts into MSGBODY as is. */
export interface AifXmlFragment {
  readonly xml: string;
}

export type AifMessageField = readonly [name: string, value: string | AifXmlFragment];

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
  const body = fields
    .map(([name, value]) => {
      const content = typeof value === 'string' ? escapeXml(value) : value.xml;
      return `<${name}>${content}</${name}>`;
    })
    .join('\n');

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

export interface PostAifMessageOptions {
  /**
   * Post to `/hifos/<endpointName>` exactly as given. Default is the lower-cased route; Android
   * posts MessageName constants such as `NEWPDALIST` in their exact case.
   */
  readonly preserveRouteCase?: boolean;
}

export async function postAifMessage(
  endpointName: string,
  messageName: string,
  fields: readonly AifMessageField[],
  options: PostAifMessageOptions = {},
): Promise<MessageResponseData> {
  const route = options.preserveRouteCase ? endpointName : endpointName.toLowerCase();
  const response = await apiClient.post<MessageResponseData>(`/hifos/${route}`, {
    sMsg: buildAifMessage(messageName, fields),
  });
  return response.data;
}
