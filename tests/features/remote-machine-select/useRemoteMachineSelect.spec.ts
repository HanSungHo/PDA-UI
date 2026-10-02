import { beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  lotInfo: vi.fn(),
  remoteEQPInfo2: vi.fn(),
  remoteEQPEENInfo: vi.fn(),
  machinePortStatus: vi.fn(),
  photoChangeEQPStatus: vi.fn(),
  photoLotStart: vi.fn(),
  photoLotReserve: vi.fn(),
}));

vi.mock('src/features/remote-machine-select/services/remote-machine-select.service', () => service);

import { useRemoteMachineSelect } from 'src/features/remote-machine-select/composables/useRemoteMachineSelect';

const success = (messageBody: Record<string, string> = {}) => ({
  isSuccess: true,
  messageBody,
  errorMessage: '',
});
const failure = (errorMessage: string) => ({ isSuccess: false, messageBody: {}, errorMessage });

const lot = {
  PRODUCT: 'PRODUCT-A',
  PROCESSSTEP: 'BARC COATING',
  OPERATION: '10000',
  SUBOPERATION: '00',
  STATUS: 'WAIT',
  STATE: 'WIP',
  AREA: 'PHOTO',
  PHOTOTYPE: 'PH',
  TREEFLAG: 'N',
  QUANTITY: '25',
};

function setup() {
  const onComplete = vi.fn();
  const onOpenChildScreen = vi.fn();
  const onRequestMachineFocus = vi.fn();
  const confirm = vi.fn().mockResolvedValue(true);
  const screen = useRemoteMachineSelect({
    facility: 'FAB-A',
    lotId: 'LOT-A',
    operatorId: 'OP-A',
    operatorName: 'Operator A',
    onComplete,
    onOpenChildScreen,
    onRequestMachineFocus,
    confirm,
  });
  return { ...screen, onComplete, onOpenChildScreen, onRequestMachineFocus, confirm };
}

