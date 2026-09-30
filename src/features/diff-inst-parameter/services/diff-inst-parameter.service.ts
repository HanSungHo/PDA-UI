import apiClient from 'src/services/api-client';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import type {
  DiffEqpDataInfoResult,
  DiffParameterListRequest,
  DiffParameterListResult,
  InsertParameterRequest,
  InsertParameterResult,
} from '../types/diff-inst-parameter.types';

async function postMessage(messageName: string, payload: Record<string, string>) {
  const response = await apiClient.post<MessageResponseData>('/message/send', {
    messageName,
    payload,
  });

  return response.data;
}

export async function fetchDiffEqpDataInfo(lotId: string): Promise<DiffEqpDataInfoResult> {
  if (!lotId.trim()) {
    return { ok: false, message: 'LOT을 입력하세요.' };
  }

  const response = await postMessage('DIFFEQPDATAINFO', { LOTID: lotId });

  if (!isResponseSuccessful(response)) {
    return { ok: false, message: getResponseErrorMessage(response) };
  }

  const messageBody = parseMessageBody(response);

  return {
    ok: true,
    data: {
      lotProcessState: messageBody.LOTPROCESSSTATE ?? '',
      batchId: messageBody.BATCHID ?? '',
      machineName: messageBody.MACHINENAME ?? '',
      processOperationName: messageBody.PROCESSOPERATIONNAME ?? '',
      reUpdate: messageBody.REUPDATE ?? '',
    },
  };
}

export async function fetchEqpParameters(
  request: DiffParameterListRequest,
): Promise<DiffParameterListResult> {
  const response = await postMessage('GETEQPPARA', {
    MACHINE: request.machineName,
    FACILITY: request.facility,
  });

  if (!isResponseSuccessful(response)) {
    return { ok: false, message: getResponseErrorMessage(response) };
  }

  const messageBody = parseMessageBody(response) as unknown as {
    GETDATE?: string;
    EQPDATA?: Array<{
      NO?: string;
      TITLEPARAMETER?: string;
      MIN?: string;
      MAX?: string;
      DATA?: string;
    }>;
  };

  return {
    ok: true,
    getDate: messageBody.GETDATE ?? '',
    items: (messageBody.EQPDATA ?? []).map((item) => ({
      no: item.NO ?? '',
      para: item.TITLEPARAMETER ?? '',
      min: item.MIN ?? '',
      max: item.MAX ?? '',
      data: item.DATA ?? '',
    })),
  };
}

export async function insertParameter(
  request: InsertParameterRequest,
): Promise<InsertParameterResult> {
  const response = await postMessage('INSERTPARA', {
    USERID: request.userId,
    BATCHID: request.batchId,
    MACHINENAME: request.machineName,
    FACILITY: request.facility,
    EQPPARA: request.eqpPara,
    EQPPARANO: request.eqpParaNo,
    EQPPARAMAX: request.eqpParaMax,
  });

  if (!isResponseSuccessful(response)) {
    return { ok: false, message: getResponseErrorMessage(response) };
  }

  const messageBody = parseMessageBody(response);

  return { ok: true, machineState: messageBody.MACHIHNESTATE ?? '' };
}
