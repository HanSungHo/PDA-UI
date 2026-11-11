import { postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import type {
  WetAutoApi,
  WetAutoApiResult,
  WetAutoBayRequest,
  WetAutoBayResponse,
  WetAutoEquipmentRequest,
  WetAutoEquipmentResponse,
  WetAutoLotRequest,
  WetAutoLotResponse,
  WetAutoRecipeRequest,
  WetAutoRecipeResponse,
  WetAutoStartRequest,
  WetAutoStockerRequest,
  WetAutoStockerResponse,
} from '../types/wet-auto.types';

const MISSING_BODY_MESSAGE = 'BODY가 존재하지 않습니다';

/**
 * Android MessageSender.checkValidate: only a MSGBODY that is the empty string is a failure.
 * Any object body (including `{}`) is a success; everything else is the shared AIF handling.
 */
function hasEmptyStringBody(response: MessageResponseData): boolean {
  const result = JSON.parse(response.result) as Record<string, unknown>;
  return result.MSGBODY === '';
}

async function postMessage<T>(
  messageName: string,
  fields: Array<[string, string]>,
): Promise<WetAutoApiResult<T>> {
  try {
    const response = await postAifMessage(messageName, messageName, fields);
    if (!isResponseSuccessful(response)) {
      return { ok: false, message: getResponseErrorMessage(response) };
    }
    if (hasEmptyStringBody(response)) return { ok: false, message: MISSING_BODY_MESSAGE };

    return { ok: true, data: parseMessageBody(response) as T };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : `${messageName} request failed.`,
    };
  }
}

function postCommand(
  messageName: string,
  fields: Array<[string, string]>,
): Promise<WetAutoApiResult<null>> {
  return postMessage<Record<string, string>>(messageName, fields).then((result) =>
    result.ok ? { ok: true, data: null } : result,
  );
}

export const wetAutoApi: WetAutoApi = {
  fetchEquipment(request: WetAutoEquipmentRequest) {
    return postMessage<WetAutoEquipmentResponse>('WETREMOTEEQPINFO', [['EQPID', request.EQPID]]);
  },
  fetchLot(request: WetAutoLotRequest) {
    return postMessage<WetAutoLotResponse>('LOTINFO', [
      ['TYPE', request.TYPE],
      ['LOTID', request.LOTID],
      ['FACILITY', request.FACILITY],
    ]);
  },
  fetchRecipe(request: WetAutoRecipeRequest) {
    return postMessage<WetAutoRecipeResponse>('RECIPEINFO', [
      ['ISPHOTO', request.ISPHOTO],
      ['LOTID', request.LOTID],
      ['OPERATION', request.OPERATION],
      ['SUBOPERATION', request.SUBOPERATION],
      ['PRODUCT', request.PRODUCT],
      ['EQPID', request.EQPID],
      ['OPTYPE', request.OPTYPE],
      ['FACILITY', request.FACILITY],
    ]);
  },
  fetchBays(request: WetAutoBayRequest) {
    return postMessage<WetAutoBayResponse>('AREABAYINFO', [['FACILITY', request.FACILITY]]);
  },
  fetchStockers(request: WetAutoStockerRequest) {
    return postMessage<WetAutoStockerResponse>('BAYSTOCKERINFO', [
      ['BAY', request.BAY],
      ['FACILITY', request.FACILITY],
    ]);
  },
  start(request: WetAutoStartRequest) {
    return postCommand('WETREMOTESTART', [
      ['MACHINENAME', request.MACHINENAME],
      ['MACHINENAME2', request.MACHINENAME2],
      ['MACHINETYPE', request.MACHINETYPE],
      ['AREANAME', request.AREANAME],
      ['NUMCASS', request.NUMCASS],
      ['LOTNAME', request.LOTNAME],
      ['LOTNAME2', request.LOTNAME2],
      ['RECIPENAME', request.RECIPENAME],
      ['JOBNAME', request.JOBNAME],
      ['PRODUCTQTY', request.PRODUCTQTY],
      ['PRODUCTQTY2', request.PRODUCTQTY2],
      ['OPERATION', request.OPERATION],
      ['OPERATION2', request.OPERATION2],
      ['EVENTUSER', request.EVENTUSER],
      ['ISCARRAY', request.ISCARRAY],
      ['BAY', request.BAY],
      ['STOCKER', request.STOCKER],
    ]);
  },
};
