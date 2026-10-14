import { useMainStore } from 'src/features/main/stores/main.store';
import apiClient from 'src/services/api-client';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import {
  mockRemoteFurnaceBatchLots,
  mockRemoteFurnaceDummyRecipes,
  mockRemoteFurnaceEqpInfo,
  mockRemoteFurnaceInterlock,
  mockRemoteFurnaceLotInfo,
  mockRemoteFurnacePortStatus,
} from '../mocks/remote-furnace.mock';
import type {
  BatchLotItem,
  RemoteFurnaceApiResult,
  RemoteFurnaceEqpInfo,
  RemoteFurnaceInterlockResult,
  RemoteFurnaceLotInfo,
  RemoteFurnacePortStatus,
} from '../types/remote-furnace.types';

let forceMockMode = false;

export function setRemoteFurnaceMockMode(enabled: boolean): void {
  forceMockMode = enabled;
}

export function isRemoteFurnaceMockMode(): boolean {
  return forceMockMode;
}

function escapeXml(value: string): string {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getString(obj: Record<string, unknown> | null | undefined, key: string): string {
  if (!obj) return '';
  const val = obj[key];
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return '';
}

function getNumber(obj: Record<string, unknown> | null | undefined, key: string): number {
  if (!obj) return 0;
  const val = obj[key];
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return Number(val) || 0;
  return 0;
}

function buildMessage(messageName: string, fields: Array<[string, string]>): string {
  const mainStore = useMainStore();
  const receiver = mainStore.mobileServerName || 'HIFOS';
  const sender = mainStore.deviceName || 'PDA';
  const body = fields.map(([name, value]) => `<${name}>${escapeXml(value)}</${name}>`).join('\n');

  return [
    '<AIFMSG>',
    `<MSGNAME>${escapeXml(messageName)}</MSGNAME>`,
    `<RECEIVER>${escapeXml(receiver)}</RECEIVER>`,
    `<SENDER>${escapeXml(sender)}</SENDER>`,
    '<MSGTYPE>P</MSGTYPE>',
    '<WITHREPLY>YES</WITHREPLY>',
    '<STATUS></STATUS>',
    '<ERRMSG></ERRMSG>',
    '<TID></TID>',
    '<MSGBODY>',
    body,
    '</MSGBODY>',
    '</AIFMSG>',
  ].join('\n');
}

async function postMessage<T>(
  messageName: string,
  fields: Array<[string, string]>,
): Promise<RemoteFurnaceApiResult<T>> {
  try {
    const response = await apiClient.post<MessageResponseData>(
      `/hifos/${messageName.toLowerCase()}`,
      { sMsg: buildMessage(messageName, fields) },
    );
    if (!isResponseSuccessful(response.data)) {
      return { ok: false, message: getResponseErrorMessage(response.data) };
    }
    return { ok: true, data: parseMessageBody(response.data) as unknown as T };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : `${messageName} request failed.`,
    };
  }
}

