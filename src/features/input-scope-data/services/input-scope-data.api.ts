import { postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import type {
  GetScopeLotInfoResult,
  GetSlotInfoResult,
  InputScopeDataPayload,
  InputScopeDataResult,
} from '~/features/input-scope-data/types/input-scope-data.types';

// Mirrors hifos2 InputScopeDataActivity.kt. GETSCOPELOTINFO and INPUTSCOPEDATA are sent through
// MessageName.MESSAGE ("message"); SLOTINFO has its own route.
const MESSAGE_ROUTE = 'message';
const SLOT_ROUTE = 'slotinfo';

const text = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

// getMessageBodyInValueList(result, "FAULTS", "FAULT"): MSGBODY.FAULTS.FAULT is an array
// (a single entry may arrive as an object).
function faultValues(body: Record<string, unknown>): string[] {
  const faults = body.FAULTS;
  if (!faults || typeof faults !== 'object') return [];
  const list = (faults as { FAULT?: unknown }).FAULT;
  if (list === undefined || list === null) return [];
  return (Array.isArray(list) ? list : [list]).map((item) =>
    text((item as { TYPEVALUE?: unknown }).TYPEVALUE),
  );
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** legacy: MessageFactoryUtil.getScopeLotInfo(lotId) -> MessageName.MESSAGE */
export async function getScopeLotInfoApi(lotId: string): Promise<GetScopeLotInfoResult> {
  try {
    const response = await postAifMessage(MESSAGE_ROUTE, 'GETSCOPELOTINFO', [['LOTID', lotId]]);
    if (!isResponseSuccessful(response)) {
      return { success: false, errorMessage: getResponseErrorMessage(response) };
    }

    const body = parseMessageBody(response) as Record<string, unknown>;
    return {
      success: true,
      data: {
        lotName: text(body.LOTNAME) || lotId,
        factoryName: text(body.FACTORYNAME),
        processOperationName: text(body.PROCESSOPERATIONNAME),
        machineName: text(body.MACHINENAME),
        layerId: text(body.LAYERID),
        isExist: text(body.ISEXIST).toUpperCase() === 'Y',
        faultCategories: faultValues(body),
      },
    };
  } catch (error: unknown) {
    return { success: false, errorMessage: errorText(error) };
  }
}

/** legacy: MessageFactoryUtil.slotInfo(lotId, facility) -> MessageName.SLOTINFO */
export async function getSlotInfoApi(lotId: string, facility = 'FAB1'): Promise<GetSlotInfoResult> {
  try {
    const response = await postAifMessage(SLOT_ROUTE, 'SLOTINFO', [
      ['LOTID', lotId],
      ['FACILITY', facility],
    ]);
    if (!isResponseSuccessful(response)) {
      return { success: false, errorMessage: getResponseErrorMessage(response) };
    }

    return { success: true, waferList: text(parseMessageBody(response).WAFERLIST) };
  } catch (error: unknown) {
    return { success: false, errorMessage: errorText(error) };
  }
}

/** legacy: MessageFactoryUtil.inputScopeData(...) -> MessageName.MESSAGE */
export async function inputScopeDataApi(
  payload: InputScopeDataPayload,
): Promise<InputScopeDataResult> {
  try {
    const response = await postAifMessage(MESSAGE_ROUTE, 'INPUTSCOPEDATA', [
      ['FACTORYNAME', payload.factoryName],
      ['LOTID', payload.lotId],
      ['PROCESSOPERATIONNAME', payload.processOperationName],
      ['MACHINENAME', payload.machineName],
      ['LAYERID', payload.layerId],
      ['SIDERINSE', payload.sideRinse],
      ['WEE', payload.weeWidth],
      ['LOGO', payload.logo],
      ['SLOTLIST', payload.slotList],
      ['FAULTCATEGORY', payload.faultCategory],
      ['INPUTUSER', payload.inputUser],
    ]);
    if (!isResponseSuccessful(response)) {
      return { success: false, errorMessage: getResponseErrorMessage(response) };
    }

    // The legacy Activity always shows this fixed text on success.
    return { success: true, message: '데이터가 저장 되었습니다.' };
  } catch (error: unknown) {
    return { success: false, errorMessage: errorText(error) };
  }
}
