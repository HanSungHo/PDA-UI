import { postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import type {
  RemoteCvdApi,
  RemoteCvdRecipeRequest,
  RemoteCvdResponse,
  RemoteCvdRestartRequest,
  RemoteCvdStartRequest,
} from '../types/remote-cvd.types';

async function postMessage(
  messageName: string,
  fields: Array<[string, string]>,
): Promise<RemoteCvdResponse> {
  try {
    const response = await postAifMessage(messageName, messageName, fields);
    if (!isResponseSuccessful(response)) {
      return {
        isSuccess: false,
        messageBody: {},
        errorMessage: getResponseErrorMessage(response),
      };
    }

    return {
      isSuccess: true,
      messageBody: parseMessageBody(response),
      errorMessage: '',
    };
  } catch (error) {
    return {
      isSuccess: false,
      messageBody: {},
      errorMessage: error instanceof Error ? error.message : `${messageName} request failed.`,
    };
  }
}

export const remoteCvdApi: RemoteCvdApi = {
  lotInfo(type, lotId, facility) {
    return postMessage('LOTINFO', [
      ['TYPE', type],
      ['LOTID', lotId],
      ['FACILITY', facility],
    ]);
  },
  remoteEqpInfo(equipmentId) {
    return postMessage('REMOTEEQPINFO', [['EQPID', equipmentId]]);
  },
  recipeInfo(request: RemoteCvdRecipeRequest) {
    return postMessage('RECIPEINFO', [
      ['ISPHOTO', request.isPhoto],
      ['LOTID', request.lotId],
      ['OPERATION', request.operation],
      ['SUBOPERATION', request.subOperation],
      ['PRODUCT', request.product],
      ['EQPID', request.equipmentId],
      ['OPTYPE', request.operationType],
      ['FACILITY', request.facility],
    ]);
  },
  teRcpSelection(equipmentId, lotId) {
    return postMessage('TERCPSELECTION', [
      ['EQPID', equipmentId],
      ['LOTID', lotId],
    ]);
  },
  machinePortStatus(equipmentId, portName, lotId, recipe) {
    return postMessage('MACHINEPORTSTATUS', [
      ['EQPID', equipmentId],
      ['PORTNAME', portName],
      ['LOTID', lotId],
      ['RECIPE', recipe],
    ]);
  },
  memorization(
    equipmentId,
    recipe,
    lotId,
    portName,
    chamberEquipmentId,
    operatorId,
    equipmentType,
  ) {
    return postMessage('MEMORIZATION', [
      ['EQPID', equipmentId],
      ['RECIPE', recipe],
      ['LOTID', lotId],
      ['PORTNAME', portName],
      ['CH_EQPID', chamberEquipmentId],
      ['USER_ID', operatorId],
      ['EQP_TYPE', equipmentType],
    ]);
  },
  machinePortClear(machineName, portName) {
    return postMessage('MACHINEPORTCLEAR', [
      ['MACHINENAME', machineName],
      ['PORTNAME', portName],
    ]);
  },
  doorOpen(machineName, portName, areaName, machineType) {
    return postMessage('DOOROPEN', [
      ['MACHINENAME', machineName],
      ['PORTNAME', portName],
      ['AREANAME', areaName],
      ['MACHINETYPE', machineType],
    ]);
  },
  remoteInterlockCheck(lotId, operation, subOperation, equipmentId, recipe) {
    return postMessage('REMOTEINTLKCHECK', [
      ['LOTID', lotId],
      ['OPERATION', operation],
      ['SUBOPERATION', subOperation],
      ['EQPID', equipmentId],
      ['RECIPE', recipe],
    ]);
  },
  remoteStart(request: RemoteCvdStartRequest) {
    return postMessage('REMOTESTART', [
      ['MACHINENAME', request.machineName],
      ['MACHINENAME2', request.machineName2],
      ['MACHINETYPE', request.machineType],
      ['AREANAME', request.areaName],
      ['LOTNAME', request.lotName],
      ['PORTNAME', request.portName],
      ['RECIPENAME', request.recipeName],
      ['PRODUCTQTY', request.productQty],
      ['OPERATION', request.operation],
      ['JOBCODE', request.jobCode],
      ['PRODUCTNAME', request.productName],
      ['EVENTUSER', request.eventUser],
      ['PRECEDE_FLAG', request.precedeFlag],
      ['Q_TIME_HOLD', request.qTimeHold],
    ]);
  },
  remoteRestart(request: RemoteCvdRestartRequest) {
    return postMessage('REMOTERESTART', [
      ['MACHINENAME', request.machineName],
      ['MACHINENAME2', request.machineName2],
      ['MACHINETYPE', request.machineType],
      ['AREANAME', request.areaName],
      ['LOTNAME', request.lotName],
      ['PORTNAME', request.portName],
      ['RECIPENAME', request.recipeName],
      ['PRODUCTQTY', request.productQty],
      ['OPERATION', request.operation],
      ['JOBCODE', request.jobCode],
      ['PRODUCTNAME', request.productName],
      ['EVENTUSER', request.eventUser],
      ['PRECEDE_FLAG', request.precedeFlag],
    ]);
  },
};