describe('RemoteMachineSelect hifos2 flow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    service.lotInfo.mockResolvedValue(success(lot));
    service.remoteEQPEENInfo.mockResolvedValue(success());
    service.machinePortStatus.mockResolvedValue(success({ PORTSTATENAME: 'READY' }));
    service.photoLotStart.mockResolvedValue(success());
    service.photoLotReserve.mockResolvedValue(success());
  });

  it('keeps the original operation in API requests and starts a local track LOT after EEN and READY checks', async () => {
    service.remoteEQPInfo2.mockResolvedValue(
      success({
        MAINEQPID: 'PHOTO01',
        PROCEQPID: 'PHOTO01',
        ISLOCALTRACK: 'Y',
        PORTNAME: 'P01,P02',
        BARCCOUNT: '1',
        PMMESSAGE: 'PM warning',
        RECIPE: 'RCP-A',
        PRNAME: 'PR-A',
      }),
    );
    const screen = setup();

    await screen.searchData('LOT-A');
    screen.state.machineSelect = 'PHOTO01-P01';
    await screen.setEQPInfo();

    expect(service.remoteEQPInfo2).toHaveBeenCalledWith(
      'PHOTO01',
      'MVIN',
      'LOT-A',
      'FAB-A',
      '10000',
      '00',
    );
    expect(service.remoteEQPEENInfo).toHaveBeenCalledOnce();
    expect(screen.state.portStatus).toBe('READY');
    expect(screen.state.okDisabled).toBe(false);
    expect(screen.state.dialogTitle).toBe('BARC COUNT');
    screen.dismissDialog();
    expect(screen.state.dialogMessage).toBe('PM warning');
    screen.dismissDialog();

    await screen.execute();

    expect(service.photoLotStart).toHaveBeenCalledWith(
      expect.arrayContaining([
        ['MACHINENAME', 'PHOTO01'],
        ['PORTNAME', 'P01'],
        ['OPERATIONNAME', '10000'],
      ]),
    );
    expect(screen.onComplete).toHaveBeenCalledOnce();
  });

  it('reserves the main machine for a non-local track LOT', async () => {
    service.remoteEQPInfo2.mockResolvedValue(
      success({
        MAINEQPID: 'PHOTO-MAIN',
        PROCEQPID: 'PHOTO02',
        ISLOCALTRACK: 'N',
        PORTNAME: 'P01',
      }),
    );
    const screen = setup();

    await screen.searchData('LOT-A');
    screen.state.machineSelect = 'PHOTO02-P01';
    await screen.setEQPInfo();
    await screen.execute();

    expect(service.remoteEQPEENInfo).not.toHaveBeenCalled();
    expect(service.photoLotReserve).toHaveBeenCalledWith('PHOTO-MAIN', 'P01', 'LOT-A');
    expect(screen.onComplete).toHaveBeenCalledOnce();
  });

  it('keeps the PORT warning and ACK as separate dialogs and blocks confirmation', async () => {
    service.remoteEQPInfo2.mockResolvedValue(
      success({ MAINEQPID: 'PHOTO01', PROCEQPID: 'PHOTO01', PORTNAME: 'P02' }),
    );
    service.machinePortStatus.mockResolvedValue(
      success({ PORTSTATENAME: 'RUN', ACKMSG: 'Machine ACK' }),
    );
    const screen = setup();

    await screen.searchData('LOT-A');
    screen.state.machineSelect = 'PHOTO01-P02';
    await screen.setEQPInfo();

    expect(screen.state.okDisabled).toBe(true);
    expect(screen.state.dialogTitle).toBe('장비 MASSAGE');
    screen.dismissDialog();
    expect(screen.state.dialogTitle).toBe('PORT WORNING');
    expect(screen.state.dialogMessage).toBe('Machine ACK');
    expect(screen.onRequestMachineFocus).toHaveBeenCalledOnce();
  });

  it('shows the Android select-port message when OK is pressed before a PORT is chosen', async () => {
    const screen = setup();

    await screen.searchData('LOT-A');
    expect(screen.state.okDisabled).toBe(false);
    await screen.execute();

    expect(screen.state.dialogMessage).toBe('진행 Port를 먼저 선택하세요.');
    expect(service.photoLotReserve).not.toHaveBeenCalled();
    expect(service.photoLotStart).not.toHaveBeenCalled();
  });

  it.each([
    ['already RUN', { STATUS: 'RUN' }, '이미 MOVE IN된 LOT입니다.'],
    [
      'not WIP',
      { STATE: 'SCRAP', OPERATION: 'P00002' },
      'SCRAP 상태입니다. 자동화 진행이 불가합니다.',
    ],
    ['on HOLD', { HOLDSTATUS: 'ONHOLD' }, 'HOLD된 LOT입니다. 자동화 진행이 불가합니다.'],
  ])('blocks a LOT that is %s', async (_case, overrides, message) => {
    service.lotInfo.mockResolvedValue(success({ ...lot, ...overrides }));
    const screen = setup();

    await screen.searchData('LOT-A');

    expect(screen.state.machineDisabled).toBe(true);
    expect(screen.state.okDisabled).toBe(true);
    expect(screen.state.dialogMessage).toBe(message);
    expect(service.remoteEQPInfo2).not.toHaveBeenCalled();
  });

  it.each([
    ['MEAS', { OPTYPE: 'M', PHOTOTYPE: '', EQPTYPE: '' }, 'meas'],
    ['IMP', { AREA: 'IMP', PHOTOTYPE: '', EQPTYPE: '' }, 'imp'],
    ['CVD', { AREA: 'CVD', PHOTOTYPE: '', EQPTYPE: '' }, 'cvd'],
  ])('opens the %s child route with LOTID', async (_case, overrides, flow) => {
    service.lotInfo.mockResolvedValue(success({ ...lot, ...overrides }));
    const screen = setup();

    await screen.searchData('LOT-A');

    expect(screen.onOpenChildScreen).toHaveBeenCalledWith(flow, 'LOT-A');
    expect(screen.state.dialogMessage).toBe('');
  });

  it('gives MEAS priority when the same LOT is also in the IMP area', async () => {
    service.lotInfo.mockResolvedValue(
      success({ ...lot, AREA: 'IMP', OPTYPE: 'M', PHOTOTYPE: '', EQPTYPE: '' }),
    );
    const screen = setup();

    await screen.searchData('LOT-A');

    expect(screen.onOpenChildScreen).toHaveBeenCalledOnce();
    expect(screen.onOpenChildScreen).toHaveBeenCalledWith('meas', 'LOT-A');
  });

  it('uses LOTINFO AREA to skip EQP lookup for PQC', async () => {
    service.lotInfo.mockResolvedValue(success({ ...lot, AREA: 'PQC' }));
    const screen = setup();

    await screen.searchData('LOT-A');
    screen.state.machineSelect = 'PHOTO01-P01';
    await screen.setEQPInfo();

    expect(screen.onOpenChildScreen).not.toHaveBeenCalled();
    expect(service.remoteEQPInfo2).not.toHaveBeenCalled();
  });

  it('rejects missing LOT and failed LOTINFO requests', async () => {
    const screen = setup();
    await screen.searchData('');
    expect(service.lotInfo).not.toHaveBeenCalled();
    expect(screen.state.dialogMessage).toBe('LOT NO를 입력하세요.');

    screen.dismissDialog();
    service.lotInfo.mockResolvedValue(failure('LOT not found'));
    await screen.searchData('LOT-A');
    expect(screen.state.dialogMessage).toBe('LOT not found');
    expect(screen.state.loading).toBe(false);
  });

  it('keeps inline and Tree warnings in order and blocks an unmatched stepper', async () => {
    service.lotInfo.mockResolvedValue(
      success({
        ...lot,
        TREEFLAG: 'Y',
        C1STEPPERNAME: 'EXPECTED-01',
        INLINESAMPLEMESSGE: 'Sample warning',
      }),
    );
    const screen = setup();
    await screen.searchData('LOT-A');
    expect(screen.state.dialogMessage).toBe('Sample warning');
    screen.dismissDialog();
    expect(screen.state.dialogMessage).toContain('EXPECTED-01');
    screen.dismissDialog();

    screen.state.machineSelect = 'PHOTO01-P01';
    await screen.setEQPInfo();
    expect(screen.state.machineDisabled).toBe(true);
    expect(screen.state.okDisabled).toBe(true);
    expect(service.remoteEQPInfo2).not.toHaveBeenCalled();
  });

  it('clears a machine without a PORT separator and skips unsupported FAB groups', async () => {
    const screen = setup();
    await screen.searchData('LOT-A');
    screen.state.machineSelect = 'INVALID';
    await screen.setEQPInfo();
    expect(screen.state.machineSelect).toBe('');
    expect(screen.state.dialogMessage).toBe('유효하지 않은 장비입니다.');

    screen.dismissDialog();
    screen.state.eqpGroup = 'FAB2';
    screen.state.machineSelect = 'PHOTO01-P01';
    await screen.setEQPInfo();
    expect(service.remoteEQPInfo2).not.toHaveBeenCalled();
  });

  it('checks EEN and stops before PORT status when EEN fails', async () => {
    service.remoteEQPInfo2.mockResolvedValue(
      success({ MAINEQPID: 'PHOTO01', PROCEQPID: 'PHOTO01', ISLOCALTRACK: 'Y', PORTNAME: 'P01' }),
    );
    service.remoteEQPEENInfo.mockResolvedValue(failure('EEN blocked'));
    const screen = setup();
    await screen.searchData('LOT-A');
    screen.state.machineSelect = 'PHOTO01-P01';
    await screen.setEQPInfo();

    expect(screen.state.dialogMessage).toBe('EEN blocked');
    expect(screen.state.okDisabled).toBe(true);
    expect(service.machinePortStatus).not.toHaveBeenCalled();
    expect(screen.state.loading).toBe(false);

    await screen.setPortStatus();
    await screen.execute();
    expect(service.machinePortStatus).not.toHaveBeenCalled();
    expect(service.photoLotStart).not.toHaveBeenCalled();
    screen.dismissDialog();
    expect(screen.state.dialogMessage).toBe('PORT 상태를 먼저 확인하세요.');
  });

  it('retries EQP lookup after confirmed machine-status correction', async () => {
    service.remoteEQPInfo2
      .mockResolvedValueOnce(failure('현재 장비 상태가 잘못되었습니다.'))
      .mockResolvedValueOnce(
        success({ MAINEQPID: 'PHOTO01', PROCEQPID: 'PHOTO01', PORTNAME: 'P01' }),
      );
    service.photoChangeEQPStatus.mockResolvedValue(success());
    const screen = setup();
    await screen.searchData('LOT-A');
    screen.state.machineSelect = 'PHOTO01-P01';
    await screen.setEQPInfo();

    expect(screen.confirm).toHaveBeenCalledOnce();
    expect(service.photoChangeEQPStatus).toHaveBeenCalledWith('PHOTO01', 'OP-A');
    expect(service.remoteEQPInfo2).toHaveBeenCalledTimes(2);
    expect(screen.state.selectedPort).toBe('P01');
  });

  it('disables OK for IDLE and reports a failed PORT status request', async () => {
    service.remoteEQPInfo2.mockResolvedValue(
      success({ MAINEQPID: 'PHOTO01', PROCEQPID: 'PHOTO01', PORTNAME: 'P03' }),
    );
    service.machinePortStatus.mockResolvedValue(success({ PORTSTATENAME: 'IDLE' }));
    const screen = setup();
    await screen.searchData('LOT-A');
    screen.state.machineSelect = 'PHOTO01-P03';
    await screen.setEQPInfo();
    expect(screen.state.portStatusKind).toBe('idle');
    expect(screen.state.okDisabled).toBe(true);
    expect(screen.state.dialogMessage).toBe('CST가 LOAD되어 있지 않습니다.');
    expect(screen.onRequestMachineFocus).toHaveBeenCalledOnce();

    await screen.execute();
    expect(service.photoLotReserve).not.toHaveBeenCalled();

    screen.dismissDialog();
    expect(screen.state.dialogMessage).toBe('PORT 상태를 먼저 확인하세요.');
    screen.dismissDialog();
    service.machinePortStatus.mockResolvedValue(failure('Port request failed'));
    await screen.setPortStatus();
    expect(screen.state.dialogMessage).toBe('Port request failed');
    expect(screen.state.okDisabled).toBe(true);
    expect(screen.onRequestMachineFocus).toHaveBeenCalledTimes(2);
  });

  it.each(['', '  '])(
    'shows a PORT error and requests machine focus when status is %j',
    async (status) => {
      service.remoteEQPInfo2.mockResolvedValue(
        success({ MAINEQPID: 'PHOTO01', PROCEQPID: 'PHOTO01', ISLOCALTRACK: 'N', PORTNAME: 'P01' }),
      );
      service.machinePortStatus.mockResolvedValue(success({ PORTSTATENAME: status }));
      const screen = setup();

      await screen.searchData('LOT-A');
      screen.state.machineSelect = 'PHOTO01-P01';
      await screen.setEQPInfo();

      expect(screen.state.portStatus).toBe('');
      expect(screen.state.portStatusKind).toBe('');
      expect(screen.state.okDisabled).toBe(true);
      expect(screen.state.dialogTitle).toBe('장비 MASSAGE');
      expect(screen.state.dialogMessage).toBe(
        'PORT 정보를 가져올 수 없습니다.\n잠시후 다시 확인 바랍니다.',
      );
      expect(screen.onRequestMachineFocus).toHaveBeenCalledOnce();
    },
  );

  it('does not send a reservation after cancellation and keeps the screen on API failure', async () => {
    service.remoteEQPInfo2.mockResolvedValue(
      success({ MAINEQPID: 'PHOTO01', PROCEQPID: 'PHOTO01', PORTNAME: 'P01' }),
    );
    const screen = setup();
    await screen.searchData('LOT-A');
    screen.state.machineSelect = 'PHOTO01-P01';
    await screen.setEQPInfo();

    screen.confirm.mockResolvedValueOnce(false);
    await screen.execute();
    expect(service.photoLotReserve).not.toHaveBeenCalled();

    service.photoLotReserve.mockResolvedValue(failure('Reservation rejected'));
    await screen.execute();
    expect(screen.state.dialogMessage).toBe('Reservation rejected');
    expect(screen.onComplete).not.toHaveBeenCalled();
  });
});
