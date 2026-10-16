import { postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import type {
  ApiResponse,
  EtchCommRcpRequest,
  EtchCommRcpResponseBody,
  EtchRcpDownloadRequest,
  RemoteEtchApi,
} from '../types/remoteEtchCommRcp.types';

async function postMessage<T>(
  endpointName: string,
  messageName: string,
  fields: Array<[string, string]>,
): Promise<ApiResponse<T>> {
  try {
    const response = await postAifMessage(endpointName, messageName, fields);
    if (!isResponseSuccessful(response)) {
      return {
        isSuccessFul: false,
        result: {} as T,
        errorMessage: getResponseErrorMessage(response),
      };
    }

    return { isSuccessFul: true, result: parseMessageBody(response) as T };
  } catch (error) {
    return {
      isSuccessFul: false,
      result: {} as T,
      errorMessage: error instanceof Error ? error.message : 'Server connection error',
    };
  }
}

export const remoteCvdEtchRcpApi: RemoteEtchApi = {
  getEtchCommRcp(request: EtchCommRcpRequest) {
    return postMessage<EtchCommRcpResponseBody>('etchcommrcp', 'ETCH_COMMRCP', [
      ['LOTID', request.lotId],
      ['RCP', request.recipe],
      ['EQP', request.eqpId],
      ['PROCESSOPERATIONNAME', request.operId],
      ['OPERATIONDESCRIPTION', request.operDesc],
    ]);
  },
  downloadRecipe(request: EtchRcpDownloadRequest) {
    return postMessage<{ CHK: string }>('etchrcpdownload', 'ETCH_RCP_DOWNLOAD', [
      ['LOTID', request.lotId],
      ['RCP', request.recipe],
      ['EQP', request.eqpId],
      ['USERID', request.operatorId],
      ['CHM', request.chamber],
      ['PARAMETER', request.rmsPara],
      ['DOWN_VALUE', request.downValue],
      ['STEP', request.step],
    ]);
  },
};
