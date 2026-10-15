import type { EtchCommRcpResponseBody } from '../types/remoteEtchCommRcp.types';

/**
 * Mock case 1: TE8500 series
 * - COMM2ND: "60 초"
 * - Includes a VALUE = "-" (to test Rule #5: Data cleansing removing "-")
 * - Supports Rule #2 flow: Loading time via the txtOwner string
 */
export const mockTe8500Response: EtchCommRcpResponseBody = {
  DOWNLOAD: 'Y',
  PROCESS_TYPE: 'TE8500',
  SAMPLE_CHK: '',
  OWNERCODE: 'TE_OP_01',
  EQP_TYPE: 'TE8500',
  COMM2ND: '60 초',
  STI_PROC_RCP: '',
  COMMRCP: [
    { COL: '진행 TIME', VALUE: '60', RESULT: '' },
    { COL: 'RF POWER', VALUE: '450', RESULT: '' },
    { COL: 'PRESSURE', VALUE: '25.0', RESULT: '' },
    { COL: 'UNUSED_PARAM', VALUE: '-', RESULT: '' }, // This line will be automatically deleted.
  ],
};

/**
 * Mock case 2: eMAX CT / DPS POLY series
 * - Includes STI_PROC_RCP to test Rule #1: Replacing the original RECIPE
 * - Includes models sharing the same STEP to test Rule #3: STEP Batching (@)
 */
export const mockEmaxCtResponse: EtchCommRcpResponseBody = {
  DOWNLOAD: 'Y',
  PROCESS_TYPE: 'eMAX CT',
  SAMPLE_CHK: 'Sample verification required before run', // Test Rule #8: Sample warning
  OWNERCODE: 'EMAX_OWN_02',
  EQP_TYPE: 'eMAX',
  PARA2ND: 'RF_TUNING',
  VALUE2ND: '150W',
  COMM2ND: '',
  STI_PROC_RCP: 'PROC_ETCH_REPLACED_01', // Test Rule #1
  COMMRCP: [
    {
      CHAMBER: 'CH1',
      ETCVALUE: 'RF Top',
      BASE_VALUE: '300',
      TUNE_VALUE: '320',
      STEP: '1',
      RMS_PARANAME: 'RF_TOP_PWR',
      RESULT: '',
    },
    {
      CHAMBER: 'CH1',
      ETCVALUE: 'RF Bottom',
      BASE_VALUE: '100',
      TUNE_VALUE: '110',
      STEP: '1', // Same Step 1 -> Batching in the same line
      RMS_PARANAME: 'RF_BOT_PWR',
      RESULT: '',
    },
    {
      CHAMBER: 'CH1',
      ETCVALUE: 'Pressure',
      BASE_VALUE: '20',
      TUNE_VALUE: '25',
      STEP: '2',
      RMS_PARANAME: 'CH_PRESS',
      RESULT: '',
    },
    {
      CHAMBER: 'CH1',
      ETCVALUE: 'O2 Flow',
      BASE_VALUE: '15',
      TUNE_VALUE: '', // Test Rule #4: Empty tune values will be skipped.
      STEP: '2',
      RMS_PARANAME: 'O2_FLOW',
      RESULT: '',
    },
  ],
};
