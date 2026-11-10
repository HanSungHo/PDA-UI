import { ApiError } from 'src/services/api-error';
import {
  body,
  list,
  type ParsedMessage,
  postJsonMessage,
  text,
} from 'src/services/json-message.service';

import type {
  DispatchingResult,
  DispatchingRow,
  GetDispatchRequest,
  SetDispatchRequest,
} from '../types/dispatching.types';

// Android shows ERRMSG verbatim (empty string when absent), so no fallback text here.
function assertPass(response: ParsedMessage, code: string): void {
  if (response.STATUS === 'PASS') return;
  throw new ApiError(response.ERRMSG ?? '', { code });
}

const COLUMN_KEYS = [
  'NUMBER',
  'RESERVE',
  'JOBCODE',
  'LOTNAME',
  'OPREATIONNAME',
  'OPREATIONDESC',
  'QTY',
  'DOPANT',
  'RECIPE',
  'BOXSTATUS',
  'TRANSPORTLOCATION',
  'HOLDCODE',
  'HOLDCOMMENT',
  'QTIME',
  'LOTCLASS',
  'SDD',
  'PRODUCTSPECNAME',
  'CUSTOMERNAME',
  'PROCESSINTIME',
  'REWORKSTATUS',
  'MAVEINMACHINE1',
  'RETILCEKEY',
  'MASKLOCATION',
  'PRNAME',
  'BATCHID',
  'SUBSTN_REPLY',
  'RUNINGMODE',
  'LOTPROCESSSTATE',
  'STARTPOTIME',
  'BATCHLOT',
  'NEXTMACHINE',
  'OPTIMALSTARTTIME',
  'PSTARTTIME',
  'MAINTITEM',
] as const;

function asRow(value: Record<string, unknown>): DispatchingRow {
  const row = Object.fromEntries(
    COLUMN_KEYS.map((key) => [key, text(value, key)]),
  ) as DispatchingRow;
  if (row.REWORKSTATUS) row.REWORKSTATUS = row.REWORKSTATUS === 'InRework' ? 'Y' : 'N';
  return row;
}

// Android RESERVELOT loop: OPREATIONDESC/OPREATIONNAME are overwritten unconditionally.
function asReserveRow(value: Record<string, unknown>): DispatchingRow {
  const row = asRow(value);
  row.OPREATIONDESC = text(value, 'PODESC');
  row.OPREATIONNAME = text(value, 'PROCESSOPERATIONNAME');
  return row;
}

// Android DISPLOT loop: TRANSPORTLOCATION is overwritten unconditionally.
function asDispatchRow(value: Record<string, unknown>): DispatchingRow {
  const row = asRow(value);
  row.TRANSPORTLOCATION = text(value, value.BOXSTATUS === 'INBAY' ? 'BAYNAME' : 'TRANSPORT');
  return row;
}

export async function getDispatch(request: GetDispatchRequest): Promise<DispatchingResult> {
  const response = await postJsonMessage('GETDISPATCH', {
    RESERVE: request.reserve,
    RTD: request.machineName,
    WET: request.wet,
  });
  assertPass(response, 'GETDISPATCH_FAILED');
  const result = body(response);
  const reserveLots = list(result, 'RESERVELOT').map(asReserveRow);
  const dispatchLots = list(result, 'DISPLOT').map(asDispatchRow);
  const hiddenColumns = list(result, 'HIDE')
    .slice(8)
    .flatMap((item, index) =>
      // Android increments startIndex before comparing it to the HIDE index.
      // HIDE[8] therefore maps to the eighth displayed column, DOPANT/GAS.
      text(item, 'HIDEFLAG') === 'Y' ? [COLUMN_KEYS[index + 7] ?? ''] : [],
    )
    .filter(Boolean);
  return { rows: [...reserveLots, ...dispatchLots], hiddenColumns };
}

export async function setDispatch(request: SetDispatchRequest): Promise<void> {
  // Android (trimMargin) builds each item as LF + <ITEM> + LF-separated tags + LF + </ITEM>:
  // a leading line break per item, line breaks between tags, none after </ITEM>.
  const reserveItem = request.items
    .map((item) =>
      (request.reserve === 'Y'
        ? [
            '',
            '<ITEM>',
            `<LOTNAME>${item.LOTNAME}</LOTNAME>`,
            `<PROECSSOPER>${item.OPREATIONNAME}</PROECSSOPER>`,
            `<PROECSSOPERDESC>${item.OPREATIONDESC}</PROECSSOPERDESC>`,
            `<PRODUCT>${item.PRODUCTSPECNAME}</PRODUCT>`,
            '</ITEM>',
          ]
        : [
            '',
            '<ITEM>',
            `<LOTNAME>${item.LOTNAME}</LOTNAME>`,
            `<PROECSSOPER>${item.OPREATIONNAME}</PROECSSOPER>`,
            '</ITEM>',
          ]
      ).join('\n'),
    )
    .join('');
  const response = await postJsonMessage('SETDISPATCH', {
    MACHINE: request.machineName,
    USERID: request.operatorId,
    USERID1: request.operatorName,
    RESERVE: request.reserve,
    RESERVEITEM: reserveItem,
  });
  assertPass(response, 'SETDISPATCH_FAILED');
}
