import {
  actionMock,
  getRemoteMachineSelectMockCase,
  isRemoteMachineSelectMockLot,
  isRemoteMachineSelectMockMachine,
  lotInfoMock,
  portStatusMock,
  remoteEQPEENInfoMock,
  remoteEQPInfoMock,
} from 'src/features/remote-machine-select/mocks/remote-machine-select.mock';
import { describe, expect, it } from 'vitest';

describe('RemoteMachineSelect mock data', () => {
  it('recognizes the supported LOT and machine IDs without case sensitivity', () => {
    expect(isRemoteMachineSelectMockLot(' wp00001 ')).toBe(true);
    expect(isRemoteMachineSelectMockLot('WP-LARGE')).toBe(true);
    expect(isRemoteMachineSelectMockLot('WP-RUN')).toBe(true);
    expect(isRemoteMachineSelectMockLot('WP-HOLD')).toBe(true);
    expect(isRemoteMachineSelectMockLot('UNKNOWN')).toBe(false);
    expect(isRemoteMachineSelectMockMachine(' photo01 ')).toBe(true);
    expect(isRemoteMachineSelectMockMachine('PHOTO02')).toBe(true);
    expect(isRemoteMachineSelectMockMachine('UNKNOWN')).toBe(false);
  });

  it('returns the LOT fields used by the PHOTO flow and rejects unknown LOTs', async () => {
    expect((await lotInfoMock('WP00001')).messageBody).toMatchObject({
      STATUS: 'WAIT',
      STATE: 'WIP',
      AREA: 'PHOTO',
      PHOTOTYPE: 'PH',
    });
    expect(await lotInfoMock('UNKNOWN')).toMatchObject({
      isSuccess: false,
      errorMessage: 'Mock LOT not found: UNKNOWN',
    });
  });

  it('provides preview cases for populated, blocked, long, and empty screens', async () => {
    expect(getRemoteMachineSelectMockCase('ready')).toEqual({
      lotId: 'WP00001',
      machineId: 'PHOTO01',
      portId: 'P01',
    });
    expect(getRemoteMachineSelectMockCase('busy').portId).toBe('P02');
    expect(getRemoteMachineSelectMockCase('idle').portId).toBe('P03');
    expect(getRemoteMachineSelectMockCase('empty').lotId).toBe('');
    expect(getRemoteMachineSelectMockCase('unknown')).toEqual(
      getRemoteMachineSelectMockCase('ready'),
    );
    expect((await lotInfoMock('WP-LARGE')).messageBody.PRODUCT).toContain('LONG-PRODUCT');
    expect((await lotInfoMock('WP-RUN')).messageBody.STATUS).toBe('RUN');
    expect((await lotInfoMock('WP-HOLD')).messageBody.HOLDSTATUS).toBe('ONHOLD');
  });

  it('provides local and non-local machine data and rejects unknown machines', async () => {
    expect((await remoteEQPInfoMock('PHOTO01')).messageBody.ISLOCALTRACK).toBe('Y');
    expect((await remoteEQPInfoMock('PHOTO02')).messageBody.ISLOCALTRACK).toBe('N');
    expect(await remoteEQPInfoMock('UNKNOWN')).toMatchObject({
      isSuccess: false,
      errorMessage: 'Mock machine not found: UNKNOWN',
    });
    expect((await remoteEQPEENInfoMock()).isSuccess).toBe(true);
  });

  it('provides READY, RUN, and IDLE port states and rejects invalid IDs', async () => {
    expect((await portStatusMock('PHOTO01', 'p01')).messageBody.PORTSTATENAME).toBe('READY');
    expect((await portStatusMock('PHOTO01', 'P02')).messageBody.PORTSTATENAME).toBe('RUN');
    expect((await portStatusMock('PHOTO01', 'P03')).messageBody.PORTSTATENAME).toBe('IDLE');
    expect((await portStatusMock('UNKNOWN', 'P01')).isSuccess).toBe(false);
    expect((await portStatusMock('PHOTO01', 'P99')).isSuccess).toBe(false);
    expect((await actionMock()).isSuccess).toBe(true);
  });
});
