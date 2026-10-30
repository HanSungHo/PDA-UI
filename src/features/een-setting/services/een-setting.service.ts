import { type AifMessageField, postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import type {
  DeleteEENRequest,
  DeleteEENResult,
  EENModifyUpdateRequest,
  EENModifyUpdateResult,
  EENSettingItem,
  EENTagOption,
} from '../types/een-setting.types';

// Android MessageSender: GETEENLIST, UPDATEEEN and DELETEEEN go through MessageName.MESSAGE
// (/hifos/message); GETTAGID has its own route (MessageName.GETTAGID).
const MESSAGE_ROUTE = 'message';

type MessageBody = Record<string, unknown>;
type SendResult = { success: true; body: MessageBody } | { success: false; message: string };

async function send(
  route: string,
  messageName: string,
  fields: readonly AifMessageField[],
): Promise<SendResult> {
  try {
    const response: MessageResponseData = await postAifMessage(route, messageName, fields);
    if (!isResponseSuccessful(response)) {
      return { success: false, message: getResponseErrorMessage(response) };
    }
    const parsed = JSON.parse(response.result) as { MSGBODY?: unknown };
    const body = parsed.MSGBODY && typeof parsed.MSGBODY === 'object' ? parsed.MSGBODY : {};
    return { success: true, body: body as MessageBody };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Network error' };
  }
}

function text(row: MessageBody, key: string): string {
  const value = row[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

/** ITEMS.ITEM rows (ResponseDataToJsonUtil.getMessageBodyList); one row may also arrive as an object. */
function listItems(body: MessageBody, key: string): MessageBody[] {
  const container = body[key] as { ITEM?: unknown } | undefined;
  const item = container?.ITEM;
  if (Array.isArray(item)) return item as MessageBody[];
  return item && typeof item === 'object' ? [item as MessageBody] : [];
}

/** EENSettingActivity grid columns (GETEENLIST ITEMS). */
function toEENSettingItem(row: MessageBody, index: number): EENSettingItem {
  const eenId = text(row, 'EENID');
  return {
    id: eenId || `een-row-${index}`,
    eenId,
    processName: text(row, 'PROCESSOPERATIONNAMEDESC'),
    tagComment: text(row, 'TAGCOMMENT'),
    actionPoint: text(row, 'ACTIONPOINT'),
    factoryName: text(row, 'FACTORYNAME'),
    product: text(row, 'PRODUCTSPECNAME'),
    route: text(row, 'PROCESSFLOWNAME'),
    operation: text(row, 'PROCESSOPERATIONNAME'),
    processOperationName: text(row, 'PROCESSOPERATIONNAME'),
    tagId: text(row, 'TAGID'),
    createTime: text(row, 'CREATETIME'),
    createUser: text(row, 'CREATEUSER'),
    confirmUser: text(row, 'CONFIRMUSER'),
    confirmTime: text(row, 'CONFIRMTIME'),
    poDesc: text(row, 'DESCRIPTION'),
  };
}

export interface FetchEENSettingItemsRequest {
  lotId: string;
  facility: string;
}

export type FetchEENSettingItemsResult =
  | { success: true; data: EENSettingItem[] }
  | { success: false; message: string };

/** EENSettingActivity.getEENInfo: MessageFactoryUtil.getEenList(LOTNAME, FACILITY). */
export async function fetchEENSettingItems(
  request: FetchEENSettingItemsRequest,
): Promise<FetchEENSettingItemsResult> {
  const result = await send(MESSAGE_ROUTE, 'GETEENLIST', [
    ['LOTNAME', request.lotId],
    ['FACILITY', request.facility],
  ]);
  if (!result.success) return result;

  return { success: true, data: listItems(result.body, 'ITEMS').map(toEENSettingItem) };
}

export type FetchEENTagOptionsResult =
  | { success: true; data: EENTagOption[] }
  | { success: false; message: string };

/** EENModifyActivity: MessageFactoryUtil.getTagId(FACTORYNAME); TAGLIST rows are "TAGID\tCOMMENT". */
export async function fetchEENTagOptions(facility: string): Promise<FetchEENTagOptionsResult> {
  const result = await send('gettagid', 'GETTAGID', [['FACTORYNAME', facility]]);
  if (!result.success) return result;

  const tagOptions = text(result.body, 'TAGLIST')
    .split(/\r?\n/)
    .map((row) => row.split('\t'))
    .filter(([tagId]) => Boolean(tagId))
    .map(([tagId, tagComment]) => ({ tagId: tagId ?? '', tagComment: tagComment ?? '' }));

  return { success: true, data: tagOptions };
}

/** EENModifyActivity.execute: MessageFactoryUtil.updateEen. */
export async function updateEENModifyItem(
  request: EENModifyUpdateRequest,
): Promise<EENModifyUpdateResult> {
  const result = await send(MESSAGE_ROUTE, 'UPDATEEEN', [
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
  ]);
  return result.success ? { success: true } : result;
}

/** EENDeleteActivity.execute: MessageFactoryUtil.deleteEen. */
export async function deleteEEN(request: DeleteEENRequest): Promise<DeleteEENResult> {
  const result = await send(MESSAGE_ROUTE, 'DELETEEEN', [
    ['LOTNAME', request.lotId],
    ['USERID', request.userId],
    ['FACILITY', request.facility],
    ['PRODUCT', request.product],
    ['OPERATION', request.operation],
    ['ACTIONPOINT', request.actionPoint],
    ['EENID', request.eenId],
    ['PROCESSFLOW', request.route],
    ['TAGCOMMENT', request.comment],
    ['TAGID', request.tagId],
    ['CHANGECAUSE', request.deleteReason],
  ]);
  return result.success ? { success: true } : { success: false, errorMessage: result.message };
}
