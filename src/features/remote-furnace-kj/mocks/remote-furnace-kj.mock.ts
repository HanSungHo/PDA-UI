import type {
  FurnaceKjBatchList,
  FurnaceKjCheckResponse,
  FurnaceKjCommandResponse,
  FurnaceKjEquipmentInfo,
  FurnaceKjInterlockInfo,
  FurnaceKjLotInfo,
  FurnaceKjPortStatus,
  FurnaceKjRecipeInfo,
  RemoteFurnaceKjApi,
  RemoteFurnaceKjApiResult,
} from '../types/remote-furnace-kj.types';

export const REMOTE_FURNACE_KJ_MOCK_CASES = [
  'default',
  'classification-kec',
  'classification-other',
  'no-lot',
  'reserved-lot',
  'unread-comments',
  'interlock',
  'port-complete',
  'port-run',
  'port-pending',
  'port-init',
  'port-run-generic',
  'port-pending-generic',
  'port-init-generic',
  'equipment-notices',
  'external-machine',
  'machine-changed',
  'classification-error',
  'lot-error',
  'batch-error',
  'equipment-error',
  'equipment-down',
  'recipe-warnings',
  'dummy-test',
  'lot-notices',
  'recipe-error',
  'interlock-error',
  'port-error',
  'clear-port-error',
  'equipment-status-error',
  'start-error',
  'row-statuses',
] as const;

export type RemoteFurnaceKjMockCase = (typeof REMOTE_FURNACE_KJ_MOCK_CASES)[number];

export const mockFurnaceKjCheck: FurnaceKjCheckResponse = { CNT: '0', FURNACE: 'KJ' };

export const mockFurnaceKjLot: FurnaceKjLotInfo = {
  LOTID: 'LOT-KJ-001',
  PRODUCT: 'PRODUCT-KJ-01',
  OPERATION: 'FURNACE',
  SUBOPERATION: 'KJ',
  PROCESSSTEP: 'REMOTE FURNACE KJ',
  OPERSEQUENCE: '0042',
  RECIPE: 'RCP-KJ-01',
  BATCHID: 'BATCH-KJ-01',
  STATUS: '',
  STATE: 'WIP',
  HOLDSTATUS: '',
  NWCOMMENTQTY: '0',
  COMMENTQTY: '0',
  LOTRESUSER: '',
  OPTYPE: 'N',
  AREA: 'FURNACE',
  MEASTYPE: '',
  SAMPLINGREASON: '',
  SAMPLINGMSG: '',
  MEASOPERATIONNAME: '',
  FQCLOTNAME: '',
  FICDLOT: '',
  INLINESAMPLEMESSGE: '',
  ETCMSG: '',
  SKIPALLOWFLAG: 'N',
  PROCESSNAME: 'FURNACE',
  EQPGROUP: 'KJ-01',
  CHANGEEQPGROUP: '',
  CHANGERECIPE: '',
  MACHINENAME: 'KJ-01',
  PORTNAME: '1',
  MACHINERECIPENAME: 'RCP-KJ-01',
  OXMACHINE: '',
};

export const mockFurnaceKjBatchList: FurnaceKjBatchList = {
  BATCHID: 'BATCH-KJ-01',
  NO_BATCH: 'N',
  STEPREMOVE: 'N',
  NWCOMMENTQTY: '0',
  dummyLotIds: [],
  rows: [
    {
      LOTID: 'LOT-KJ-001',
      PRODUCT: 'PRODUCT-KJ-01',
      OPERATION: 'FURNACE',
      SUBOPERATION: 'KJ',
      PROCESSSTEP: 'REMOTE FURNACE KJ',
      OPERSEQUENCE: '0042',
      STATUS: 'WAIT',
      LOTSTATE: 'WIP',
      COMMENTQTY: '1',
      NWCOMMENTQTY: '0',
      ISCHECK: 'N',
      PROCESSNAME: 'FURNACE',
      QUANTITY: '25',
      ERRORMESSAGE: '',
    },
  ],
};

