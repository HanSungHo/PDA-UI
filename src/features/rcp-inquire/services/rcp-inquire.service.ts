import { sendMessage } from 'src/services/message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import type {
  CheckInspectionRequest,
  CheckInspectionResult,
  MetRecipeSearchResult,
  RcpCdItem,
  RcpItem,
  RcpMaskItem,
  RcpOvItem,
  RcpViItem,
} from '../types/rcp-inquire.types';

function readArray<TItem>(value: unknown): TItem[] {
  return Array.isArray(value) ? (value as TItem[]) : [];
}

export async function metRecipeSearch(
  lotId: string,
  facility: string,
): Promise<MetRecipeSearchResult> {
  const response = await sendMessage('METRECIPESEARCH', {
    LOTID: lotId,
    FACILITY: facility,
  });

  if (!isResponseSuccessful(response)) {
    return { ok: false, message: getResponseErrorMessage(response) };
  }

  const messageBody = parseMessageBody(response);

  return {
    ok: true,
    data: {
      productSpecName: messageBody.PRODUCTSPECNAME ?? '',
      processOperationName: messageBody.PROCESSOPERATIONNAME ?? '',
      operationDescription: messageBody.OPERATIONDESCRIPTION ?? '',
      category: messageBody.CATEGORY ?? '',
      rcpCdItems: readArray<RcpCdItem>(messageBody.RCPCDITEMS),
      rcpOvItems: readArray<RcpOvItem>(messageBody.RCPOVITEMS),
      rcpViItems: readArray<RcpViItem>(messageBody.RCPVIITEMS),
      maskItems: readArray<RcpMaskItem>(messageBody.MASKITEMS),
      rcpItems: readArray<RcpItem>(messageBody.RCPITEMS),
    },
  };
}

export async function checkinspection(
  request: CheckInspectionRequest,
): Promise<CheckInspectionResult> {
  const response = await sendMessage('CHECKINSPACTION', {
    LOTID: request.lotId,
    FACILITY: request.facility,
    TYPE: request.type,
    AFOPERM: request.mOper,
    AFOPERS: request.sOper,
  });

  if (!isResponseSuccessful(response)) {
    return { ok: false, message: getResponseErrorMessage(response) };
  }

  const messageBody = parseMessageBody(response);

  return {
    ok: true,
    data: {
      macroMsg: messageBody.MACROMSG ?? '',
      scopeMsg: messageBody.SCOPEMSG ?? '',
      cdMsg: messageBody.CDMSG ?? '',
      ovMsg: messageBody.sOvMSG ?? '',
      sampleViMsg: messageBody.sSampleViMSG ?? '',
      sampleCdMsg: messageBody.sSampleCdMSG ?? '',
      sampleOvMsg: messageBody.sSampleOvMSG ?? '',
    },
  };
}
