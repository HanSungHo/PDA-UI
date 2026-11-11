import { ROUTE } from 'src/constants/routes';
import { useRemoteMeasMain } from 'src/features/remote-meas-main/composables/use-remote-meas-main';
import { okDialog } from 'src/services/ok-dialog.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({ xrfEqpTypeCheck: vi.fn() }));
const barcode = vi.hoisted(() => ({ barcodeStyleEqpId: vi.fn() }));

vi.mock('src/features/remote-meas-main/services/remote-meas-main.service', () => service);
vi.mock('src/utils/barcode-style', () => barcode);

function setup() {
  const hideKeyboard = vi.fn();
  const launch = vi.fn();
  return { screen: useRemoteMeasMain({ hideKeyboard, launch }), hideKeyboard, launch };
}

function item(MODEL: string, MAINEQPID: string) {
  return { MODEL, MAINEQPID };
}

describe('useRemoteMeasMain', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    service.xrfEqpTypeCheck.mockResolvedValue([item('XRF-RIGAKU', 'XRF-01')]);
  });

  afterEach(() => {
    okDialog.confirm();
    okDialog.title.value = '';
    okDialog.message.value = '';
  });

  it('upper-cases txt_machine like InputFilter.AllCaps', () => {
    const { screen } = setup();

    screen.updateTxtMachine('xrf-01');

    expect(screen.txtMachine.value).toBe('XRF-01');
  });

  it('asks for the equipment name when txt_machine is empty', async () => {
    const { screen, hideKeyboard, launch } = setup();

    await screen.checkEqpType();

    expect(hideKeyboard).toHaveBeenCalledOnce();
    expect(service.xrfEqpTypeCheck).not.toHaveBeenCalled();
    expect(launch).not.toHaveBeenCalled();
    expect(okDialog.title.value).toBe('에  러');
    expect(okDialog.message.value).toBe('장비명을 입력하여 주세요.');
    expect(okDialog.confirmLabel.value).toBe('확인');
  });

  it.each([
    ['AIT-XP', 'AIT-01', ROUTE.remoteAit],
    ['AEGIS-200', 'AEGIS-01', ROUTE.remoteAegis],
    ['XRF-RIGAKU', 'XRF-01', ROUTE.remoteXrf],
    ['', 'MEAS-01', ROUTE.remoteXrf],
  ])('opens the screen for MODEL %s with MAINEQPID as Eqpid', async (model, mainEqpId, target) => {
    service.xrfEqpTypeCheck.mockResolvedValueOnce([item(model, mainEqpId)]);
    const { screen, launch } = setup();
    screen.updateTxtMachine('eqp-sub');

    await screen.checkEqpType();

    expect(service.xrfEqpTypeCheck).toHaveBeenCalledWith('EQP-SUB');
    expect(launch).toHaveBeenCalledExactlyOnceWith(target, mainEqpId);
  });

  it('checks AIT before AEGIS and uses the last ITEM row, as the Android loop does', async () => {
    service.xrfEqpTypeCheck
      .mockResolvedValueOnce([item('AIT-AEGIS', 'BOTH-01')])
      .mockResolvedValueOnce([item('AIT-XP', 'AIT-01'), item('AEGIS-200', 'AEGIS-01')]);
    const { screen, launch } = setup();
    screen.updateTxtMachine('X');

    await screen.checkEqpType();
    await screen.checkEqpType();

    expect(launch.mock.calls).toEqual([
      [ROUTE.remoteAit, 'BOTH-01'],
      [ROUTE.remoteAegis, 'AEGIS-01'],
    ]);
  });

  it('clears the previous MODEL / MAINEQPID before each check (clearEqpInfo)', async () => {
    service.xrfEqpTypeCheck
      .mockResolvedValueOnce([item('AIT-XP', 'AIT-01')])
      .mockResolvedValueOnce([]);
    const { screen, launch } = setup();
    screen.updateTxtMachine('X');

    await screen.checkEqpType();
    await screen.checkEqpType();

    expect(launch.mock.calls).toEqual([
      [ROUTE.remoteAit, 'AIT-01'],
      [ROUTE.remoteXrf, ''],
    ]);
  });

  it('shows the server error and stays on the screen', async () => {
    service.xrfEqpTypeCheck.mockRejectedValueOnce(new Error('XRF-99 장비 정보가 없습니다.'));
    const { screen, launch } = setup();
    screen.updateTxtMachine('XRF-99');

    await screen.checkEqpType();

    expect(launch).not.toHaveBeenCalled();
    expect(okDialog.title.value).toBe('에  러');
    expect(okDialog.message.value).toBe('XRF-99 장비 정보가 없습니다.');
    expect(screen.loading.value).toBe(false);
  });

  it('ignores a second check while XRFEQPTYPECHECK is running', async () => {
    let resolve!: (value: unknown) => void;
    service.xrfEqpTypeCheck.mockReturnValueOnce(new Promise((done) => (resolve = done)));
    const { screen, launch } = setup();
    screen.updateTxtMachine('XRF-01');

    const first = screen.checkEqpType();
    expect(screen.loading.value).toBe(true);
    await screen.checkEqpType();
    screen.onBarcodeEnter();
    resolve([item('XRF-RIGAKU', 'XRF-01')]);
    await first;

    expect(service.xrfEqpTypeCheck).toHaveBeenCalledOnce();
    expect(barcode.barcodeStyleEqpId).not.toHaveBeenCalled();
    expect(launch).toHaveBeenCalledOnce();
  });

  it('runs the keyboard Done action on the typed text without the barcode check', async () => {
    const { screen } = setup();
    screen.updateTxtMachine('XRF-01');

    screen.onEditorAction();
    await vi.waitFor(() => expect(service.xrfEqpTypeCheck).toHaveBeenCalledWith('XRF-01'));

    expect(barcode.barcodeStyleEqpId).not.toHaveBeenCalled();
  });

  it('parses a scanned EQP- barcode before the check', async () => {
    barcode.barcodeStyleEqpId.mockReturnValueOnce({ isValid: true, parsedId: 'XRF-01' });
    const { screen, launch } = setup();
    screen.updateTxtMachine('EQP-XRF-01#');

    screen.onBarcodeEnter();

    expect(barcode.barcodeStyleEqpId).toHaveBeenCalledWith('EQP-XRF-01#');
    expect(screen.txtMachine.value).toBe('XRF-01');
    await vi.waitFor(() => expect(launch).toHaveBeenCalledWith(ROUTE.remoteXrf, 'XRF-01'));
  });

  it('clears txt_machine and skips the check for an invalid barcode', () => {
    barcode.barcodeStyleEqpId.mockReturnValueOnce({ isValid: false, parsedId: '' });
    const { screen } = setup();
    screen.updateTxtMachine('XRF-01');

    screen.onBarcodeEnter();

    expect(screen.txtMachine.value).toBe('');
    expect(service.xrfEqpTypeCheck).not.toHaveBeenCalled();
  });
});
