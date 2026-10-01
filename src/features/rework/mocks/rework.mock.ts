import type {
  RawAreaBayInfoResponse,
  RawBayStockerInfoResponse,
  RawReworkInfoResponse,
} from '../types/rework.types';

// Keyed by LOTID, same as the legacy REWORKINFO request/response pairing
export const mockRawReworkInfoByLotId: Record<string, RawReworkInfoResponse> = {
  LOT0001: {
    PRODUCT: 'PRD-0001',
    OPERATION: 'OP10',
    SUBOPERATION: '00',
    PROCESSSTEP: 'STEP-A',
    EQPID: 'EQP-01',
    STATE: 'WIP',
    STATUS: 'RUN',
    HOLDSTATUS: 'NONE',
    QUANTITY: '25',
    REWORKITEMS: [
      { REWORKCODE: 'RW01', RWDESCRIPTION: 'Particle rework' },
      { REWORKCODE: 'RW02', RWDESCRIPTION: 'Pattern defect rework' },
    ],
  },
  LOT0002: {
    PRODUCT: 'PRD-0002',
    OPERATION: 'OP20',
    SUBOPERATION: '10',
    PROCESSSTEP: 'STEP-B',
    EQPID: 'EQP-02',
    STATE: 'HOLD',
    STATUS: 'STOP',
    HOLDSTATUS: 'ONHOLD',
    QUANTITY: '10',
    REWORKITEMS: [{ REWORKCODE: 'RW03', RWDESCRIPTION: 'Bridging rework' }],
  },
};

// legacy: ResponseDataToJsonUtil.getErrorMessage(result) when REWORKINFO fails
export const mockReworkLotNotFoundMessage = '해당 LOT 정보를 찾을 수 없습니다.';

export const mockRawAreaBayInfo: RawAreaBayInfoResponse = {
  BAYS: [{ BAY: 'BAY-A' }, { BAY: 'BAY-B' }, { BAY: 'BAY-C' }],
};

// legacy: ResponseDataToJsonUtil.getErrorMessage(result) when AREABAYINFO fails
export const mockBayInfoFetchFailedMessage = 'BAY 목록을 불러오지 못했습니다.';

// Keyed by BAY, same as the legacy BAYSTOCKERINFO request/response pairing
export const mockRawStockerInfoByBay: Record<string, RawBayStockerInfoResponse> = {
  'BAY-A': { STOCKERS: [{ STOCKER: 'STK-01' }, { STOCKER: 'STK-02' }] },
  'BAY-B': { STOCKERS: [{ STOCKER: 'STK-03' }] },
  'BAY-C': { STOCKERS: [{ STOCKER: 'STK-04' }] },
};

// legacy: ResponseDataToJsonUtil.getErrorMessage(result) when BAYSTOCKERINFO fails
export const mockStockerNotFoundMessage = '선택한 BAY의 STOCKER 목록을 찾을 수 없습니다.';