export const mockFurnaceKjEquipment: FurnaceKjEquipmentInfo = {
  MAINEQPID: 'KJ-01',
  PROCEQPID: 'KJ-01',
  EQPAREA: 'FURNACE',
  EQPTYPE: 'KJ',
  ISDOOROPEN: 'N',
  PMMESSAGE: '',
  PORTNAME: '1,2',
  CYCLE_MESSAGE: '',
  FURNACE: 'KJ',
};

export const mockFurnaceKjRecipe: FurnaceKjRecipeInfo = {
  RECIPE: 'RCP-KJ-01',
  ETCHMESSAGE: '',
  MULTIMOVEINACTION: '',
  ETCMSG: '',
};

export const mockFurnaceKjInterlock: FurnaceKjInterlockInfo = { RET: '', INTLK: 'N' };
export const mockFurnaceKjPort: FurnaceKjPortStatus = {
  PORTSTATENAME: 'IDLE',
  PORTLOTNAME: 'BATCH-KJ-01',
  ACKMSG: '',
  PORTSTATENAME1: 'IDLE',
  PORTSTATENAME2: 'IDLE',
};
export const mockFurnaceKjCommand: FurnaceKjCommandResponse = { RET: '0' };

export function mockSuccess<T>(data: T): RemoteFurnaceKjApiResult<T> {
  return { ok: true, data };
}

export function mockFailure<T = never>(message: string): RemoteFurnaceKjApiResult<T> {
  return { ok: false, message };
}

