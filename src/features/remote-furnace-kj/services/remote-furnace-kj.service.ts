import type { AifMessageField } from 'src/services/aif-message.service';
import {
  body,
  errorMessage,
  firstList,
  type MessageBody,
  postAifJsonMessage,
  text,
} from 'src/services/json-message.service';
import { sendMessage } from 'src/services/message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import type {
  FurnaceKjBatchLot,
  FurnaceKjCheckResponse,
  FurnaceKjEquipmentInfo,
  FurnaceKjLotInfo,
  RemoteFurnaceKjApi,
  RemoteFurnaceKjApiResult,
} from '../types/remote-furnace-kj.types';

type Result<T> = Promise<RemoteFurnaceKjApiResult<T>>;

/** Posts a hifos2 AIFMSG and maps a PASS body; FAIL and transport errors keep their message. */
async function send<T>(
  messageName: string,
  fields: readonly AifMessageField[],
  map: (messageBody: MessageBody) => T,
): Result<T> {
  try {
    const parsed = await postAifJsonMessage(messageName, fields);
    if (parsed.STATUS !== 'PASS') return { ok: false, message: errorMessage(parsed) };
    return { ok: true, data: map(body(parsed)) };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

function pick<K extends string>(messageBody: MessageBody, keys: readonly K[]): Record<K, string> {
  return Object.fromEntries(keys.map((key) => [key, text(messageBody, key)])) as Record<K, string>;
}

function furnaceType(value: string): FurnaceKjCheckResponse['FURNACE'] {
  if (value === 'KJ' || value === '0') return 'KJ';
  if (value === 'KEC') return 'KEC';
  return 'OTHER';
}

const LOT_KEYS = [
  'LOTID',
  'PRODUCT',
  'OPERATION',
  'SUBOPERATION',
  'PROCESSSTEP',
  'OPERSEQUENCE',
  'RECIPE',
  'BATCHID',
  'STATUS',
  'STATE',
  'HOLDSTATUS',
  'NWCOMMENTQTY',
  'COMMENTQTY',
  'LOTRESUSER',
  'OPTYPE',
  'AREA',
  'MEASTYPE',
  'SAMPLINGREASON',
  'SAMPLINGMSG',
  'MEASOPERATIONNAME',
  'FQCLOTNAME',
  'FICDLOT',
  'INLINESAMPLEMESSGE',
  'ETCMSG',
  'SKIPALLOWFLAG',
  'PROCESSNAME',
  'EQPGROUP',
  'CHANGEEQPGROUP',
  'CHANGERECIPE',
  'MACHINENAME',
  'PORTNAME',
  'MACHINERECIPENAME',
  'OXMACHINE',
] as const satisfies readonly (keyof FurnaceKjLotInfo)[];

const BATCH_LOT_KEYS = [
  'LOTID',
  'PRODUCT',
  'OPERATION',
  'SUBOPERATION',
  'PROCESSSTEP',
  'OPERSEQUENCE',
  'STATUS',
  'LOTSTATE',
  'COMMENTQTY',
  'NWCOMMENTQTY',
  'ISCHECK',
  'PROCESSNAME',
  'QUANTITY',
  'ERRORMESSAGE',
] as const satisfies readonly (keyof FurnaceKjBatchLot)[];

function batchItems(messageBody: MessageBody): MessageBody[] {
  const value = messageBody.BATCHITEMS;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return firstList(value as MessageBody, ['ITEM']);
  }
  return firstList(messageBody, ['BATCHITEMS']);
}

/** hifos2 RemoteFurnaceKjActivity messages (MessageFactoryUtil field order). */
export const remoteFurnaceKjApi: RemoteFurnaceKjApi = {
  /** eSheet Furnace Auto: furnace_KJCheck(lotId) -> CNT "0" KJ, "KEC" KEC, otherwise classic. */
  async checkFurnaceKj(request) {
    try {
      const response = await sendMessage('FURNACE_KJCHECK', { LOTID: request.LOTID });
      if (!isResponseSuccessful(response)) {
        return { ok: false, message: getResponseErrorMessage(response) };
      }

      const count = String(parseMessageBody(response).CNT ?? '');
      return { ok: true, data: { CNT: count, FURNACE: furnaceType(count) } };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Furnace 구분 조회에 실패하였습니다.',
      };
    }
  },

  /** lotInfo(lotId, FACILITY, "MVIN", OPERATOR_ID). */
  fetchLotInfo(request) {
    return send(
      'LOTINFO',
      [
        ['LOTID', request.LOTID],
        ['FACILITY', request.FACILITY],
        ['TYPE', 'MVIN'],
        ['OPERATORID', request.USERID],
      ],
      (messageBody) => pick(messageBody, LOT_KEYS),
    );
  },

  /**
   * batchListByLotMoveIn(lotId, FACILITY, txtRecipe). Rows are BATCHITEMS; LOT1..LOTn carry the LOT
   * ids the legacy screen uses for dummy batches.
   */
  fetchBatchListByLot(request) {
    return send(
      'BATCHLISTBYLOT',
      [
        ['LOTID', request.LOTID],
        ['FACILITY', request.FACILITY],
        ['STATUS', ''],
      ],
      (messageBody) => {
        const rows = batchItems(messageBody).map((item) => pick(item, BATCH_LOT_KEYS));
        return {
          rows,
          BATCHID: text(messageBody, 'BATCHID'),
          NO_BATCH: text(messageBody, 'NO_BATCH'),
          STEPREMOVE: text(messageBody, 'STEPREMOVE'),
          NWCOMMENTQTY: text(messageBody, 'NWCOMMENTQTY'),
          dummyLotIds: rows.map((_, index) => text(messageBody, `LOT${index + 1}`)),
        };
      },
    );
  },

  /** remoteEqpInfo(eqpId). */
  fetchEquipmentInfo(request) {
    return send(
      'REMOTEEQPINFO',
      [['EQPID', request.EQPID]],
      (messageBody): FurnaceKjEquipmentInfo => ({
        ...pick(messageBody, [
          'MAINEQPID',
          'PROCEQPID',
          'EQPAREA',
          'EQPTYPE',
          'ISDOOROPEN',
          'PMMESSAGE',
          'PORTNAME',
          'CYCLE_MESSAGE',
        ] as const),
        FURNACE: furnaceType(text(messageBody, 'FURNACE')),
      }),
    );
  },

  /** recipeInfoDiff("N", lotId, operation, subOperation, product, eqpId, opType, FACILITY, dummy). */
  fetchRecipeInfo(request) {
    return send(
      'RECIPEINFO',
      [
        ['ISPHOTO', 'N'],
        ['LOTID', request.LOTID],
        ['OPERATION', request.OPERATION],
        ['SUBOPERATION', request.SUBOPERATION],
        ['PRODUCT', request.PRODUCT],
        ['EQPID', request.EQPID],
        ['OPTYPE', request.OPTYPE],
        ['FACILITY', request.FACILITY],
        ['ISDUMMY', request.ISDUMMY],
      ],
      (messageBody) =>
        pick(messageBody, ['RECIPE', 'ETCHMESSAGE', 'MULTIMOVEINACTION', 'ETCMSG'] as const),
    );
  },

  /** FurnacerINTLKCheck(machineName, batchId, recipeName, lotList). */
  checkInterlock(request) {
    return send(
      'FURNACEINTLKCHECK',
      [
        ['MACHINENAME', request.MACHINENAME],
        ['BATCHID', request.BATCHID],
        ['RECIPENAME', request.RECIPENAME],
        ['LOTLIST', request.LOTLIST],
      ],
      (messageBody) => ({
        RET: text(messageBody, 'RET'),
        INTLK: text(messageBody, 'INTLK') === 'Y' ? ('Y' as const) : ('N' as const),
      }),
    );
  },

  /** machinePortStatus_KJ(eqpId, portName, lotId, recipe). */
  fetchKjPortStatus(request) {
    return send(
      'MACHINEPORTSTATUS_KJ',
      [
        ['EQPID', request.MACHINENAME],
        ['PORTNAME', request.PORTNAME],
        ['LOTID', request.LOTID],
        ['RECIPE', request.RECIPE],
      ],
      (messageBody) =>
        pick(messageBody, [
          'PORTSTATENAME',
          'PORTLOTNAME',
          'ACKMSG',
          'PORTSTATENAME1',
          'PORTSTATENAME2',
        ] as const),
    );
  },

  /** machinePortClean(machineName, portName), MSGNAME MACHINEPORTCLEAR. */
  clearPort(request) {
    return send(
      'MACHINEPORTCLEAR',
      [
        ['MACHINENAME', request.MACHINENAME],
        ['PORTNAME', request.PORTNAME],
      ],
      () => null,
    );
  },

  /** changeEQPStatus(eqpId, FACILITY, status, reason code, event name, user id, user name, ""). */
  changeEquipmentStatus(request) {
    return send(
      'CHANGEEQPSTATUS',
      [
        ['EQPID', request.MAINEQPID],
        ['FACILITY', request.FACILITY],
        ['EQPSTATUSCODE', request.STATUS],
        ['EQPDOWNCODE', request.REASONCODE],
        ['COMMENT', request.EVENTNAME],
        ['LOGINUSERID', request.USERID],
        ['LOGINGUSERID1', request.USERNAME],
        ['CHANGECHAMBER', request.REMARK],
      ],
      (messageBody) => ({ RET: text(messageBody, 'RET') }),
    );
  },

  /** FurnaceremoteStart_KJ(machine, batch, recipe, user, port, cmdType, lotList, dummy, lot, noBatch). */
  startKjRemote(request) {
    return send(
      'FURNACEREMOTESTART_KJ',
      [
        ['MACHINENAME', request.MACHINENAME],
        ['BATCHID', request.BATCHID],
        ['RECIPENAME', request.RECIPENAME],
        ['EVENTUSER', request.EVENTUSER],
        ['PORTNAME', request.PORTNAME],
        ['CMDTYPE', request.CMDTYPE],
        ['LOTLIST', request.LOTLIST],
        ['ISDUMMY', request.ISDUMMY],
        ['LOTNAME', request.LOTNAME],
        ['CHKNOBATCH', request.CHKNOBATCH],
      ],
      () => null,
    );
  },
};

let activeApi: RemoteFurnaceKjApi = remoteFurnaceKjApi;

export function getRemoteFurnaceKjApi(): RemoteFurnaceKjApi {
  return activeApi;
}

export function setRemoteFurnaceKjApi(api: RemoteFurnaceKjApi): void {
  activeApi = api;
}

export function resetRemoteFurnaceKjApi(): void {
  activeApi = remoteFurnaceKjApi;
}