export const remoteFurnaceService = {
  async fetchLotInfo(
    lotId: string,
    facility: string,
    operatorId: string,
  ): Promise<RemoteFurnaceApiResult<RemoteFurnaceLotInfo>> {
    if (forceMockMode) {
      return { ok: true, data: mockRemoteFurnaceLotInfo(lotId) };
    }

    const result = await postMessage<Record<string, unknown>>('LOTINFO', [
      ['LOTID', lotId],
      ['FACILITY', facility],
      ['MODE', 'MVIN'],
      ['USERID', operatorId],
    ]);

    if (!result.ok || !result.data) {
      return { ok: false, message: result.message || 'LOT 조회 실패' };
    }

    const data = result.data;
    const lotInfo: RemoteFurnaceLotInfo = {
      product: getString(data, 'PRODUCT'),
      facility: getString(data, 'FACILITY'),
      operation: getString(data, 'OPERATION'),
      subOperation: getString(data, 'SUBOPERATION'),
      recipe: getString(data, 'RECIPE'),
      changeRecipe: getString(data, 'CHANGERECIPE'),
      eqpGroup: getString(data, 'EQPGROUP'),
      changeEqpGroup: getString(data, 'CHANGEEQPGROUP'),
      batchId: getString(data, 'BATCHID'),
      area: getString(data, 'AREA'),
      processStep: getString(data, 'PROCESSSTEP'),
      opType: getString(data, 'OPTYPE'),
      status: getString(data, 'STATUS'),
      state: getString(data, 'STATE'),
      holdStatus: getString(data, 'HOLDSTATUS'),
      operSequence: getString(data, 'OPERSEQUENCE'),
      etcMsg: getString(data, 'ETCMSG'),
      oxMachine: getString(data, 'OXMACHINE'),
      machineName: getString(data, 'MACHINENAME'),
      portName: getString(data, 'PORTNAME'),
      machineRecipeName: getString(data, 'MACHINERECIPENAME'),
      lotResUser: getString(data, 'LOTRESUSER'),
      nwCommentQty: getNumber(data, 'NWCOMMENTQTY'),
      processName: getString(data, 'PROCESSNAME'),
      measType: getString(data, 'MEASTYPE'),
      samplingReason: getString(data, 'SAMPLINGREASON'),
      samplingMsg: getString(data, 'SAMPLINGMSG'),
      measOperationName: getString(data, 'MEASOPERATIONNAME'),
      fqcLotName: getString(data, 'FQCLOTNAME'),
      ficdLot: getString(data, 'FICDLOT'),
      inlineSampleMessage: getString(data, 'INLINESAMPLEMESSGE'),
    };

    return { ok: true, data: lotInfo };
  },

  async fetchBatchListByLot(
    lotId: string,
    facility: string,
    recipe: string,
    dummyMode: string,
  ): Promise<RemoteFurnaceApiResult<{ items: BatchLotItem[]; unreadCommentQty: number }>> {
    const isMockEmpty = lotId.toUpperCase().includes('EMPTY');

    if (forceMockMode) {
      return {
        ok: true,
        data: {
          items: isMockEmpty ? [] : mockRemoteFurnaceBatchLots(lotId),
          unreadCommentQty: isMockEmpty ? 0 : 1,
        },
      };
    }

    const result = await postMessage<Record<string, unknown>>('BATCHLISTBYLOT', [
      ['LOTID', lotId],
      ['FACILITY', facility],
      ['RECIPE', recipe],
    ]);

    if (!result.ok || !result.data) {
      return { ok: false, message: result.message || 'BATCHLISTBYLOT 조회 실패' };
    }

    const data = result.data;
    const unreadCommentQty = getNumber(data, 'NWCOMMENTQTY');
    const rawItems = Array.isArray(data.BATCHITEMS) ? data.BATCHITEMS : [];
    const items: BatchLotItem[] = [];

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i] as Record<string, unknown>;
      if (dummyMode === 'F') {
        const procName = getString(item, 'PROCESSNAME');
        const id = getString(item, 'LOTID');
        if (procName !== 'MW_TEST' && id.trim() !== '') {
          items.push({
            lotId: id,
            commentQty: getNumber(item, 'COMMENTQTY'),
            status: getString(item, 'STATUS'),
            processStep: getString(item, 'PROCESSSTEP'),
            product: getString(item, 'PRODUCT'),
            quantity: getNumber(item, 'QUANTITY'),
            errorMessage: getString(item, 'ERRORMESSAGE'),
            operation: getString(item, 'OPERATION'),
            subOperation: getString(item, 'SUBOPERATION'),
            lotState: getString(item, 'LOTSTATE'),
            unreadCommentQty: getNumber(item, 'NWCOMMENTQTY'),
            operSequence: getString(item, 'OPERSEQUENCE'),
          });
        }
      } else {
        const lotProp = getString(data, `LOT${i + 1}`);
        if (lotProp.trim() !== '') {
          items.push({
            lotId: lotProp,
            commentQty: getNumber(item, 'COMMENTQTY'),
            status: '',
            processStep: getString(item, 'PROCESSSTEP'),
            product: '',
            quantity: getNumber(item, 'QUANTITY'),
            errorMessage: getString(item, 'ERRORMESSAGE'),
            operation: getString(item, 'OPERATION'),
            subOperation: getString(item, 'SUBOPERATION'),
            lotState: getString(item, 'LOTSTATE'),
            unreadCommentQty: getNumber(item, 'NWCOMMENTQTY'),
            operSequence: getString(item, 'OPERSEQUENCE'),
          });
        }
      }
    }

    return { ok: true, data: { items, unreadCommentQty } };
  },

  async fetchRemoteEqpInfo(eqpId: string): Promise<RemoteFurnaceApiResult<RemoteFurnaceEqpInfo>> {
    if (forceMockMode) {
      return { ok: true, data: mockRemoteFurnaceEqpInfo(eqpId) };
    }

    const result = await postMessage<Record<string, unknown>>('REMOTEEQPINFO', [['EQPID', eqpId]]);
    if (!result.ok || !result.data) {
      return { ok: false, message: result.message || '장비 정보를 가져올 수 없습니다.' };
    }
    const data = result.data;
    return {
      ok: true,
      data: {
        mainEqpId: getString(data, 'MAINEQPID'),
        procEqpId: getString(data, 'PROCEQPID'),
        eqpArea: getString(data, 'EQPAREA'),
        eqpType: getString(data, 'EQPTYPE'),
        pmMessage: getString(data, 'PMMESSAGE'),
        portName: getString(data, 'PORTNAME'),
        cycleMessage: getString(data, 'CYCLE_MESSAGE'),
      },
    };
  },

  async changeEquipmentStatus(
    eqpId: string,
    facility: string,
    operatorId: string,
    operatorName: string,
  ): Promise<RemoteFurnaceApiResult<null>> {
    if (forceMockMode) {
      return { ok: true, data: null };
    }

    const result = await postMessage<Record<string, unknown>>('CHANGEEQPSTATUS', [
      ['EQPID', eqpId],
      ['FACILITY', facility],
      ['STATUS', 'R  가동중'],
      ['REASON', 'RR001'],
      ['EVENTNAME', 'PDA_MVIN_UP'],
      ['USERID', operatorId],
      ['USERNAME', operatorName],
      ['COMMENT', ''],
    ]);
    return result.ok
      ? { ok: true, data: null }
      : { ok: false, message: result.message || '장비 상태 변경 실패' };
  },

  async fetchRecipeInfo(
    lotNo: string,
    operation: string,
    subOperation: string,
    product: string,
    superEqpId: string,
    opType: string,
    facility: string,
    dummyMode: string,
  ): Promise<
    RemoteFurnaceApiResult<{ recipe: string; etchMessage: string; multiMoveInAction: string }>
  > {
    if (forceMockMode) {
      return {
        ok: true,
        data: {
          recipe: 'FURNACE_DIFF_1000',
          etchMessage: '',
          multiMoveInAction: '',
        },
      };
    }

    const result = await postMessage<Record<string, unknown>>('RECIPEINFO', [
      ['DIFF', 'N'],
      ['LOTID', lotNo],
      ['OPERATION', operation],
      ['SUBOPERATION', subOperation],
      ['PRODUCT', product],
      ['EQPID', superEqpId],
      ['OPTYPE', opType],
      ['FACILITY', facility],
      ['DUMMY', dummyMode],
    ]);
    if (!result.ok || !result.data) {
      return { ok: false, message: result.message || 'RECIPEINFO 조회 실패' };
    }
    const data = result.data;
    return {
      ok: true,
      data: {
        recipe: getString(data, 'RECIPE'),
        etchMessage: getString(data, 'ETCHMESSAGE'),
        multiMoveInAction: getString(data, 'MULTIMOVEINACTION'),
      },
    };
  },

  async fetchDummyRecipeInfo(superEqpId: string): Promise<RemoteFurnaceApiResult<string[]>> {
    if (forceMockMode) {
      return { ok: true, data: mockRemoteFurnaceDummyRecipes };
    }

    const result = await postMessage<Record<string, unknown>>('FURNACEDUMMYRCP', [
      ['EQPID', superEqpId],
    ]);
    if (!result.ok || !result.data) {
      return {
        ok: false,
        message: result.message || '진행 가능한 Recipe가 없어 작업예약을 할 수 없습니다.',
      };
    }
    const rawRecipe = getString(result.data, 'RECIPE');
    const recipes = rawRecipe
      ? rawRecipe
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean)
      : [];
    return { ok: true, data: recipes };
  },

  async fetchMachinePortStatus(
    superEqpId: string,
    portId: string,
    lotId: string,
    recipe: string,
  ): Promise<RemoteFurnaceApiResult<RemoteFurnacePortStatus>> {
    if (forceMockMode) {
      return { ok: true, data: mockRemoteFurnacePortStatus(portId) };
    }

    const result = await postMessage<Record<string, unknown>>('MACHINEPORTSTATUS', [
      ['EQPID', superEqpId],
      ['PORTID', portId],
      ['LOTID', lotId],
      ['RECIPE', recipe],
    ]);
    if (!result.ok || !result.data) {
      return { ok: false, message: result.message || 'MACHINEPORTSTATUS 조회 실패' };
    }
    const data = result.data;
    return {
      ok: true,
      data: {
        portState: getString(data, 'PORTSTATENAME'),
        portLotName: getString(data, 'PORTLOTNAME'),
        ackMsg: getString(data, 'ACKMSG'),
        chmaRet: getString(data, 'CHMA_RET'),
        chmbRet: getString(data, 'CHMB_RET'),
      },
    };
  },

  async clearMachinePort(
    superEqpId: string,
    portName: string,
  ): Promise<RemoteFurnaceApiResult<null>> {
    if (forceMockMode) {
      return { ok: true, data: null };
    }

    const result = await postMessage<Record<string, unknown>>('MACHINEPORTCLEAR', [
      ['EQPID', superEqpId],
      ['PORTNAME', portName],
    ]);
    return result.ok
      ? { ok: true, data: null }
      : { ok: false, message: result.message || 'PORT 초기화 실패' };
  },

  async checkFurnaceInterlock(
    machineName: string,
    remoteBatch: string,
    recipeName: string,
    lotList: string,
  ): Promise<RemoteFurnaceApiResult<RemoteFurnaceInterlockResult>> {
    if (forceMockMode) {
      return { ok: true, data: mockRemoteFurnaceInterlock };
    }

    const result = await postMessage<Record<string, unknown>>('FURNACEINTLKCHECK', [
      ['MACHINENAME', machineName],
      ['BATCHID', remoteBatch],
      ['RECIPENAME', recipeName],
      ['LOTLIST', lotList],
    ]);
    if (!result.ok || !result.data) {
      return { ok: false, message: result.message || 'FURNACEINTLKCHECK 조회 실패' };
    }
    const data = result.data;
    return {
      ok: true,
      data: {
        ret: getString(data, 'RET'),
        intlk: getString(data, 'INTLK'),
      },
    };
  },

  async checkLotComment(lotId: string, facility: string): Promise<RemoteFurnaceApiResult<number>> {
    if (forceMockMode) {
      return { ok: true, data: 0 };
    }

    const result = await postMessage<Record<string, unknown>>('LOTINFO', [
      ['MODE', 'MVIN'],
      ['LOTID', lotId],
      ['FACILITY', facility],
    ]);
    if (!result.ok || !result.data) {
      return { ok: false, message: result.message || 'LOTINFO 조회 실패' };
    }
    const nwCommentQty = getNumber(result.data, 'NWCOMMENTQTY');
    return { ok: true, data: nwCommentQty };
  },

  async startRemoteFurnace(params: {
    machineName: string;
    remoteBatch: string;
    recipeName: string;
    eventUser: string;
    portName: string;
    cmdType: 'S' | 'R';
    lotList: string;
    dummyMode: string;
    lotName: string;
    chkNoBatch: string;
  }): Promise<RemoteFurnaceApiResult<null>> {
    if (forceMockMode) {
      return { ok: true, data: null };
    }

    const result = await postMessage<Record<string, unknown>>('FURNACEREMOTESTART', [
      ['MACHINENAME', params.machineName],
      ['BATCHID', params.remoteBatch],
      ['RECIPENAME', params.recipeName],
      ['USERID', params.eventUser],
      ['PORTNAME', params.portName],
      ['CMDTYPE', params.cmdType],
      ['LOTLIST', params.lotList],
      ['DUMMY', params.dummyMode],
      ['LOTNAME', params.lotName],
      ['CHKNOBATCH', params.chkNoBatch],
      ['REWORK', 'F'],
    ]);
    return result.ok
      ? { ok: true, data: null }
      : { ok: false, message: result.message || 'FURNACEREMOTESTART 실패' };
  },
};
