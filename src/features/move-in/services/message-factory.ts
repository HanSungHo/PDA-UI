import { useMainStore } from 'src/features/main/stores/main.store';

interface SendMessageHeader {
  MSGNAME: string;
  RECEIVER: string;
  SENDER: string;
  MSGTYPE: string;
  WITHREPLY: string;
  STATUS: string;
  ERRMSG: string;
  TID: string;
}

const START_ROOT = '<AIFMSG>';
const END_ROOT = '</AIFMSG>';
const START_BODY = '<MSGBODY>';
const END_BODY = '</MSGBODY>';

function makeSendMessageHeader(h: SendMessageHeader): string {
  return [
    `<MSGNAME>${h.MSGNAME}</MSGNAME>`,
    `<RECEIVER>${h.RECEIVER}</RECEIVER>`,
    `<SENDER>${h.SENDER}</SENDER>`,
    `<MSGTYPE>${h.MSGTYPE}</MSGTYPE>`,
    `<WITHREPLY>${h.WITHREPLY}</WITHREPLY>`,
    `<STATUS>${h.STATUS}</STATUS>`,
    `<ERRMSG>${h.ERRMSG}</ERRMSG>`,
    `<TID>${h.TID}</TID>`,
  ].join('\n');
}

function getDefaultHeader(msgName: string): SendMessageHeader {
  const mainStore = useMainStore();

  return {
    MSGNAME: msgName,
    RECEIVER: mainStore.mobileServerName,
    SENDER: mainStore.deviceName,
    MSGTYPE: 'P',
    WITHREPLY: 'YES',
    STATUS: '',
    ERRMSG: '',
    TID: '',
  };
}

function wrapMessage(msgName: string, body: string): string {
  const header = getDefaultHeader(msgName);

  return [START_ROOT, makeSendMessageHeader(header), START_BODY, body, END_BODY, END_ROOT].join(
    '\n',
  );
}

export function lotInfo(lotId: string, facility: string, type: string, userId: string): string {
  const body = [
    `<LOTID>${lotId}</LOTID>`,
    `<FACILITY>${facility}</FACILITY>`,
    `<TYPE>${type}</TYPE>`,
    `<OPERATORID>${userId}</OPERATORID>`,
  ].join('\n');

  return wrapMessage('LOTINFO', body);
}

export function moveInLotInfo(
  lotId: string,
  facility: string,
  machineName: string,
  type: string,
  afOperM: string,
  afOperS: string,
  batchId: string,
  recipe: string,
): string {
  const body = [
    `<LOTID>${lotId}</LOTID>`,
    `<FACILITY>${facility}</FACILITY>`,
    `<MACHINENAME>${machineName}</MACHINENAME>`,
    `<TYPE>${type}</TYPE>`,
    `<AFOPERM>${afOperM}</AFOPERM>`,
    `<AFOPERS>${afOperS}</AFOPERS>`,
    `<BATCHID>${batchId}</BATCHID>`,
    `<RECIPE>${recipe}</RECIPE>`,
  ].join('\n');

  return wrapMessage('LOTINFO', body);
}

export function mcFdcEqpInfo(eqpId: string): string {
  const body = `<EQPID>${eqpId}</EQPID>`;

  return wrapMessage('MCFDCEQPINFO', body);
}

export function eqpInfo(eqpId: string, moveIn: string, lotId: string): string {
  const body = [
    `<EQPID>${eqpId}</EQPID>`,
    `<MOVEIN>${moveIn}</MOVEIN>`,
    `<LOTID>${lotId}</LOTID>`,
  ].join('\n');

  return wrapMessage('EQPINFO', body);
}

export function recipeInfo(
  isPhoto: string,
  lotId: string,
  operation: string,
  subOperation: string,
  product: string,
  eqpId: string,
  opType: string,
  facility: string,
): string {
  const body = [
    `<ISPHOTO>${isPhoto}</ISPHOTO>`,
    `<LOTID>${lotId}</LOTID>`,
    `<OPERATION>${operation}</OPERATION>`,
    `<SUBOPERATION>${subOperation}</SUBOPERATION>`,
    `<PRODUCT>${product}</PRODUCT>`,
    `<EQPID>${eqpId}</EQPID>`,
    `<OPTYPE>${opType}</OPTYPE>`,
    `<FACILITY>${facility}</FACILITY>`,
  ].join('\n');

  return wrapMessage('RECIPEINFO', body);
}

export function loginUserCheck(userId: string, eqpId: string, autoMotive: string): string {
  const body = [
    `<USERID>${userId}</USERID>`,
    `<EQPID>${eqpId}</EQPID>`,
    `<AUTOMOTIVE>${autoMotive}</AUTOMOTIVE>`,
  ].join('\n');

  return wrapMessage('LOGINUSERCHECK', body);
}

export function moveIn(
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
): string {
  const body = [
    `<LOTID>${lotId}</LOTID>`,
    `<FACILITY>${facility}</FACILITY>`,
    `<RECIPE>${recipe}</RECIPE>`,
    `<EQPID>${eqpId}</EQPID>`,
    `<OPERATION>${operation}</OPERATION>`,
    `<SUBOPERATION>${subOperation}</SUBOPERATION>`,
    `<ISSKIP>${isSkip}</ISSKIP>`,
    `<OPERATORID>${operatorId}</OPERATORID>`,
    `<ISEXPOSURE>${isExposure}</ISEXPOSURE>`,
    `<IDENTCODE>${identCode}</IDENTCODE>`,
    `<RETICLEID>${reticleId}</RETICLEID>`,
    `<QUANTITY>${quantity}</QUANTITY>`,
    `<COMMENT>${comment}</COMMENT>`,
    `<REWORKSKIP>${reworkSkip}</REWORKSKIP>`,
  ].join('\n');

  return wrapMessage('MOVEIN', body);
}

