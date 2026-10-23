import { postAifMessage } from 'src/services/aif-message.service';
import { ApiError } from 'src/services/api-error';
import { text } from 'src/services/json-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
} from 'src/services/message-response.helper';

import type {
  CandidateLot,
  ExecuteRequest,
  LotInfo,
  MergeLot,
  MergeResult,
  ParentLot,
} from '../types/auto-merge.types';

const candidateKeys = [
  'LOTNAME',
  'MAINLOTNAME',
  'PRODUCTSPECNAME',
  'PROCESSFLOWNAME',
  'PROCESSOPERATIONNAME',
  'DESCRIPTION',
] as const;
const mergeKeys = [
  'LOTNAME',
  'PRODUCTQUANTITY',
  'PRODUCTSPECNAME',
  'PROCESSFLOWNAME',
  'PROCESSOPERATIONNAME',
  'OPERATIONDESCRIPTION',
  'LOTSTATE',
] as const;
const parentKeys = [
  'PARENTLOTNAME',
  'PARENTQTY',
  'PARENTPRODUCTSPECNAME',
  'PARENTPROCESSFLOWNAME',
  'PARENTOPERATION',
  'PARENTDESCRIPTION',
] as const;

function pick<T>(source: Record<string, unknown>, keys: readonly string[]): T {
  return Object.fromEntries(keys.map((key) => [key, text(source, key)])) as T;
}

function items(body: Record<string, unknown>): Record<string, unknown>[] {
  const container = body.ITEMS as { ITEM?: unknown } | undefined;
  return Array.isArray(container?.ITEM) ? container.ITEM : [];
}

async function send(name: string, fields: readonly (readonly [string, string])[]) {
  const response = await postAifMessage('message', name, fields);
  if (!isResponseSuccessful(response))
    throw new ApiError(getResponseErrorMessage(response), { code: name });
  const parsed = JSON.parse(response.result) as { MSGBODY?: Record<string, unknown> };
  if (!parsed.MSGBODY || typeof parsed.MSGBODY !== 'object') {
    throw new ApiError('BODY가 존재하지 않습니다', { code: name });
  }
  return parsed.MSGBODY;
}

export async function getAutoMergeLot(facility: string, lotId: string): Promise<CandidateLot[]> {
  const body = await send('GETAUTOMERGELOT', [
    ['FACILITY', facility],
    ['LOTID', lotId],
  ]);
  return items(body).map((row) => pick<CandidateLot>(row, candidateKeys));
}

export async function getAutoMergeLot2(
  lotId: string,
  parentLotId: string,
  lotList: string,
): Promise<LotInfo> {
  const body = await send('GETAUTOMERGELOT2', [
    ['LOTID', lotId],
    ['PARENTLOTID', parentLotId],
    ['LOTLIST', lotList],
  ]);
  return {
    ...pick<ParentLot>(body, parentKeys),
    ITEMS: items(body).map((row) => pick<MergeLot>(row, mergeKeys)),
  };
}

export async function executeAutoMergeLot(request: ExecuteRequest): Promise<MergeResult> {
  const body = await send('EXECUTEAUTOMERGE', Object.entries(request));
  return pick<MergeResult>(body, ['FAILLOTNAME', 'SUCCESS']);
}
