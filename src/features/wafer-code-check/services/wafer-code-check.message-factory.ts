import { type AifMessageField, buildAifMessage } from 'src/services/aif-message.service';

function wrapMessage(messageName: string, fields: readonly AifMessageField[]): string {
  return buildAifMessage(messageName, fields);
}

export function getWaferTYpe(lotName: string): string {
  return wrapMessage('GETWAFERTYPE', [['LOTNAME', lotName]]);
}

export function ComPareWaferType(
  lotName: string,
  waferType: string,
  initialBoxName: string,
  comment: string,
  userId: string,
): string {
  return wrapMessage('COMPAREWAFERTYPE', [
    ['LOTNAME', lotName],
    ['WAFERTYPE', waferType],
    ['INITIALBOXNAME', initialBoxName],
    ['COMMENT', comment],
    ['USERID', userId],
  ]);
}
