import apiClient from '../../../services/api-client';

export const REMOTE_FURNACE_KEC_MESSAGE = 'FURNACEREMOTESTART_KEC';
export const FURNACE_KJ_CHECK_MESSAGE = 'FURNACE_KJCHECK';

export type RemoteFurnaceKecCommand = 'S' | 'ENTER' | 'ENTER_START' | 'R';

export interface RemoteFurnaceKecStartRequest {
  machineName: string;
  batchId: string;
  recipeName: string;
  eventUser: string;
  portName: string;
  commandType: RemoteFurnaceKecCommand;
  lotList: string;
  isDummy: string;
  lotName: string;
  checkNoBatch: string;
  stepRemove: string;
  mwfCount: string;
}

export interface LotInfoRequest {
  lotId: string;
  facility: string;
  operatorId?: string;
}

export interface RecipeInfoRequest {
  lotId: string;
  operation: string;
  subOperation: string;
  product: string;
  equipmentId: string;
  operationType: string;
  facility: string;
  isDummy: string;
}

function buildBody(fields: ReadonlyArray<readonly [string, string]>): string {
  return `<BODY>\n${fields.map(([name, value]) => `  <${name}>${value}</${name}>`).join('\n')}\n</BODY>`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function parseRemoteFurnaceKecResponse(raw: string): Record<string, unknown> {
  let response: Record<string, unknown> | undefined;
  try {
    response = asRecord(JSON.parse(raw) as unknown);
  } catch {
    throw new Error(raw);
  }

  if (!response) throw new Error(raw);
  if (response.STATUS !== 'PASS') {
    throw new Error(typeof response.ERRMSG === 'string' ? response.ERRMSG : raw);
  }

  const messageBody = asRecord(response.MSGBODY);
  if (!messageBody || Object.keys(messageBody).length === 0) {
    throw new Error('BODY가 존재하지 않습니다');
  }

  return messageBody;
}

export async function sendRemoteFurnaceKecMessage(
  messageName: string,
  fields: ReadonlyArray<readonly [string, string]>,
): Promise<Record<string, unknown>> {
  const response = await apiClient.post<string>('/hifos/message', buildBody(fields), {
    headers: {
      'Content-Type': 'application/xml',
      Accept: 'application/xml, text/xml, */*',
      MESSAGENAME: messageName,
      ORIGIN: 'P',
      ACK: 'YES',
    },
    responseType: 'text',
  });
  return parseRemoteFurnaceKecResponse(response.data);
}

export function buildRemoteFurnaceKecStartBody(request: RemoteFurnaceKecStartRequest): string {
  return buildBody([
    ['MACHINENAME', request.machineName],
    ['BATCHID', request.batchId],
    ['RECIPENAME', request.recipeName],
    ['EVENTUSER', request.eventUser],
    ['PORTNAME', request.portName],
    ['CMDTYPE', request.commandType],
    ['LOTLIST', request.lotList],
    ['ISDUMMY', request.isDummy],
    ['LOTNAME', request.lotName],
    ['CHKNOBATCH', request.checkNoBatch],
    ['STEPREMOVE', request.stepRemove],
    ['MWFCOUNT', request.mwfCount],
  ]);
}

export function FURNACE_KJCHECK(lotId: string): Promise<Record<string, unknown>> {
  return sendRemoteFurnaceKecMessage(FURNACE_KJ_CHECK_MESSAGE, [['LOTID', lotId]]);
}

export function REMOTEEQPINFO(equipmentId: string): Promise<Record<string, unknown>> {
  return sendRemoteFurnaceKecMessage('REMOTEEQPINFO', [['EQPID', equipmentId]]);
}

export function RECIPEINFO(request: RecipeInfoRequest): Promise<Record<string, unknown>> {
  return sendRemoteFurnaceKecMessage('RECIPEINFO', [
    ['ISPHOTO', 'N'],
    ['LOTID', request.lotId],
    ['OPERATION', request.operation],
    ['SUBOPERATION', request.subOperation],
    ['PRODUCT', request.product],
    ['EQPID', request.equipmentId],
    ['OPTYPE', request.operationType],
    ['FACILITY', request.facility],
    ['ISDUMMY', request.isDummy],
  ]);
}

export function FURNACEDUMMYRCP(equipmentId: string): Promise<Record<string, unknown>> {
  return sendRemoteFurnaceKecMessage('FURNACEDUMMYRCP', [['MACHINENAME', equipmentId]]);
}

export function LOTINFO(
  request: LotInfoRequest,
  includeOperator: boolean,
): Promise<Record<string, unknown>> {
  const fields: Array<readonly [string, string]> = includeOperator
    ? [
        ['LOTID', request.lotId],
        ['FACILITY', request.facility],
        ['TYPE', 'MVIN'],
        ['OPERATORID', request.operatorId ?? ''],
      ]
    : [
        ['TYPE', 'MVIN'],
        ['LOTID', request.lotId],
        ['FACILITY', request.facility],
      ];
  return sendRemoteFurnaceKecMessage('LOTINFO', fields);
}

export function BATCHLISTBYLOT(
  lotId: string,
  facility: string,
  status: string,
): Promise<Record<string, unknown>> {
  return sendRemoteFurnaceKecMessage('BATCHLISTBYLOT', [
    ['LOTID', lotId],
    ['FACILITY', facility],
    ['STATUS', status],
  ]);
}

export function FURNACEINTLKCHECK(
  machineName: string,
  batchId: string,
  recipeName: string,
  lotList: string,
): Promise<Record<string, unknown>> {
  return sendRemoteFurnaceKecMessage('FURNACEINTLKCHECK', [
    ['MACHINENAME', machineName],
    ['BATCHID', batchId],
    ['RECIPENAME', recipeName],
    ['LOTLIST', lotList],
  ]);
}

export function MACHINEPORTSTATUS_KJ(
  equipmentId: string,
  portName: string,
  lotId: string,
  recipeName: string,
): Promise<Record<string, unknown>> {
  return sendRemoteFurnaceKecMessage('MACHINEPORTSTATUS_KJ', [
    ['EQPID', equipmentId],
    ['PORTNAME', portName],
    ['LOTID', lotId],
    ['RECIPE', recipeName],
  ]);
}

export function MACHINEPORTCLEAR(
  equipmentId: string,
  portName: string,
): Promise<Record<string, unknown>> {
  return sendRemoteFurnaceKecMessage('MACHINEPORTCLEAR', [
    ['MACHINENAME', equipmentId],
    ['PORTNAME', portName],
  ]);
}

export interface ChangeEquipmentStatusRequest {
  equipmentId: string;
  facility: string;
  operatorId: string;
  operatorName: string;
}

export function CHANGEEQPSTATUS(
  request: ChangeEquipmentStatusRequest,
): Promise<Record<string, unknown>> {
  return sendRemoteFurnaceKecMessage('CHANGEEQPSTATUS', [
    ['EQPID', request.equipmentId],
    ['FACILITY', request.facility],
    ['EQPSTATUSCODE', 'R  가동중'],
    ['EQPDOWNCODE', 'RR001'],
    ['COMMENT', 'PDA_MVIN_UP'],
    ['LOGINUSERID', request.operatorId],
    ['LOGINGUSERID1', request.operatorName],
    ['CHANGECHAMBER', ''],
  ]);
}

export function FurnaceremoteStart_KEC(
  request: RemoteFurnaceKecStartRequest,
): Promise<Record<string, unknown>> {
  return sendRemoteFurnaceKecMessage(REMOTE_FURNACE_KEC_MESSAGE, [
    ['MACHINENAME', request.machineName],
    ['BATCHID', request.batchId],
    ['RECIPENAME', request.recipeName],
    ['EVENTUSER', request.eventUser],
    ['PORTNAME', request.portName],
    ['CMDTYPE', request.commandType],
    ['LOTLIST', request.lotList],
    ['ISDUMMY', request.isDummy],
    ['LOTNAME', request.lotName],
    ['CHKNOBATCH', request.checkNoBatch],
    ['STEPREMOVE', request.stepRemove],
    ['MWFCOUNT', request.mwfCount],
  ]);
}
