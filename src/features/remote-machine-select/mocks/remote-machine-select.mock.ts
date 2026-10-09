import type { RemoteMachineResponse } from '../types/remote-machine-select.types';

const MOCK_LOT_IDS = new Set(['WP00001', 'WP-LARGE', 'WP-RUN', 'WP-HOLD']);
const MOCK_MACHINE_IDS = new Set(['PHOTO01', 'PHOTO02']);

export const remoteMachineSelectMockCases = {
  ready: { lotId: 'WP00001', machineId: 'PHOTO01', portId: 'P01' },
  busy: { lotId: 'WP00001', machineId: 'PHOTO01', portId: 'P02' },
  idle: { lotId: 'WP00001', machineId: 'PHOTO01', portId: 'P03' },
  long: { lotId: 'WP-LARGE', machineId: 'PHOTO01', portId: 'P01' },
  run: { lotId: 'WP-RUN', machineId: '', portId: '' },
  hold: { lotId: 'WP-HOLD', machineId: '', portId: '' },
  empty: { lotId: '', machineId: '', portId: '' },
} as const;

export function getRemoteMachineSelectMockCase(name: string) {
  return (
    remoteMachineSelectMockCases[name as keyof typeof remoteMachineSelectMockCases] ??
    remoteMachineSelectMockCases.ready
  );
}

function success(messageBody: Record<string, string> = {}): RemoteMachineResponse {
  return { isSuccess: true, messageBody, errorMessage: '' };
}

function failure(errorMessage: string): RemoteMachineResponse {
  return { isSuccess: false, messageBody: {}, errorMessage };
}

export function isRemoteMachineSelectMockLot(lotId: string): boolean {
  return MOCK_LOT_IDS.has(lotId.trim().toUpperCase());
}

export function isRemoteMachineSelectMockMachine(machineId: string): boolean {
  return MOCK_MACHINE_IDS.has(machineId.trim().toUpperCase());
}

export async function lotInfoMock(lotId: string): Promise<RemoteMachineResponse> {
  await Promise.resolve();

  if (!isRemoteMachineSelectMockLot(lotId)) {
    return failure(`Mock LOT not found: ${lotId}`);
  }

  const normalizedLotId = lotId.trim().toUpperCase();

  return success({
    PRODUCT:
      normalizedLotId === 'WP-LARGE'
        ? 'P-DM-TEST-6F-LONG-PRODUCT-NAME-FOR-LAYOUT-VERIFICATION'
        : 'P-DM-TEST-6F',
    RECIPE: 'RCP-A100',
    EQPGROUP: 'PHOTO_TRACK_GROUP',
    JOBCODE: '20151115',
    PROCESSSTEP:
      normalizedLotId === 'WP-LARGE' ? 'BARC COATING LONG PROCESS DESCRIPTION' : 'BARC COATING',
    OPERATION: 'P00002',
    SUBOPERATION: '00',
    STATUS: normalizedLotId === 'WP-RUN' ? 'RUN' : 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: normalizedLotId === 'WP-HOLD' ? 'ONHOLD' : '',
    QUANTITY: '25',
    NEXTOPERATION: 'P00003',
    NEXTSUBOPERATION: '00',
    NEXTPROCESSSTEP:
      normalizedLotId === 'WP-LARGE' ? 'PR COATING NEXT LONG PROCESS DESCRIPTION' : 'PR COATING',
    OPTYPE: 'P',
    AREA: 'PHOTO',
    TREEFLAG: 'N',
    C1STEPPERNAME: '',
    PHOTOTYPE: 'PH',
    INLINESAMPLEMESSGE: '',
    EQPTYPE: 'TRACK',
    EQP_MODEL: '',
  });
}

export async function remoteEQPInfoMock(eqpId: string): Promise<RemoteMachineResponse> {
  await Promise.resolve();

  if (!isRemoteMachineSelectMockMachine(eqpId)) {
    return failure(`Mock machine not found: ${eqpId}`);
  }

  const isLocalTrack = eqpId.trim().toUpperCase() === 'PHOTO01';

  return success({
    MAINEQPID: eqpId,
    PROCEQPID: eqpId,
    ISLOCALTRACK: isLocalTrack ? 'Y' : 'N',
    PRNAME: 'PR-PHOTO-01',
    RECIPE: 'RCP-A100-REMOTE',
    INLINEMODE: 'AUTO',
    LAYERID: 'LAYER-01',
    RANDOMFLAG: 'N',
    SAMPLEFLAG: 'Normal',
    EQPTYPE: 'TRACK',
    REWORK_CODE: '',
    BARCCOUNT: '0',
    PMMESSAGE: '',
    PORTNAME: 'P01,P02,P03',
  });
}

export async function remoteEQPEENInfoMock(): Promise<RemoteMachineResponse> {
  await Promise.resolve();
  return success();
}

export async function portStatusMock(
  eqpId: string,
  portName: string,
): Promise<RemoteMachineResponse> {
  await Promise.resolve();

  if (!isRemoteMachineSelectMockMachine(eqpId)) {
    return failure(`Mock machine not found: ${eqpId}`);
  }

  const statusByPort: Record<string, string> = { P01: 'READY', P02: 'RUN', P03: 'IDLE' };
  const portStatus = statusByPort[portName.toUpperCase()];

  if (!portStatus) return failure(`Mock PORT not found: ${portName}`);

  return success({ PORTSTATENAME: portStatus, ACKMSG: '' });
}

export async function actionMock(): Promise<RemoteMachineResponse> {
  await Promise.resolve();
  return success({ MESSAGE: 'Mock remote machine action completed.' });
}
