import { postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import type {
  MachineStatusApiResult,
  MachineStatusAreaBayInfoBody,
  MachineStatusBayEqpInfoBody,
} from '../types/machine-status.types';

async function sendMachineStatusMessage<T>(
  messageName: string,
  fields: readonly [string, string][],
): Promise<MachineStatusApiResult<T>> {
  try {
    const rawData = await postAifMessage(messageName, messageName, fields);
    if (!isResponseSuccessful(rawData)) {
      return { ok: false, message: getResponseErrorMessage(rawData) };
    }
    return { ok: true, data: parseMessageBody(rawData) as unknown as T };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export const machineStatusService = {
  /**
   * Loads BAY list for the selected area.
   * Mirrors `MessageFactoryUtil.areaBayInfo(AREA, FACILITY)` (`MessageName.AREABAYINFO`).
   */
  areaBayInfo(
    area: string,
    facility: string,
  ): Promise<MachineStatusApiResult<MachineStatusAreaBayInfoBody>> {
    return sendMachineStatusMessage<MachineStatusAreaBayInfoBody>('AREABAYINFO', [
      ['AREA', area],
      ['FACILITY', facility],
    ]);
  },

  /**
   * Loads equipment list for the selected BAY.
   * Mirrors `MessageFactoryUtil.bayEQPInfo(bay, facility)` (`MessageName.BAYEQPINFO`).
   */
  bayEqpInfo(
    bay: string,
    facility: string,
  ): Promise<MachineStatusApiResult<MachineStatusBayEqpInfoBody>> {
    return sendMachineStatusMessage<MachineStatusBayEqpInfoBody>('BAYEQPINFO', [
      ['BAYID', bay],
      ['FACILITY', facility],
    ]);
  },
};
