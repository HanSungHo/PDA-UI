import { type AifMessageField, postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import type {
  ComparePrInfoRequest,
  CurrentPrInfoRequest,
  PrChangeRequest,
  PrChangeServiceResult,
  PrInfoRequest,
  PumpStatusRequest,
} from '../types/pr-change.types';

/** Mirrors legacy MessageSender.send: transport errors are reported as an unsuccessful message. */
async function send(
  endpointName: string,
  messageName: string,
  fields: readonly AifMessageField[],
): Promise<PrChangeServiceResult> {
  try {
    const response = await postAifMessage(endpointName, messageName, fields);
    if (!isResponseSuccessful(response)) {
      return {
        isSuccessFul: false,
        messageBody: {},
        errorMessage: getResponseErrorMessage(response),
      };
    }
    return { isSuccessFul: true, messageBody: parseMessageBody(response), errorMessage: '' };
  } catch (error) {
    return {
      isSuccessFul: false,
      messageBody: {},
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

export const prChangeService = {
  /** MessageFactoryUtil.pumpStatus */
  pumpStatus({ pumpId }: PumpStatusRequest): Promise<PrChangeServiceResult> {
    return send('PUMPSTATUS', 'PUMPSTATUS', [['PUMPID', pumpId]]);
  },

  /** MessageFactoryUtil.currentPrInfo */
  currentPrInfo(request: CurrentPrInfoRequest): Promise<PrChangeServiceResult> {
    return send('CURRENTPRINFO', 'CURRENTPRINFO', [
      ['EQPID', request.eqpId],
      ['PUMPNAME', request.pumpName],
      ['PRID', request.prId],
      ['PRLOT', request.prLot],
      ['VISCOSITY', request.viscosity],
    ]);
  },

  /** MessageFactoryUtil.prInfo */
  prInfo(request: PrInfoRequest): Promise<PrChangeServiceResult> {
    return send('PRINFO', 'PRINFO', [
      ['EQPID', request.eqpId],
      ['PUMPNAME', request.pumpName],
      ['PRID', request.prId],
      ['PRLOT', request.prLot],
      ['VISCOSITY', request.viscosity],
      ['VALIDDATE', request.validate],
    ]);
  },

  /** MessageFactoryUtil.comparePrInfo */
  comparePrInfo(request: ComparePrInfoRequest): Promise<PrChangeServiceResult> {
    return send('COMPAREPRINFO', 'COMPAREPRINFO', [
      ['EQPID', request.eqpId],
      ['PUMPNAME', request.pumpName],
      ['PRID', request.prId],
      ['PRLOT', request.prLot],
      ['VISCOSITY', request.viscosity],
      ['TIME', request.time],
      ['BANJANGID', request.banJangId],
    ]);
  },

  /** MessageFactoryUtil.prChange; legacy posts the PRCHANGE message to the currentprinfo endpoint. */
  prChange(request: PrChangeRequest): Promise<PrChangeServiceResult> {
    return send('CURRENTPRINFO', 'PRCHANGE', [
      ['EQPID', request.eqpId],
      ['PUMPNAME', request.pumpName],
      ['PRID', request.prId],
      ['PRDESC', request.prDesc],
      ['PRCOMP', request.prComp],
      ['VISCOSITY', request.viscosity],
      ['PRLOT', request.prLot],
      ['VALIDTIME', request.validateTime],
      ['USERID', request.userId],
      ['USERNAME', request.userName],
      ['LEAK', request.leak],
      ['INDATE', request.inDate],
    ]);
  },
};
