import { assertPass, body, list, postJsonMessage, text } from 'src/services/json-message.service';

import type {
  DispatchingResult,
  DispatchingRow,
  GetDispatchRequest,
  SetDispatchRequest,
} from '../types/dispatching.types';

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
  row.OPREATIONDESC ||= text(value, 'PODESC');
  row.OPREATIONNAME ||= text(value, 'PROCESSOPERATIONNAME');
  if (row.BOXSTATUS === 'INBAY') row.TRANSPORTLOCATION = text(value, 'BAYNAME');
  else row.TRANSPORTLOCATION ||= text(value, 'TRANSPORT');
  if (row.REWORKSTATUS) row.REWORKSTATUS = row.REWORKSTATUS === 'InRework' ? 'Y' : 'N';
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
  const reserveLots = list(result, 'RESERVELOT').map(asRow);
  const dispatchLots = list(result, 'DISPLOT').map(asRow);
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
  const reserveItem = request.items
    .map((item) =>
      request.reserve === 'Y'
        ? `<ITEM><LOTNAME>${item.LOTNAME}</LOTNAME><PROECSSOPER>${item.OPREATIONNAME}</PROECSSOPER><PROECSSOPERDESC>${item.OPREATIONDESC}</PROECSSOPERDESC><PRODUCT>${item.PRODUCTSPECNAME}</PRODUCT></ITEM>`
        : `<ITEM><LOTNAME>${item.LOTNAME}</LOTNAME><PROECSSOPER>${item.OPREATIONNAME}</PROECSSOPER></ITEM>`,
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
