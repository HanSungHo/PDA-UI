import { useMainStore } from 'src/features/main/stores/main.store';

interface MessageHeader {
  messageName: string;
  receiver: string;
  sender: string;
}

function wrapMessage(messageName: string, fields: Array<[string, string]>): string {
  const mainStore = useMainStore();
  const header: MessageHeader = {
    messageName,
    receiver: mainStore.mobileServerName,
    sender: mainStore.deviceName,
  };
  const body = fields.map(([name, value]) => `<${name}>${value}</${name}>`).join('\n');

  return [
    '<AIFMSG>',
    `<MSGNAME>${header.messageName}</MSGNAME>`,
    `<RECEIVER>${header.receiver}</RECEIVER>`,
    `<SENDER>${header.sender}</SENDER>`,
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

export function getProcessFlow(
  facility: string,
  product: string,
  processOperation: string,
): string {
  return wrapMessage('GETPROCESSFLOW', [
    ['FACTORYNAME', facility],
    ['PRODUCT', product],
    ['PROCESSOPER', processOperation],
  ]);
}

export function getProcessOperation(
  facility: string,
  product: string,
  processFlow: string,
): string {
  return wrapMessage('GETPROCESSOPERATION', [
    ['FACTORYNAME', facility],
    ['PRODUCT', product],
    ['PROCESSFLOW', processFlow],
  ]);
}

export function getTagId(facility: string): string {
  return wrapMessage('GETTAGID', [['FACTORYNAME', facility]]);
}

export function getTagPosition(lotId: string): string {
  return wrapMessage('GETTAGPOSITION', [['LOTNAME', lotId]]);
}

export function insertEen(
  lotId: string,
  userId: string,
  facility: string,
  product: string,
  operation: string,
  actionPoint: string,
  processFlow: string,
  tagComment: string,
  tagId: string,
): string {
  return wrapMessage('INSERTEEN', [
    ['LOTNAME', lotId],
    ['USERID', userId],
    ['FACILITY', facility],
    ['PRODUCT', product],
    ['OPERATION', operation],
    ['ACTIONPOINT', actionPoint],
    ['PROCESSFLOW', processFlow],
    ['TAGCOMMENT', tagComment],
    ['TAGID', tagId],
  ]);
}