export function lotInfoEnd(
  lotId: string,
  facility: string,
  machineName: string,
  type: string,
  scopeInspect: string,
): string {
  const body = [
    `<LOTID>${lotId}</LOTID>`,
    `<FACILITY>${facility}</FACILITY>`,
    `<MACHINENAME>${machineName}</MACHINENAME>`,
    `<TYPE>${type}</TYPE>`,
    `<SCOPEINSPECT>${scopeInspect}</SCOPEINSPECT>`,
  ].join('\n');

  return wrapMessage('LOTINFOEND', body);
}

export function checkDiCycle(
  lotId: string,
  facility: string,
  operation: string,
  subOperation: string,
): string {
  const body = [
    `<LOTID>${lotId}</LOTID>`,
    `<FACILITY>${facility}</FACILITY>`,
    `<OPERATION>${operation}</OPERATION>`,
    `<SUBOPERATION>${subOperation}</SUBOPERATION>`,
  ].join('\n');

  return wrapMessage('CHECKDICYCLE', body);
}

export function slotInfo(lotId: string, facility: string): string {
  const body = [`<LOTID>${lotId}</LOTID>`, `<FACILITY>${facility}</FACILITY>`].join('\n');

  return wrapMessage('SLOTINFO', body);
}

export function dummyEqpInfo(eqpId: string, lotId: string): string {
  const body = [`<EQPID>${eqpId}</EQPID>`, `<LOTNO>${lotId}</LOTNO>`].join('\n');

  return wrapMessage('DUMMYEQPINFO', body);
}

export function dummyEqpInput(lotName: string, lotLastEvent: string, category: string): string {
  const body = [
    `<LOTNAME>${lotName}</LOTNAME>`,
    `<LOTLASTEVENT>${lotLastEvent}</LOTLASTEVENT>`,
    `<CATEGORY>${category}</CATEGORY>`,
  ].join('\n');

  return wrapMessage('DUMMYEQPINPUT', body);
}

export function changeEqpStatus(
  eqpId: string,
  facility: string,
  eqpStatusCode: string,
  eqpDownCode: string,
  comment: string,
  loginUserId: string,
  loginOperName: string,
  chamberMachine: string,
): string {
  const body = [
    `<EQPID>${eqpId}</EQPID>`,
    `<FACILITY>${facility}</FACILITY>`,
    `<EQPSTATUSCODE>${eqpStatusCode}</EQPSTATUSCODE>`,
    `<EQPDOWNCODE>${eqpDownCode}</EQPDOWNCODE>`,
    `<COMMENT>${comment}</COMMENT>`,
    `<LOGINUSERID>${loginUserId}</LOGINUSERID>`,
    `<LOGINGUSERID1>${loginOperName}</LOGINGUSERID1>`,
    `<CHANGECHAMBER>${chamberMachine}</CHANGECHAMBER>`,
  ].join('\n');

  return wrapMessage('CHANGEEQPSTATUS', body);
}

export function checkInspection(
  lotId: string,
  facility: string,
  type: string,
  operation: string,
  subOperation: string,
): string {
  const body = [
    `<LOTID>${lotId}</LOTID>`,
    `<FACILITY>${facility}</FACILITY>`,
    `<TYPE>${type}</TYPE>`,
    `<OPERATION>${operation}</OPERATION>`,
    `<SUBOPERATION>${subOperation}</SUBOPERATION>`,
  ].join('\n');

  return wrapMessage('CHECKINSPACTION', body);
}

export function probeCardInfo(probeCardId: string, machine: string): string {
  const body = [`<PROBECARD>${probeCardId}</PROBECARD>`, `<MACHINE>${machine}</MACHINE>`].join(
    '\n',
  );

  return wrapMessage('PROBECARDINFO', body);
}

export function probeCardValue(probeCardId: string, product: string, machine: string): string {
  const body = [
    `<PROBECARD>${probeCardId}</PROBECARD>`,
    `<PRODUCT>${product}</PRODUCT>`,
    `<MACHINE>${machine}</MACHINE>`,
  ].join('\n');

  return wrapMessage('PROBECARDVALUE', body);
}

export function setProbeCardHistory(
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
): string {
  const body = [
    `<LOTNAME>${lotId}</LOTNAME>`,
    `<FACILITY>${facility}</FACILITY>`,
    `<QTY>${qty}</QTY>`,
    `<MACHINENAME>${machineName}</MACHINENAME>`,
    `<OPERATION>${operation}</OPERATION>`,
    `<SUBOPERATION>${subOperation}</SUBOPERATION>`,
    `<OPERATIONDESC>${operationDesc}</OPERATIONDESC>`,
    `<OPERATORID>${operatorId}</OPERATORID>`,
    `<PROBECARD>${probeCard}</PROBECARD>`,
    `<PROBECARDID>${probeCardId}</PROBECARDID>`,
    `<TYPE>${type}</TYPE>`,
    `<VALUEOD>${valueOd}</VALUEOD>`,
    `<VALUEZ>${valueZ}</VALUEZ>`,
  ].join('\n');

  return wrapMessage('PROBECARDSET', body);
}

export default {
  lotInfo,
  moveInLotInfo,
  mcFdcEqpInfo,
  eqpInfo,
  recipeInfo,
  loginUserCheck,
  moveIn,
  lotInfoEnd,
  checkDiCycle,
  slotInfo,
  dummyEqpInfo,
  dummyEqpInput,
  changeEqpStatus,
  checkInspection,
  probeCardInfo,
  probeCardValue,
  setProbeCardHistory,
};
