import type { ESheetEdcRequest } from '../types/esheet-edc.types';

export function getEdcDataMessage(request: ESheetEdcRequest): string {
  return [
    '<AIFMSG>',
    '<MSGNAME>GETEDCDATA</MSGNAME>',
    `<RECEIVER>${request.mobileServerName}</RECEIVER>`,
    `<SENDER>${request.deviceName}</SENDER>`,
    '<MSGTYPE>P</MSGTYPE>',
    '<WITHREPLY>YES</WITHREPLY>',
    '<STATUS></STATUS>',
    '<ERRMSG></ERRMSG>',
    '<TID></TID>',
    '<MSGBODY>',
    `<LOTID>${request.lotId}</LOTID>`,
    `<FACILITY>${request.facility}</FACILITY>`,
    `<OPERATION>${request.operation}</OPERATION>`,
    `<SUBOPERATION>${request.subOperation}</SUBOPERATION>`,
    `<OPERATIONDESC>${request.processStep}</OPERATIONDESC>`,
    `<RECIPE>${request.recipe}</RECIPE>`,
    '</MSGBODY>',
    '</AIFMSG>',
  ].join('\n');
}
