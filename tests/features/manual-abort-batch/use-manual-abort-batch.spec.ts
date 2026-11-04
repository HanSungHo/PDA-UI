import { DeviceInfo } from 'src/constants/device-info';
import { useManualAbortBatch } from 'src/features/manual-abort-batch/composables/use-manual-abort-batch';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({ fetchRemanualLot: vi.fn(), saveRemanual: vi.fn() }));
const barcode = vi.hoisted(() => ({ barcodeStyleLotId: vi.fn(), barcodeStyleEqpId: vi.fn() }));

vi.mock('src/features/manual-abort-batch/services/manual-abort-batch.service', () => service);
vi.mock('src/utils/barcode-style', () => barcode);

const rows = [
  { BATCHINFO: '모', ZONE: 'TOP', LOT: 'LOT-1' },
  { BATCHINFO: '자', ZONE: 'CENTER', LOT: 'LOT-2' },
];
const operatorId = DeviceInfo.OPERATOR_ID;

function setup() {
  const focus = vi.fn();
  const close = vi.fn();
  return { screen: useManualAbortBatch({ focus, close }), focus, close };
}

/** Scans LOT-1 so that 저장 is enabled. */
async function scanned() {
  const context = setup();
  context.screen.updateLot(' LOT-1#');
  await context.screen.scanLot();
  context.focus.mockClear();
  return context;
}

