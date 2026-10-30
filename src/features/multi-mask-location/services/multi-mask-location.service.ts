import { type AifMessageField, postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import type { MultiMaskInfo, MultiMaskLocationTarget } from '../types/multi-mask-location.types';

export class MultiMaskMessageError extends Error {}

// MultiMaskLocationActivity posts to these MessageName routes. Two of them carry a different
// AIFMSG name than the route, exactly as MessageFactoryUtil builds them.
const ROUTE = {
  maskInfo: 'maskinfo',
  maskStatusInfo: 'maskstatusinfo',
  maskLocGroupInfo: 'masklocgroupinfo',
  checkPellicle: 'checkpellicle',
} as const;

const MISSING_BODY_MESSAGE = 'BODY가 존재하지 않습니다';

async function request(
  route: string,
  messageName: string,
  fields: readonly AifMessageField[],
): Promise<Record<string, unknown>> {
  const response = await postAifMessage(route, messageName, fields);
  if (!isResponseSuccessful(response)) {
    throw new MultiMaskMessageError(getResponseErrorMessage(response));
  }
  // MessageSender.checkValidate: a PASS without MSGBODY is an error.
  const body = parseMessageBody(response);
  if (Object.keys(body).length === 0) throw new MultiMaskMessageError(MISSING_BODY_MESSAGE);
  return body;
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

/** Mirrors ResponseDataToJsonUtil.getMessageBodyList: MSGBODY[listName].ITEM[]. */
function readList(body: Record<string, unknown>, listName: string, field: string): string[] {
  const list: unknown = body[listName];
  const items: unknown = list && typeof list === 'object' && 'ITEM' in list ? list.ITEM : [];
  const rows: unknown[] = Array.isArray(items) ? items : [items];
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) => text(row[field]));
}

export async function fetchMaskStatuses(facility: string): Promise<string[]> {
  const body = await request(ROUTE.maskStatusInfo, 'MASKSTATUSINFO', [['FACILITY', facility]]);
  return readList(body, 'STATUSES', 'STATUS');
}

export async function fetchMaskLocationGroups(
  status: string,
  floor: string,
  facility: string,
): Promise<string[]> {
  const body = await request(ROUTE.maskLocGroupInfo, 'MASKLOCGROUPINFO', [
    ['STATUS', status],
    ['FLOOR', floor],
    ['FACILITY', facility],
  ]);
  return readList(body, 'LOCGROUPS', 'LOCGROUP');
}

/** Android sends MASKLOCATIONINFO through the MASKLOCGROUPINFO route. */
export async function fetchMaskDetailLocations(
  status: string,
  locationGroup: string,
  floor: string,
  facility: string,
): Promise<string[]> {
  const body = await request(ROUTE.maskLocGroupInfo, 'MASKLOCATIONINFO', [
    ['STATUS', status],
    ['LOCGROUP', locationGroup],
    ['FLOOR', floor],
    ['FACILITY', facility],
  ]);
  return readList(body, 'LOCATIONS', 'LOCATION');
}

export async function fetchMaskInfo(reticleId: string, facility: string): Promise<MultiMaskInfo> {
  const body = await request(ROUTE.maskInfo, 'MASKINFO', [
    ['RETICLEID', reticleId],
    ['FACILITY', facility],
  ]);
  return {
    MASKTAG: text(body.RETICLETAG),
    ISUSE: text(body.ISUSE),
    STATUS: text(body.STATUS),
    CURRLOC: text(body.CURRLOC),
    PRODUCT: text(body.PRODUCT),
  };
}

/** Android sends CHANGEMASKLOCATION through the CHECKPELLICLE route with LOCTYPE MULTI. */
export async function changeMaskLocation(
  reticleId: string,
  target: MultiMaskLocationTarget,
  context: { facility: string; operatorId: string },
): Promise<void> {
  await request(ROUTE.checkPellicle, 'CHANGEMASKLOCATION', [
    ['RETICLEID', reticleId],
    ['FACILITY', context.facility],
    ['LOCTYPE', 'MULTI'],
    ['LOCATION', ''],
    ['ETCSTATUS', target.status],
    ['ETCLOCATION', target.location],
    ['ETCDETAILLOC', target.detailLocation],
    ['SUBLOCATION3', ''],
    ['OPERATORID', context.operatorId],
    ['FLOOR', target.floor],
  ]);
}