export function createRemoteFurnaceKjMockApi(
  mockCase: RemoteFurnaceKjMockCase = 'default',
): RemoteFurnaceKjApi {
  let recipeLookupCount = 0;
  return {
    async checkFurnaceKj() {
      await Promise.resolve();
      if (mockCase === 'classification-error') return mockFailure('Furnace 구분 조회 mock 오류');
      if (mockCase === 'classification-kec') {
        return mockSuccess({ CNT: 'KEC', FURNACE: 'KEC' as const });
      }
      if (mockCase === 'classification-other') {
        return mockSuccess({ CNT: '1', FURNACE: 'OTHER' as const });
      }
      return mockSuccess(mockFurnaceKjCheck);
    },
    async fetchLotInfo(request) {
      await Promise.resolve();
      if (mockCase === 'no-lot' || !request.LOTID) return mockFailure('LOT 조회 대상이 없습니다.');
      if (mockCase === 'lot-error') return mockFailure('LOT 조회 mock 오류');
      return mockSuccess({
        ...mockFurnaceKjLot,
        LOTID: request.LOTID,
        ...(mockCase === 'machine-changed' ? { CHANGEEQPGROUP: 'KJ-02' } : {}),
        ...(mockCase === 'external-machine' ? { OXMACHINE: 'KJ-EXT-01' } : {}),
        ...(mockCase === 'dummy-test' ? { PROCESSNAME: 'MW_TEST' } : {}),
        ...(mockCase === 'lot-notices'
          ? {
              MEASTYPE: 'UV',
              SAMPLINGREASON: 'Y',
              MEASOPERATIONNAME: 'FURNACE',
              FQCLOTNAME: 'LOT-FQC',
              FICDLOT: 'LOT-FICD',
              ETCMSG: 'LOT-ETC 정보',
              INLINESAMPLEMESSGE: 'LOT-INLINE 안내',
            }
          : {}),
        ...(mockCase === 'unread-comments' ? { NWCOMMENTQTY: '1' } : {}),
        ...(mockCase === 'reserved-lot' ? { LOTRESUSER: 'OP-RESERVED' } : {}),
      });
    },
    async fetchBatchListByLot(request) {
      await Promise.resolve();
      if (mockCase === 'batch-error') return mockFailure('Batch LOT 조회 mock 오류');
      const sourceRows =
        mockCase === 'row-statuses'
          ? (['FAIL', 'RUN', 'WAIT'] as const).map((status) => ({
              ...mockFurnaceKjBatchList.rows[0],
              LOTID: `LOT-KJ-${status}`,
              STATUS: status,
              COMMENTQTY: '0',
              NWCOMMENTQTY: '0',
              ERRORMESSAGE: status === 'FAIL' ? 'Error row fixture' : '',
            }))
          : mockCase === 'dummy-test'
            ? [
                ...mockFurnaceKjBatchList.rows,
                ...mockFurnaceKjBatchList.rows,
                ...mockFurnaceKjBatchList.rows,
              ]
            : mockFurnaceKjBatchList.rows;
      const rows = sourceRows.map((row) => ({
        ...row,
        ...(mockCase === 'dummy-test' || mockCase === 'row-statuses'
          ? {}
          : { LOTID: request.LOTID }),
        ...(mockCase === 'unread-comments'
          ? { COMMENTQTY: '1', NWCOMMENTQTY: '1', ISCHECK: 'N' }
          : {}),
      }));
      return mockSuccess({
        ...mockFurnaceKjBatchList,
        rows,
        dummyLotIds: mockCase === 'dummy-test' ? ['LOT-DUMMY-01', '', 'LOT-DUMMY-03'] : [],
        ...(mockCase === 'unread-comments' ? { NWCOMMENTQTY: '1' } : {}),
      });
    },
    async fetchEquipmentInfo() {
      await Promise.resolve();
      if (mockCase === 'equipment-error') return mockFailure('장비 조회 mock 오류');
      return mockSuccess({
        ...mockFurnaceKjEquipment,
        ...(mockCase === 'equipment-notices'
          ? { PMMESSAGE: 'PM notice', CYCLE_MESSAGE: 'Cycle one/Cycle two' }
          : {}),
        ...(mockCase.endsWith('-generic') ? { FURNACE: 'OTHER' as const } : {}),
      });
    },
    async fetchRecipeInfo() {
      await Promise.resolve();
      recipeLookupCount += 1;
      if (mockCase === 'equipment-down' && recipeLookupCount === 1) {
        return mockFailure('현재 장비 상태가 비부하DOWN 입니다.');
      }
      if (mockCase === 'recipe-error') return mockFailure('Recipe 조회 mock 오류');
      return mockSuccess(
        mockCase === 'recipe-warnings'
          ? {
              ...mockFurnaceKjRecipe,
              ETCHMESSAGE: 'Confirm the preceding ETCH machine.',
              MULTIMOVEINACTION: 'Another LOT is moving in.',
            }
          : mockFurnaceKjRecipe,
      );
    },
    async checkInterlock() {
      await Promise.resolve();
      if (mockCase === 'interlock-error') return mockFailure('Interlock 조회 mock 오류');
      return mockSuccess(
        mockCase === 'interlock' ? { RET: '', INTLK: 'Y' } : mockFurnaceKjInterlock,
      );
    },
    async fetchKjPortStatus() {
      await Promise.resolve();
      if (mockCase === 'port-error') return mockFailure('PORT 조회 mock 오류');
      const portState =
        mockCase === 'port-complete'
          ? 'COMPLETE'
          : mockCase === 'port-run' || mockCase === 'port-run-generic'
            ? 'RUN'
            : mockCase === 'port-pending' || mockCase === 'port-pending-generic'
              ? 'PENDING'
              : mockCase === 'port-init' || mockCase === 'port-init-generic'
                ? 'INIT'
                : 'IDLE';
      return mockSuccess({
        ...mockFurnaceKjPort,
        PORTSTATENAME: portState,
        ACKMSG: mockCase === 'port-run-generic' ? 'Port acknowledgement' : '',
        PORTLOTNAME: 'BATCH-KJ-01',
        PORTSTATENAME1: portState,
      });
    },
    async clearPort() {
      await Promise.resolve();
      if (mockCase === 'clear-port-error') return mockFailure('PORT 초기화 mock 오류');
      return mockSuccess(null);
    },
    async changeEquipmentStatus() {
      await Promise.resolve();
      if (mockCase === 'equipment-status-error') return mockFailure('장비 상태 변경 mock 오류');
      return mockSuccess(mockFurnaceKjCommand);
    },
    async startKjRemote() {
      await Promise.resolve();
      if (mockCase === 'start-error') return mockFailure('Furnace KJ 처리 mock 오류');
      return mockSuccess(null);
    },
  };
}
