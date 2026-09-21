import type { ConfigMessagePayload, LoginMessagePayload } from './main-message.types';

export function buildLoginMessage(payload: LoginMessagePayload): string {
  return buildMessage('LOGIN', payload.mobileServerName, payload.deviceName, [
    ['OPERATORID', payload.userId],
    ['PASSWORD', payload.password],
    ['BAY', payload.bay],
    ['FACILITY', payload.facility],
    ['DEVICENAME', payload.deviceName],
    ['SERVERNAME', payload.mobileServerName],
  ]);
}

export function buildConfigMessage(payload: ConfigMessagePayload): string {
  return buildMessage('CONFIG', payload.mobileServerName, payload.deviceName, [
    ['FACILITY', payload.facility],
    ['AREA', payload.area],
    ['BAY', payload.bay],
    ['DEVICENAME', payload.deviceName],
    ['IPADDR', payload.wifiIp],
    ['USERID', payload.operatorId],
  ]);
}

function buildMessage(
  messageName: string,
  receiver: string,
  sender: string,
  bodyEntries: Array<[string, string]>,
): string {
  const body = bodyEntries.map(([key, value]) => `<${key}>${value}</${key}>`).join('\n');

  return [
    '<AIFMSG>',
    `<MSGNAME>${messageName}</MSGNAME>`,
    `<RECEIVER>${receiver}</RECEIVER>`,
    `<SENDER>${sender}</SENDER>`,
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
