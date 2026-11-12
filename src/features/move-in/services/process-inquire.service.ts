import { DeviceInfo } from 'src/constants/device-info';
import { ApiError } from 'src/services/api-error';
import {
  body,
  errorMessage,
  firstList,
  type MessageBody,
  type ParsedMessage,
  postAifJsonMessage,
  text,
} from 'src/services/json-message.service';

import type { MeasureRow, MeasureStatus } from '../types/process-inquire.types';

/** MessageFactoryUtil.measureSet(lotId, FACILITY, m_sOperation, sSubOperation, OPERATOR_ID, ...). */
export interface MeasureSetRequest {
  lotId: string;
  facility: string;
  operation: string;
  subOperation: string;
  qty: string;
  slotList: string;
  waferList: string;
  semSlotList: string;
  semWaferList: string;
}

/** MessageFactoryUtil.moveIn(lotId, FACILITY, "", "", m_sOperation, subOperation, "Y", ...). */
export interface MoveInRequest {
  lotId: string;
  facility: string;
  operation: string;
  subOperation: string;
  qty: string;
  reworkSkip: string;
}

export interface MeasureInfoApiResponse {
  product?: string;
  operation?: string;
  subOperation?: string;
  photoJobCode?: string;
  processStep?: string;
  quantity?: string;
  slotList?: string;
  waferList?: string;
  semSlotList?: string;
  semWaferList?: string;
  measureItems?: MeasureRow[];
}

export interface DiCycleResponse {
  diCycle: string;
  items: Array<{ PHOTOOPERTYPE: string }>;
}

export interface MeasureSetResponse {
  RECIPE: string;
  EQPGROUP: string;
  CHANGEEQPGROUP: string;
  PROCESSSTEP: string;
  COMMENTQTY: string;
  NRWCOMMENTQTY: string;
}

interface ServiceResponse<T> {
  data: T;
  status: number;
}

/** A FAIL reply becomes an ApiError carrying ERRMSG, which the composable shows as is. */
function passBody(parsed: ParsedMessage, code: string): MessageBody {
  if (parsed.STATUS !== 'PASS') throw new ApiError(errorMessage(parsed), { code });
  return body(parsed);
}

/** ResponseDataToJsonUtil lists: an array, or an object wrapping the rows in <itemKey>. */
function listOf(messageBody: MessageBody, key: string, itemKey: string): MessageBody[] {
  const value = messageBody[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return firstList(value as MessageBody, [itemKey]);
  }
  return firstList(messageBody, [key]);
}

function toMeasureRow(item: MessageBody): MeasureRow {
  const subOperation = text(item, 'SUBOPERATION');
  return {
    id: subOperation,
    subOperation,
    processName: text(item, 'SUBPROCESSSTEP'),
    status: (text(item, 'ISCOMPLETE') || 'N') as MeasureStatus,
    description: text(item, 'DESCRIPTION'),
  };
}

