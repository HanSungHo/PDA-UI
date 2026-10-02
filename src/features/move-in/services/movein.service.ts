import { createMoveInMockResponse } from '../mocks/move-in.mock';
import * as messageFactory from './message-factory';

async function postMessage(messageName: string, sMsg: string) {
  await Promise.resolve();
  return createMoveInMockResponse(messageName, sMsg);
}

export async function sendLotInfo(lotId: string, facility: string, type: string, userId: string) {
  const sMsg = messageFactory.lotInfo(lotId, facility, type, userId);

  return postMessage('lotinfo', sMsg);
}

export async function sendMoveIn(
  lotId: string,
  facility: string,
  recipe: string,
  eqpId: string,
  operation: string,
  subOperation: string,
  isSkip: string,
  operatorId: string,
  isExposure: string,
  identCode: string,
  reticleId: string,
  quantity: string,
  comment: string,
  reworkSkip: string,
) {
  const sMsg = messageFactory.moveIn(
    lotId,
    facility,
    recipe,
    eqpId,
    operation,
    subOperation,
    isSkip,
    operatorId,
    isExposure,
    identCode,
    reticleId,
    quantity,
    comment,
    reworkSkip,
  );

  return postMessage('movein', sMsg);
}

export async function sendMcfdcEqpInfo(eqpId: string) {
  const sMsg = messageFactory.mcFdcEqpInfo(eqpId);

  return postMessage('mcfdceqpinfo', sMsg);
}

export async function sendEqpInfo(eqpId: string, moveIn: string, lotId: string) {
  const sMsg = messageFactory.eqpInfo(eqpId, moveIn, lotId);

  return postMessage('eqpinfo', sMsg);
}

export async function sendRecipeInfo(
  isPhoto: string,
  lotId: string,
  operation: string,
  subOperation: string,
  product: string,
  eqpId: string,
  opType: string,
  facility: string,
) {
  const sMsg = messageFactory.recipeInfo(
    isPhoto,
    lotId,
    operation,
    subOperation,
    product,
    eqpId,
    opType,
    facility,
  );

  return postMessage('recipeinfo', sMsg);
}

export async function sendLoginUserCheck(userId: string, eqpId: string, autoMotive: string) {
  const sMsg = messageFactory.loginUserCheck(userId, eqpId, autoMotive);

  return postMessage('loginusercheck', sMsg);
}

export async function sendLotInfoEnd(
  lotId: string,
  facility: string,
  machineName: string,
  type: string,
  scopeInspect: string,
) {
  const sMsg = messageFactory.lotInfoEnd(lotId, facility, machineName, type, scopeInspect);

  return postMessage('lotinfoend', sMsg);
}

export async function sendMoveInLotInfo(
  lotId: string,
  facility: string,
  machineName: string,
  type: string,
  afOperM: string,
  afOperS: string,
  batchId: string,
  recipe: string,
) {
  const sMsg = messageFactory.moveInLotInfo(
    lotId,
    facility,
    machineName,
    type,
    afOperM,
    afOperS,
    batchId,
    recipe,
  );

  return postMessage('lotinfo', sMsg);
}

export async function sendCheckDiCycle(
  lotId: string,
  facility: string,
  operation: string,
  subOperation: string,
) {
  const sMsg = messageFactory.checkDiCycle(lotId, facility, operation, subOperation);

  return postMessage('checkdicycle', sMsg);
}

export async function sendSlotInfo(lotId: string, facility: string) {
  const sMsg = messageFactory.slotInfo(lotId, facility);

  return postMessage('slotinfo', sMsg);
}

export async function sendDummyEqpInfo(eqpId: string, lotId: string) {
  const sMsg = messageFactory.dummyEqpInfo(eqpId, lotId);

  return postMessage('dummyeqpinfo', sMsg);
}

export async function sendDummyEqpInput(lotName: string, lotLastEvent: string, category: string) {
  const sMsg = messageFactory.dummyEqpInput(lotName, lotLastEvent, category);

  return postMessage('dummyeqpinput', sMsg);
}

export async function sendChangeEqpStatus(
  eqpId: string,
  facility: string,
  eqpStatusCode: string,
  eqpDownCode: string,
  comment: string,
  loginUserId: string,
  loginOperName: string,
  chamberMachine: string,
) {
  const sMsg = messageFactory.changeEqpStatus(
    eqpId,
    facility,
    eqpStatusCode,
    eqpDownCode,
    comment,
    loginUserId,
    loginOperName,
    chamberMachine,
  );

  return postMessage('changeeqpstatus', sMsg);
}

export async function sendCheckInspection(
  lotId: string,
  facility: string,
  type: string,
  operation: string,
  subOperation: string,
) {
  const sMsg = messageFactory.checkInspection(lotId, facility, type, operation, subOperation);

  return postMessage('checkinspaction', sMsg);
}

export async function sendProbeCardInfo(probeCardId: string, machine: string) {
  const sMsg = messageFactory.probeCardInfo(probeCardId, machine);

  return postMessage('probecardinfo', sMsg);
}

export async function sendProbeCardValue(probeCardId: string, product: string, machine: string) {
  const sMsg = messageFactory.probeCardValue(probeCardId, product, machine);

  return postMessage('probecardvalue', sMsg);
}

export async function sendSetProbeCardHistory(
  lotId: string,
  facility: string,
  qty: string,
  machineName: string,
  operation: string,
  subOperation: string,
  operationDesc: string,
  operatorId: string,
  probeCard: string,
  probeCardId: string,
  type: string,
  valueOd: string,
  valueZ: string,
) {
  const sMsg = messageFactory.setProbeCardHistory(
    lotId,
    facility,
    qty,
    machineName,
    operation,
    subOperation,
    operationDesc,
    operatorId,
    probeCard,
    probeCardId,
    type,
    valueOd,
    valueZ,
  );

  return postMessage('probecardset', sMsg);
}

export default {
  sendLotInfo,
  sendMoveIn,
  sendMcfdcEqpInfo,
  sendEqpInfo,
  sendRecipeInfo,
  sendLoginUserCheck,
  sendLotInfoEnd,
  sendMoveInLotInfo,
  sendCheckDiCycle,
  sendSlotInfo,
  sendDummyEqpInfo,
  sendDummyEqpInput,
  sendChangeEqpStatus,
  sendCheckInspection,
  sendProbeCardInfo,
  sendProbeCardValue,
  sendSetProbeCardHistory,
};
