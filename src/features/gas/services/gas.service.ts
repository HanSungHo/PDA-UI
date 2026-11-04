import { postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import type { GasMessageResponse } from '../types/gas.types';

interface RawMessageResult {
  MSGBODY?: unknown;
}

// Legacy MessageSender.checkValidate: a PASS is only successful when MSGBODY is present and not "".
function parseResponse(data: MessageResponseData): GasMessageResponse {
  try {
    const result = JSON.parse(data.result) as RawMessageResult;
    const isSuccessFul =
      isResponseSuccessful(data) && result.MSGBODY !== undefined && result.MSGBODY !== '';
    const messageBody =
      isSuccessFul && result.MSGBODY && typeof result.MSGBODY === 'object'
        ? (result.MSGBODY as Record<string, unknown>)
        : {};

    return {
      isSuccessFul,
      messageBody,
      errorMessage: isSuccessFul ? '' : getResponseErrorMessage(data),
    };
  } catch {
    return { isSuccessFul: false, messageBody: {}, errorMessage: data.result };
  }
}

export async function GetCabinetInfo(cabinetName: string): Promise<GasMessageResponse> {
  return parseResponse(
    await postAifMessage('GetCabinetInfo', 'GETCABINETINFO', [['CABINETNAME', cabinetName]]),
  );
}

export async function SetGasusage(
  cabinet: string,
  userId: string,
  pressure: string,
  weight: string,
  comment: string,
): Promise<GasMessageResponse> {
  return parseResponse(
    await postAifMessage('SetGasusage', 'SETGASUSAGE', [
      ['CABINETNAME', cabinet],
      ['USERID', userId],
      ['PRESSURE', pressure],
      ['WEIGHT', weight],
      ['COMMENT', comment],
    ]),
  );
}
