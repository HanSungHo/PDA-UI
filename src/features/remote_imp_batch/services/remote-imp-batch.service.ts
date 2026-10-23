import { assertPass, body, postJsonMessage } from 'src/services/json-message.service';

import type {
  AreaBayInfoBody,
  AreaBayInfoPayload,
  BayStockerInfoBody,
  BayStockerInfoPayload,
  HifosServiceResult,
  ImpBatchRemoteStartPayload,
  LotInfoBody,
  LotInfoPayload,
  MemorizationBody,
  MemorizationPayload,
  RecipeInfoBody,
  RecipeInfoPayload,
} from '../types/remote-imp-batch.types';

/** Sentinel returned when the server response body cannot be parsed at all. */
export const ERRORMSG_MSGBODY = 'ERRORMSG_MSGBODY';

// ─── Internal helpers ────────────────────────────────────────────────────────

/** postJsonMessage accepts a Record<string, string>, so cast all values in the payload to strings. */
function toStringRecord(payload: object): Record<string, string> {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, value == null ? '' : String(value)]),
  );
}

/**
 * Sends an HiFOS message via the project's shared helper (postJsonMessage).
 * Handles double-stringified JSON payloads inside data.result safely without any types.
 */
async function sendMessage<TPayload extends object, TBody>(
  messageName: string,
  payload: TPayload,
): Promise<HifosServiceResult<TBody>> {
  try {
    let parsed = await postJsonMessage(messageName, toStringRecord(payload));

    const rawResult = (parsed as Record<string, unknown>)?.result;

    if (typeof rawResult === 'string') {
      try {
        const unescapedData = JSON.parse(rawResult) as Record<string, unknown>;
        parsed = { ...parsed, ...unescapedData };
      } catch (parseError: unknown) {
        const err = parseError as Error;
        throw new Error(`응답 데이터(result) 파싱 실패: ${err.message}`);
      }
    }

    assertPass(parsed, messageName);
    return {
      isSuccessFul: true,
      body: body(parsed) as TBody,
      errorMessage: '',
    };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      isSuccessFul: false,
      body: {} as TBody,
      errorMessage: err?.message || ERRORMSG_MSGBODY,
    };
  }
}

// ─── Public service ───────────────────────────────────────────────────────────

export const remoteImpBatchService = {
  /**
   * MessageName: MEMORIZATION
   * Legacy contract: MessageFactoryUtil.memorization(chEqpId, recipe, lotId, portName, userId, "IMP")
   */
  memorization(
    chEqpId: string,
    recipe: string,
    lotId: string,
    portName = '',
    userId = 'ENGINEER',
    eqpType = 'IMP',
  ): Promise<HifosServiceResult<MemorizationBody>> {
    const payload: MemorizationPayload = {
      EQPID: chEqpId,
      RECIPE: recipe,
      LOTID: lotId,
      PORTNAME: portName,
      CH_EQPID: chEqpId,
      USER_ID: userId,
      EQP_TYPE: eqpType,
    };
    return sendMessage<MemorizationPayload, MemorizationBody>('MEMORIZATION', payload);
  },

  /**
   * MessageName: AREABAYINFO
   * Legacy contract: MessageFactoryUtil.areaBayInfo(DeviceInfo.FACILITY)
   */
  areaBayInfo(facility: string): Promise<HifosServiceResult<AreaBayInfoBody>> {
    const payload: AreaBayInfoPayload = { FACILITY: facility };
    return sendMessage<AreaBayInfoPayload, AreaBayInfoBody>('AREABAYINFO', payload);
  },

  /**
   * MessageName: BAYSTOCKERINFO
   * Legacy contract: MessageFactoryUtil.bayStockerInfo(bay, DeviceInfo.FACILITY)
   */
  bayStockerInfo(bay: string, facility: string): Promise<HifosServiceResult<BayStockerInfoBody>> {
    const payload: BayStockerInfoPayload = { BAY: bay, FACILITY: facility };
    return sendMessage<BayStockerInfoPayload, BayStockerInfoBody>('BAYSTOCKERINFO', payload);
  },

  /**
   * MessageName: LOTINFO
   * Legacy contract: MessageFactoryUtil.lotInfo("MVIN", lotId, DeviceInfo.FACILITY)
   */
  lotInfo(type: 'MVIN', lotId: string, facility: string): Promise<HifosServiceResult<LotInfoBody>> {
    const payload: LotInfoPayload = { TYPE: type, LOTID: lotId, FACILITY: facility };
    return sendMessage<LotInfoPayload, LotInfoBody>('LOTINFO', payload);
  },

  /**
   * MessageName: RECIPEINFO
   * Legacy contract: MessageFactoryUtil.recipeInfo("N", lotId, operation, subOperation, product, eqpId, opType, DeviceInfo.FACILITY)
   * Note: uses ISPHOTO instead of CHAMBERYN per legacy contract.
   */
  recipeInfo(
    isPhoto: 'N',
    lotId: string,
    operation: string,
    subOperation: string,
    product: string,
    eqpId: string,
    opType: string,
    facility: string,
  ): Promise<HifosServiceResult<RecipeInfoBody>> {
    const payload: RecipeInfoPayload = {
      ISPHOTO: isPhoto,
      LOTID: lotId,
      OPERATION: operation,
      SUBOPERATION: subOperation,
      PRODUCT: product,
      EQPID: eqpId,
      OPTYPE: opType,
      FACILITY: facility,
    };
    return sendMessage<RecipeInfoPayload, RecipeInfoBody>('RECIPEINFO', payload);
  },

  /**
   * MessageName: IMPBATCHREMOTESTART
   * Legacy contract: MessageFactoryUtil.impBatchRemoteStart(15 params)
   */
  impBatchRemoteStart(
    payload: ImpBatchRemoteStartPayload,
  ): Promise<HifosServiceResult<{ BATCHID?: string; RESULT?: string }>> {
    return sendMessage<ImpBatchRemoteStartPayload, { BATCHID?: string; RESULT?: string }>(
      'IMPBATCHREMOTESTART',
      payload,
    );
  },
};
