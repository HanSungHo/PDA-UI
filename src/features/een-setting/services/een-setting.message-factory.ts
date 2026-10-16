function wrapMessage(
  messageName: string,
  fields: Array<[string, string]>,
  receiver: string,
  sender: string,
): string {
  const body = fields.map(([name, value]) => `<${name}>${value}</${name}>`).join('\n');

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

export function getTagId(facility: string, receiver: string, sender: string): string {
  return wrapMessage('GETTAGID', [['FACTORYNAME', facility]], receiver, sender);
}

export interface UpdateEenMessageInput {
  lotId: string;
  userId: string;
  facility: string;
  product: string;
  operation: string;
  actionPoint: string;
  eenId: string;
  processFlow: string;
  tagComment: string;
  tagId: string | null;
  oldTagComment: string;
  changeCause: string;
}

export function updateEen(
  request: UpdateEenMessageInput,
  receiver: string,
  sender: string,
): string {
  return wrapMessage(
    'UPDATEEEN',
    [
      ['LOTNAME', request.lotId],
      ['USERID', request.userId],
      ['FACILITY', request.facility],
      ['PRODUCT', request.product],
      ['OPERATION', request.operation],
      ['ACTIONPOINT', request.actionPoint],
      ['EENID', request.eenId],
      ['PROCESSFLOW', request.processFlow],
      ['TAGCOMMENT', request.tagComment],
      ['TAGID', request.tagId ?? 'null'],
      ['OLDTAGCOMMENT', request.oldTagComment],
      ['CHANGECAUSE', request.changeCause],
    ],
    receiver,
    sender,
  );
}
