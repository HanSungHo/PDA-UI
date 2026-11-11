import { postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import type {
  EtchInspectionExecutionRequest,
  EtchInspectionExecutionResponse,
  EtchInspectionInfo,
  EtchInspectionSearchResponse,
} from '../types/etch-inspection.types';

// Mirrors hifos2 EtchInspectionActivity: MessageFactoryUtil.EtchInspectionInfo("S", lotId) sent to
// MessageName.ETCHINSPINFO ("EtchInspectionInfo") and EtchInspectionexecution(...) sent to
// MessageName.ETCHINSPEXCUTION ("EtchInspectionexecution"). The AIFMSG names keep the legacy spelling.
const SEARCH_ROUTE = 'EtchInspectionInfo';
const EXECUTION_ROUTE = 'EtchInspectionexecution';

const INFO_KEYS: readonly (keyof EtchInspectionInfo)[] = [
  'OLDPROCESSOPERATIONNAME',
  'OLDOPERATIONDESCRIPTION',
  'OLDMACHINENAME',
  'NOWPROCESSOPERATIONNAME',
  'NOWOPERATIONDESCRIPTION',
  'INSPDATE',
  'PRODUCTSPECNAME',
];

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function searchData(lotId: string): Promise<EtchInspectionSearchResponse> {
  try {
    const response = await postAifMessage(SEARCH_ROUTE, 'ETCHINSPINFO', [
      ['TYPE', 'S'],
      ['LOTID', lotId],
    ]);

    if (!isResponseSuccessful(response)) {
      return { success: false, data: null, errorMessage: getResponseErrorMessage(response) };
    }

    // optString semantics: a missing key reads as an empty string.
    const body = parseMessageBody(response);
    const data = Object.fromEntries(
      INFO_KEYS.map((key) => [key, String(body[key] ?? '')]),
    ) as unknown as EtchInspectionInfo;

    return { success: true, data, errorMessage: '' };
  } catch (error: unknown) {
    return { success: false, data: null, errorMessage: errorText(error) };
  }
}

export async function execution(
  payload: EtchInspectionExecutionRequest,
): Promise<EtchInspectionExecutionResponse> {
  try {
    const response = await postAifMessage(EXECUTION_ROUTE, 'ETCHINSPEXCUTION', [
      ['FACILITY', payload.facility],
      ['LOTNAME', payload.lotId],
      ['PRODUCTSPEC', payload.product],
      ['MACHINE', payload.oldMachine],
      ['OPERATION', payload.oldOperation],
      ['OPERATIONDESC', payload.oldOperationDesc],
      ['USERID', payload.operatorId],
      ['COMMENT', payload.comment],
    ]);

    return isResponseSuccessful(response)
      ? { success: true, errorMessage: '' }
      : { success: false, errorMessage: getResponseErrorMessage(response) };
  } catch (error: unknown) {
    return { success: false, errorMessage: errorText(error) };
  }
}
