import { postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import type {
  ChangeEqpStatusPayload,
  ChangeEqpStatusResponse,
  CheckChamberResponse,
  CheckNonLotPayload,
  CheckNonLotResponse,
  EqpDownCodeResponse,
  EqpDownCommentResponse,
  EqpStatusResponse,
  MachineStatusDetailApiResult,
} from '../types/machine-status-detail.types';

async function sendMachineStatusMessage<T>(
  messageName: string,
  fields: readonly [string, string][],
): Promise<MachineStatusDetailApiResult<T>> {
  try {
    const rawData = await postAifMessage(messageName, messageName, fields);
    if (!isResponseSuccessful(rawData)) {
      return { ok: false, message: getResponseErrorMessage(rawData) };
    }
    return { ok: true, data: parseMessageBody(rawData) as unknown as T };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : `${messageName} request failed.`,
    };
  }
}

export const machineStatusDetailService = {
  /**
   * Queries equipment status and available status codes.
   * Mirrors `MessageFactoryUtil.eqpStatus(eqpId, facility)` (`MessageName.EQPSTATUS`).
   */
  async eqpStatus(
    eqpId: string,
    facility: string,
  ): Promise<MachineStatusDetailApiResult<EqpStatusResponse>> {
    const fields: Array<[string, string]> = [
      ['FACILITY', facility],
      ['EQPID', eqpId],
    ];
    return sendMachineStatusMessage<EqpStatusResponse>('EQPSTATUS', fields);
  },

  /**
   * Queries down code list for the selected equipment status.
   * Mirrors `MessageFactoryUtil.eqpDownCode(facility, status, eqpId)` (`MessageName.EQPDOWNCODE`).
   */
  async eqpDownCode(
    facility: string,
    status: string,
    eqpId: string,
  ): Promise<MachineStatusDetailApiResult<EqpDownCodeResponse>> {
    const fields: Array<[string, string]> = [
      ['FACILITY', facility],
      ['EQPSTATUSCODE', status],
      ['EQPID', eqpId],
    ];
    return sendMachineStatusMessage<EqpDownCodeResponse>('EQPDOWNCODE', fields);
  },

  /**
   * Queries predefined down comments for the given down code.
   * Mirrors `MessageFactoryUtil.eqpDownComment(facility, downCode)` (`MessageName.EQPDOWNCOMMENT`).
   */
  async eqpDownComment(
    facility: string,
    downCode: string,
  ): Promise<MachineStatusDetailApiResult<EqpDownCommentResponse>> {
    const fields: Array<[string, string]> = [
      ['FACILITY', facility],
      ['DOWNCODE', downCode],
    ];
    return sendMachineStatusMessage<EqpDownCommentResponse>('EQPDOWNCOMMENT', fields);
  },

  /**
   * Checks whether chamber equipment can be batch-changed along with the main equipment.
   * Mirrors `MessageFactoryUtil.checkChamber(facility, eqpId, mainState)` (`MessageName.CHECKCHAMBER`).
   */
  async checkChamber(
    facility: string,
    eqpId: string,
    mainState: string,
  ): Promise<MachineStatusDetailApiResult<CheckChamberResponse>> {
    const fields: Array<[string, string]> = [
      ['FACILITY', facility],
      ['EQPID', eqpId],
      ['MAINSTATE', mainState],
    ];
    return sendMachineStatusMessage<CheckChamberResponse>('CHECKCHAMBER', fields);
  },

  /**
   * Checks non-lot validation rules before changing equipment status.
   * Mirrors `MessageFactoryUtil.checkNonLot(eqpId, facility, finalTime, operatorId, downCode)` (`MessageName.CHECKNONLOT`).
   */
  async checkNonLot(
    payload: CheckNonLotPayload,
  ): Promise<MachineStatusDetailApiResult<CheckNonLotResponse>> {
    const fields: Array<[string, string]> = [
      ['EQPID', payload.eqpId],
      ['FACILITY', payload.facility],
      ['LASTTIME', payload.finalTime],
      ['USERID', payload.operatorId],
      ['EQPSTATUSCODE', payload.downCode],
    ];
    return sendMachineStatusMessage<CheckNonLotResponse>('CHECKNONLOT', fields);
  },

  /**
   * Executes the equipment status change transaction.
   * Mirrors `MessageFactoryUtil.changeEQPStatus(...)` (`MessageName.CHANGEEQPSTATUS`).
   */
  async changeEqpStatus(
    payload: ChangeEqpStatusPayload,
  ): Promise<MachineStatusDetailApiResult<ChangeEqpStatusResponse>> {
    const fields: Array<[string, string]> = [
      ['EQPID', payload.eqpId],
      ['FACILITY', payload.facility],
      ['EQPSTATUSCODE', payload.eqpStatusCode],
      ['EQPDOWNCODE', payload.eqpDownCode],
      ['COMMENT', payload.comment],
      ['LOGINUSERID', payload.operatorId],
      ['LOGINGUSERID1', payload.operatorName],
      ['CHANGECHAMBER', payload.changeChamber],
    ];
    return sendMachineStatusMessage<ChangeEqpStatusResponse>('CHANGEEQPSTATUS', fields);
  },
};