/** hifos2 ProcessInquireActivity (MEASUREINFO, SLOTINFO, CHECKDICYCLE, MEASURESET, MOVEIN). */
export const processInquireService = {
  /** getMeasureInfo(): MessageFactoryUtil.measureInfo(lotId, FACILITY, m_sOperation). */
  async getMeasureInfo(
    lotId: string,
    operation: string,
  ): Promise<ServiceResponse<MeasureInfoApiResponse>> {
    const messageBody = passBody(
      await postAifJsonMessage('MEASUREINFO', [
        ['LOTID', lotId],
        ['FACILITY', DeviceInfo.FACILITY],
        ['OPERATION', operation],
      ]),
      'MEASURE_INFO_FAILED',
    );
    return {
      status: 200,
      data: {
        product: text(messageBody, 'PRODUCT'),
        operation: text(messageBody, 'OPERATION'),
        subOperation: text(messageBody, 'SUBOPERATION'),
        photoJobCode: text(messageBody, 'PHOTOJOBCODE'),
        processStep: text(messageBody, 'PROCESSSTEP'),
        quantity: text(messageBody, 'QUANTITY'),
        slotList: text(messageBody, 'SLOTLIST'),
        waferList: text(messageBody, 'WAFERLIST'),
        semSlotList: text(messageBody, 'SEMSLOTLIST'),
        semWaferList: text(messageBody, 'SEMWAFERLIST'),
        measureItems: listOf(messageBody, 'MEASUREITEMS', 'MEASUREITEM').map(toMeasureRow),
      },
    };
  },

  /** MessageFactoryUtil.slotInfo(lotId, FACILITY). */
  async getSlotInfo(lotId: string): Promise<ServiceResponse<{ waferList: string }>> {
    const messageBody = passBody(
      await postAifJsonMessage('SLOTINFO', [
        ['LOTID', lotId],
        ['FACILITY', DeviceInfo.FACILITY],
      ]),
      'SLOT_INFO_FAILED',
    );
    return { status: 200, data: { waferList: text(messageBody, 'WAFERLIST') } };
  },

  /**
   * MessageFactoryUtil.checkDiCycle(lotId, FACILITY, "'OPER-SUB',...", "MULTI"), posted to
   * MessageName.MESSAGE.
   */
  async checkDiCycle(
    lotId: string,
    _operation: string,
    selectedOps: string[],
  ): Promise<ServiceResponse<DiCycleResponse>> {
    const parsed = await postAifJsonMessage(
      'CHECKDICYCLE',
      [
        ['LOTID', lotId],
        ['FACILITY', DeviceInfo.FACILITY],
        ['OPERATION', selectedOps.map((op) => `'${op}'`).join(',')],
        ['SUBOPERATION', 'MULTI'],
      ],
      'message',
    );
    const messageBody = passBody(parsed, 'DI_CYCLE_CHECK_FAILED');
    return {
      status: 200,
      data: {
        diCycle: text(messageBody, 'DICYCLE'),
        items: listOf(messageBody, 'ITEMS', 'ITEM').map((item) => ({
          PHOTOOPERTYPE: text(item, 'PHOTOOPERTYPE'),
        })),
      },
    };
  },

  /** onOk(): MessageFactoryUtil.measureSet(...). */
  async submitMeasureSet(payload: MeasureSetRequest): Promise<ServiceResponse<MeasureSetResponse>> {
    const messageBody = passBody(
      await postAifJsonMessage('MEASURESET', [
        ['LOTID', payload.lotId],
        ['FACILITY', DeviceInfo.FACILITY],
        ['OPERATION', payload.operation],
        ['SUBOPERATION', payload.subOperation],
        ['OPERATORID', DeviceInfo.OPERATOR_ID],
        ['QUANTITY', payload.qty],
        ['SLOTLIST', payload.slotList],
        ['WAFERLIST', payload.waferList],
        ['SEMSLOTLIST', payload.semSlotList],
        ['SEMWAFERLIST', payload.semWaferList],
      ]),
      'MEASURE_SET_FAILED',
    );
    return {
      status: 200,
      data: {
        RECIPE: text(messageBody, 'RECIPE'),
        EQPGROUP: text(messageBody, 'EQPGROUP'),
        CHANGEEQPGROUP: text(messageBody, 'CHANGEEQPGROUP'),
        PROCESSSTEP: text(messageBody, 'PROCESSSTEP'),
        COMMENTQTY: text(messageBody, 'COMMENTQTY'),
        NRWCOMMENTQTY: text(messageBody, 'NRWCOMMENTQTY'),
      },
    };
  },

  /** moveIn(): MessageFactoryUtil.moveIn(lotId, FACILITY, "", "", oper, sub, "Y", OPERATOR_ID, "N", ...). */
  async moveIn(payload: MoveInRequest): Promise<ServiceResponse<Record<string, never>>> {
    passBody(
      await postAifJsonMessage('MOVEIN', [
        ['LOTID', payload.lotId],
        ['FACILITY', DeviceInfo.FACILITY],
        ['RECIPE', ''],
        ['EQPID', ''],
        ['OPERATION', payload.operation],
        ['SUBOPERATION', payload.subOperation],
        ['ISSKIP', 'Y'],
        ['OPERATORID', DeviceInfo.OPERATOR_ID],
        ['ISEXPOSURE', 'N'],
        ['IDENTCODE', ''],
        ['RETICLEID', ''],
        ['QUANTITY', payload.qty],
        ['COMMENT', ''],
        ['REWORKSKIP', payload.reworkSkip],
      ]),
      'MOVE_IN_FAILED',
    );
    return { status: 200, data: {} };
  },
};

export default processInquireService;
