import { postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import type { InFactoryRecord, InFactoryResult, LotInfoResult } from 'src/types/backup-bay.types';

// Mirrors hifos2 BackupBayDialogActivity.kt: every message is sent through MessageName.MESSAGE and
// answered with the JSON MSGBODY (lists live under FABS.ITEM).
const MESSAGE_ROUTE = 'message';

const text = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

async function send(
  name: string,
  fields: [string, string][],
  fallback: string,
): Promise<Record<string, unknown>> {
  const response = await postAifMessage(MESSAGE_ROUTE, name, fields);
  if (!isResponseSuccessful(response)) {
    // legacy: OkDialog.show(ERROR, ResponseDataToJsonUtil.getErrorMessage(result))
    throw new Error(getResponseErrorMessage(response) || fallback);
  }
  return parseMessageBody(response);
}

function fabsItems(body: Record<string, unknown>): Record<string, unknown>[] {
  const fabs = body.FABS;
  if (!fabs || typeof fabs !== 'object') return [];
  const items = (fabs as { ITEM?: unknown }).ITEM;
  if (items === undefined || items === null) return [];
  return (Array.isArray(items) ? items : [items]) as Record<string, unknown>[];
}

/** GETFLOORDATA: floor list */
export async function getFloorDataApi(): Promise<string[]> {
  const body = await send('GETFLOORDATA', [], 'GETFLOORDATA failed.');
  return fabsItems(body).map((item) => text(item.FLOOR));
}

/** GETBAYDATA (FLOOR): bay list by floor */
export async function getBayDataApi(floor: string): Promise<string[]> {
  const body = await send('GETBAYDATA', [['FLOOR', floor]], 'GETBAYDATA failed.');
  return fabsItems(body).map((item) => text(item.AREANAME));
}

/** GETPROCESSFACTORYLOT (LOTID): look up the LOT and its interlock states */
export async function getProcessFactoryLotApi(lotId: string): Promise<LotInfoResult> {
  const normalizedLot = lotId.trim().toUpperCase();
  const body = await send(
    'GETPROCESSFACTORYLOT',
    [['LOTID', normalizedLot]],
    'GETPROCESSFACTORYLOT failed.',
  );

  return {
    lotId: normalizedLot,
    lotProcessState: text(body.LOTPROCESSSTATE),
    lotHoldState: text(body.LOTHOLDSTATE),
    lotState: text(body.LOTSTATE),
    jobCode: text(body.JOBCODE),
    productQuantity: text(body.PRODUCTQUANTITY),
    operationDescription: text(body.OPERATIONDESCRIPTION),
  };
}

/** INFACTORY: CHANGEFACTORY0..6 = "LOT|BAY|OPERATOR" (empty for unused rows) */
export async function sendInFactoryApi(
  records: InFactoryRecord[],
  operatorId = 'OP10023',
): Promise<InFactoryResult> {
  const fields: [string, string][] = Array.from({ length: 7 }, (_unused, index) => {
    const record = records[index];
    const value = record?.lotId && record.bay ? `${record.lotId}|${record.bay}|${operatorId}` : '';
    return [`CHANGEFACTORY${index}`, value];
  });

  const body = await send('INFACTORY', fields, 'INFACTORY failed.');
  const count = parseInt(text(body.SUCCESSLOT), 10) || 0;

  return {
    success: count > 0,
    successCount: count,
    message: `${count} LOTs were completed.`,
  };
}