describe('useManualAbortBatch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    service.fetchRemanualLot.mockResolvedValue(rows);
    service.saveRemanual.mockResolvedValue(undefined);
    barcode.barcodeStyleLotId.mockReturnValue({ isValid: true, parsedId: 'LOT-1' });
    barcode.barcodeStyleEqpId.mockReturnValue({ isValid: true, parsedId: 'FURNACE-01' });
  });

  afterEach(() => {
    DeviceInfo.OPERATOR_ID = operatorId;
  });

  it('upper-cases the three fields and keeps 저장 disabled before a LOT lookup', async () => {
    const { screen } = setup();

    screen.updateLot('lot-1');
    screen.updateEqp('furnace-01');
    screen.updateRecipe('rcp-a');
    expect([screen.lotId.value, screen.eqpId.value, screen.recipe.value]).toEqual([
      'LOT-1',
      'FURNACE-01',
      'RCP-A',
    ]);

    expect(screen.canSave.value).toBe(false);
    await screen.save();
    expect(service.saveRemanual).not.toHaveBeenCalled();
    expect(screen.activeDialog.value).toBeUndefined();
  });

  it('loads the batch for a valid LOT scan, enables 저장 and moves to 진행 장비', async () => {
    const { screen, focus } = setup();
    screen.updateLot(' LOT-1#');

    await screen.scanLot();

    expect(barcode.barcodeStyleLotId).toHaveBeenCalledWith(' LOT-1#');
    expect(service.fetchRemanualLot).toHaveBeenCalledWith('LOT-1');
    expect(screen.lotId.value).toBe('LOT-1');
    expect(screen.rows.value).toEqual(rows);
    expect(screen.canSave.value).toBe(true);
    expect(focus).toHaveBeenCalledWith('eqp');
  });

  it('only rewrites the LOT for an invalid scan and keeps the current grid', async () => {
    const { screen } = await scanned();
    barcode.barcodeStyleLotId.mockReturnValue({ isValid: false, parsedId: '' });
    service.fetchRemanualLot.mockClear();

    await screen.scanLot();

    expect(screen.lotId.value).toBe('');
    expect(service.fetchRemanualLot).not.toHaveBeenCalled();
    expect(screen.rows.value).toEqual(rows);
  });

  it('shows the lookup error as is, clears the grid and keeps 저장 as it was', async () => {
    const { screen, focus } = await scanned();
    service.fetchRemanualLot.mockRejectedValueOnce(new Error('LOT 정보가 없습니다.'));

    await screen.scanLot();

    expect(screen.rows.value).toEqual([]);
    expect(screen.activeDialog.value).toEqual({ title: '에  러', message: 'LOT 정보가 없습니다.' });
    expect(screen.canSave.value).toBe(true);
    screen.closeDialog();
    expect(focus).not.toHaveBeenCalled();
  });

  it('keeps 저장 disabled and does not move to 진행 장비 when the first lookup fails', async () => {
    const { screen, focus } = setup();
    service.fetchRemanualLot.mockRejectedValueOnce(new Error('LOT 정보가 없습니다.'));
    screen.updateLot(' LOT-1#');

    await screen.scanLot();

    expect(screen.activeDialog.value).toEqual({ title: '에  러', message: 'LOT 정보가 없습니다.' });
    expect(screen.canSave.value).toBe(false);
    expect(screen.loading.value).toBe(false);
    screen.closeDialog();
    expect(focus).not.toHaveBeenCalledWith('eqp');
  });

  it('moves to RECIPE after a valid equipment scan only', () => {
    const { screen, focus } = setup();
    screen.updateEqp('EQP-FURNACE-01#');

    screen.scanEqp();
    expect(barcode.barcodeStyleEqpId).toHaveBeenCalledWith('EQP-FURNACE-01#');
    expect(screen.eqpId.value).toBe('FURNACE-01');
    expect(focus).toHaveBeenCalledWith('recipe');

    focus.mockClear();
    barcode.barcodeStyleEqpId.mockReturnValue({ isValid: false, parsedId: '' });
    screen.scanEqp();
    expect(screen.eqpId.value).toBe('');
    expect(focus).not.toHaveBeenCalled();
  });

  it.each([
    ['lot', 'LOT을 입력하세요.', { lot: '', eqp: 'E', recipe: 'R' }],
    ['eqp', '장비를 입력하세요.', { lot: 'L', eqp: '', recipe: 'R' }],
    ['recipe', 'Recipe를 입력하세요.', { lot: 'L', eqp: 'E', recipe: '' }],
  ])('asks for the %s field and focuses it after the dialog', async (field, message, values) => {
    const { screen, focus } = await scanned();
    screen.updateLot(values.lot);
    screen.updateEqp(values.eqp);
    screen.updateRecipe(values.recipe);

    await screen.save();

    expect(service.saveRemanual).not.toHaveBeenCalled();
    expect(screen.activeDialog.value).toEqual({ title: '에  러', message });
    expect(focus).not.toHaveBeenCalled();
    screen.closeDialog();
    expect(focus).toHaveBeenCalledWith(field);
  });

  it('saves with the operator id and closes the screen', async () => {
    DeviceInfo.OPERATOR_ID = 'OP1';
    const { screen, close } = await scanned();
    screen.updateEqp('FURNACE-01');
    screen.updateRecipe('RCP-1');

    await screen.save();

    expect(service.saveRemanual).toHaveBeenCalledWith({
      lotId: 'LOT-1',
      eqpId: 'FURNACE-01',
      rcpId: 'RCP-1',
      userId: 'OP1',
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it('shows a failed save as is and stays on the screen', async () => {
    const { screen, close } = await scanned();
    screen.updateEqp('FURNACE-01');
    screen.updateRecipe('RCP-1');
    service.saveRemanual.mockRejectedValueOnce(new Error('매뉴얼 등록에 실패하였습니다.'));

    await screen.save();

    expect(screen.activeDialog.value?.message).toBe('매뉴얼 등록에 실패하였습니다.');
    expect(screen.loading.value).toBe(false);
    expect(close).not.toHaveBeenCalled();
  });

  it('takes no scan or save while a request is pending, as the modal LoadingBar does', async () => {
    const { screen } = await scanned();
    let resolve: (value: typeof rows) => void = () => undefined;
    service.fetchRemanualLot.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    service.fetchRemanualLot.mockClear();

    const pending = screen.scanLot();
    expect(screen.loading.value).toBe(true);
    await screen.scanLot();
    screen.scanEqp();
    await screen.save();
    resolve(rows);
    await pending;

    expect(service.fetchRemanualLot).toHaveBeenCalledOnce();
    expect(barcode.barcodeStyleEqpId).not.toHaveBeenCalled();
    expect(service.saveRemanual).not.toHaveBeenCalled();
  });

  it('queues dialogs and shows them one at a time', async () => {
    const { screen } = await scanned();
    screen.updateLot('');

    await screen.save();
    await screen.save();

    expect(screen.activeDialog.value?.message).toBe('LOT을 입력하세요.');
    screen.closeDialog();
    expect(screen.activeDialog.value?.message).toBe('LOT을 입력하세요.');
    screen.closeDialog();
    expect(screen.activeDialog.value).toBeUndefined();
  });
});
