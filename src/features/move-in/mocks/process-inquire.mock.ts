import type { MeasureRow, MeasureStatus } from '../types/process-inquire.types';

export type ProcessInquireMockScenario =
  | 'normal'
  | 'skip-warning'
  | 'skip-confirm'
  | 'move-in-finish'
  | 'measure-error';

export const MOCK_MEASURE_ROWS: MeasureRow[] = [
  {
    id: 'CD',
    subOperation: 'CD',
    processName: 'Critical Dimension',
    status: 'N',
    description: 'Critical Dimension check',
  },
  {
    id: 'OVER',
    subOperation: 'OVER',
    processName: 'Overlay',
    status: 'Y',
    description: 'Overlay alignment check',
  },
  {
    id: 'ETC',
    subOperation: 'ETC',
    processName: 'Etching',
    status: 'N',
    description: 'Etching wafer quality review',
  },
];

export const mockMeasureInfoResponse = {
  product: 'HIFI-UI-DEMO',
  operation: 'OP01',
  subOperation: 'A1',
  photoJobCode: 'PHOTO-DEMO',
  processStep: 'VI',
  quantity: '25',

  slotList: '01,02,03,04',
  waferList: '01,02,03,04',
  semSlotList: '05,06,07,08',
  semWaferList: '05,06,07,08',

  measureItems: MOCK_MEASURE_ROWS.map((row) => ({
    ...row,
  })),
};

export const mockSlotInfoResponse = {
  waferList: '01,02,03,04,05,06,07,08,09,10',
};

export const mockCheckDiCycleResponse = {
  diCycle: 'Y',

  items: [
    {
      PHOTOOPERTYPE: 'CD',
    },
    {
      PHOTOOPERTYPE: 'OVER',
    },
  ],
};

export const mockMeasureSetResponse = {
  RECIPE: 'RECIPE-001',
  EQPGROUP: 'EQP-GROUP-A',
  CHANGEEQPGROUP: 'EQP-GROUP-B',
  PROCESSSTEP: 'VI',
  COMMENTQTY: '10',
  NRWCOMMENTQTY: '2',
};

export const mockMoveInResponse = {
  finish: 'Y',
};

export function createProcessInquireMockScenario(scenario: ProcessInquireMockScenario = 'normal'): {
  measureInfo: typeof mockMeasureInfoResponse;
  slotInfo: typeof mockSlotInfoResponse;
  diCycle: typeof mockCheckDiCycleResponse;
  measureSet: typeof mockMeasureSetResponse;
  moveIn: typeof mockMoveInResponse;
} {
  const baseMeasureItems: MeasureRow[] = MOCK_MEASURE_ROWS.map((row) => ({
    ...row,
  }));

  const selectedStatus: Record<ProcessInquireMockScenario, MeasureStatus[]> = {
    normal: ['N', 'Y', 'N'],

    'skip-warning': ['N', 'Y', 'N'],

    'skip-confirm': ['Y', 'N', 'N'],

    'move-in-finish': ['C', 'C', 'C'],

    'measure-error': ['N', 'Y', 'N'],
  };

  const measureItems = baseMeasureItems.map((item, index) => ({
    ...item,
    status: selectedStatus[scenario][index] ?? item.status,
  }));

  const diCycle =
    scenario === 'skip-warning'
      ? {
          ...mockCheckDiCycleResponse,
          diCycle: 'Y',
        }
      : {
          ...mockCheckDiCycleResponse,
          diCycle: 'N',
        };

  const moveIn =
    scenario === 'move-in-finish'
      ? {
          finish: 'Y',
        }
      : {
          finish: 'N',
        };

  return {
    measureInfo: {
      ...mockMeasureInfoResponse,

      measureItems,
    },

    slotInfo: {
      ...mockSlotInfoResponse,
    },

    diCycle,

    measureSet: {
      ...mockMeasureSetResponse,
    },

    moveIn,
  };
}

export const PROCESS_INQUIRE_MOCK_SCENARIOS: Record<ProcessInquireMockScenario, string> = {
  normal: 'Flow measurement is normal.',

  'skip-warning': 'Warning: Skip due to DI cycle.',

  'skip-confirm': 'Skip confirmation without errors.',

  'move-in-finish': 'Move-in complete.',

  'measure-error': 'Measurement setup / simulation failure',
};
