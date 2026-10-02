import type {
  LotInfoRequest,
  LotInfoResponse,
  MachinePortStatusRequest,
  MachinePortStatusResponse,
  RamJobCancelResponse,
  RecipeInfoAshRequest,
  RecipeInfoRequest,
  RecipeInfoResponse,
  RemoteRamcoApi,
  RemoteRamcoApiResult,
  WetRemoteEqpInfoRequest,
  WetRemoteEqpInfoResponse,
  WetRemoteStartRequest,
} from '../types/remote-ramco.types';

export const mockEquipmentInfo: WetRemoteEqpInfoResponse = {
  MAINEQPID: 'EQP-DEMO-01',
  JOBID: 'JOB-DEMO-01',
  PCOUNT: 'Y',
  EQPTYPE: 'ETCH',
  EQPAREA: 'AREA-DEMO',
  NUMCST: '1',
};

export const mockFrontLotInfo: LotInfoResponse = {
  PRODUCT: 'PRODUCT-DEMO',
  OPERATION: 'OPER-DEMO',
  QUANTITY: '25',
  JOBCODE: 'JOB-DEMO',
  PROCESSSTEP: 'STEP-DEMO',
  SUBOPERATION: '010',
  OPTYPE: 'N',
  STATUS: '',
  STATE: 'WIP',
  HOLDSTATUS: '',
  OPERSEQUENCE: '0001',
  NWCOMMENTQTY: '0',
  BATCHID: '',
  AREA: '',
  LOTRESUSER: '',
};

export const mockRearLotInfo: LotInfoResponse = {
  ...mockFrontLotInfo,
  QUANTITY: '24',
  OPERSEQUENCE: '0002',
};

export const mockRecipeInfo: RecipeInfoResponse = {
  RECIPE: 'RCP-DEMO-01',
  POP_MSG: '',
  QTIME_FLAG: '',
  QTIME_FLAG_W: '',
};

export const mockPortStatus: MachinePortStatusResponse = {
  PORTSTATENAME: 'READY',
  ACKMSG: '',
};

export const mockJobCancel: RamJobCancelResponse = { RET: '0' };

export function mockSuccess<T>(data: T): RemoteRamcoApiResult<T> {
  return { ok: true, data };
}

export function mockFailure<T = never>(message: string): RemoteRamcoApiResult<T> {
  return { ok: false, message };
}

export const REMOTE_RAMCO_MOCK_CASES = [
  'default',
  'equipment-error',
  'equipment-active',
  'ultima3',
  'ram8500z',
  'port-run',
  'port-empty',
  'port-error',
  'lot-error',
  'lot-run',
  'lot-invalid-wip',
  'lot-hold',
  'lot-batch',
  'lot-photo',
  'lot-reserved',
  'unread-comments',
  'recipe-error',
  'recipe-mismatch',
  'qtime-over',
  'qtime-warning',
  'clear-port-error',
  'job-cancel-error',
  'start-error',
] as const;

export type RemoteRamcoMockCase = (typeof REMOTE_RAMCO_MOCK_CASES)[number];

export function createRemoteRamcoMockApi(
  mockCase: RemoteRamcoMockCase = 'default',
): RemoteRamcoApi {
  let lotLookupCount = 0;

  return {
    async fetchEquipmentInfo(_request: WetRemoteEqpInfoRequest) {
      await Promise.resolve();
      if (mockCase === 'equipment-error') return mockFailure('장비 조회 mock 오류');

      const equipment: WetRemoteEqpInfoResponse = {
        ...mockEquipmentInfo,
        ...(mockCase === 'equipment-active' ? { PCOUNT: 'N' } : {}),
        ...(mockCase === 'ultima3'
          ? {
              EQPTYPE: 'ULTIMA3',
              PORTNAME: '1,2,3,4',
              INGRCP: 'RCP-DEMO-L',
              INGRCP2: 'RCP-DEMO-U',
            }
          : {}),
        ...(mockCase === 'ram8500z'
          ? { EQPTYPE: 'RAM8500z', INGRCP: 'RCP-RUN', PORTNAME: '1,2,3,4' }
          : {}),
        ...(mockCase === 'job-cancel-error' ? { EQPTYPE: 'ETCH' } : {}),
        ...(['port-run', 'port-empty', 'port-error'].includes(mockCase)
          ? { EQPTYPE: 'ULTIMA3', PORTNAME: '1,2,3,4', INGRCP: 'RCP-DEMO-L', INGRCP2: 'RCP-DEMO-U' }
          : {}),
      };
      return mockSuccess(equipment);
    },
    async fetchLotInfo(request: LotInfoRequest) {
      await Promise.resolve();
      lotLookupCount += 1;
      if (mockCase === 'lot-error') return mockFailure('LOT 조회 mock 오류');

      const lot: LotInfoResponse = {
        ...(request.LOTID.endsWith('REAR') ? mockRearLotInfo : mockFrontLotInfo),
        ...(mockCase === 'lot-run' ? { STATUS: 'RUN' } : {}),
        ...(mockCase === 'lot-invalid-wip' ? { STATE: 'WAIT' } : {}),
        ...(mockCase === 'lot-hold' ? { HOLDSTATUS: 'ONHOLD' } : {}),
        ...(mockCase === 'lot-batch' ? { BATCHID: 'BATCH-DEMO' } : {}),
        ...(mockCase === 'lot-photo' ? { AREA: 'PHOTO' } : {}),
        ...(mockCase === 'lot-reserved' ? { LOTRESUSER: 'USER-DEMO' } : {}),
        ...(mockCase === 'unread-comments' && lotLookupCount > 1 ? { NWCOMMENTQTY: '2' } : {}),
      };
      return mockSuccess(lot);
    },
    async fetchRecipeInfo(request: RecipeInfoRequest | RecipeInfoAshRequest) {
      await Promise.resolve();
      if (mockCase === 'recipe-error') return mockFailure('Recipe 조회 mock 오류');
      const isRearRecipe = request.LOTID.endsWith('REAR');
      return mockSuccess({
        ...mockRecipeInfo,
        ...(mockCase === 'recipe-mismatch' && isRearRecipe ? { RECIPE: 'RCP-OTHER' } : {}),
        ...(mockCase === 'qtime-over' ? { QTIME_FLAG: 'Y' } : {}),
        ...(mockCase === 'qtime-warning' ? { QTIME_FLAG_W: 'Y' } : {}),
      });
    },
    async fetchPortStatus(_request: MachinePortStatusRequest) {
      await Promise.resolve();
      if (mockCase === 'port-error') return mockFailure('PORT 조회 mock 오류');
      return mockSuccess({
        ...mockPortStatus,
        ...(mockCase === 'port-run' ? { PORTSTATENAME: 'RUN' } : {}),
        ...(mockCase === 'port-empty' ? { PORTSTATENAME: '' } : {}),
      });
    },
    async clearPort() {
      await Promise.resolve();
      if (mockCase === 'clear-port-error') return mockFailure('PORT 초기화 mock 오류');
      return mockSuccess(null);
    },
    async cancelJobs() {
      await Promise.resolve();
      if (mockCase === 'job-cancel-error') return mockFailure('Job 삭제 mock 오류');
      return mockSuccess(mockJobCancel);
    },
    async startRemote(_request: WetRemoteStartRequest) {
      await Promise.resolve();
      if (mockCase === 'start-error') return mockFailure('Remote Start mock 오류');
      return mockSuccess(null);
    },
  };
}
