import { useEtchCondition } from 'src/features/etch-condition/composables/use-etch-condition';
import type { EtchConditionResult } from 'src/features/etch-condition/types/etch-condition.types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({ fetchEtchCondition: vi.fn() }));
const barcode = vi.hoisted(() => ({ barcodeStyleLotId: vi.fn() }));

vi.mock('src/features/etch-condition/services/etch-condition.service', () => service);
vi.mock('src/utils/barcode-style', () => barcode);

const chamberRows = [
  { CHAMBER: 'A', ETCVALUE: 'SOURCE POWER', CHKCHK: '가능' },
  { CHAMBER: 'B', ETCVALUE: 'BIAS POWER', CHKCHK: '불가' },
];

function result(overrides: Partial<EtchConditionResult> = {}): EtchConditionResult {
  return {
    processType: 'DPS POLY',
    operDesc: '4200 DPS POLY / RCP: DP-POLY-07',
    para2nd: '',
    value2nd: '',
    comm2nd: '',
    hmEen: '',
    rows: chamberRows,
    ...overrides,
  };
}

function setup() {
  const focusLot = vi.fn();
  return { screen: useEtchCondition({ focusLot }), focusLot };
}

describe('useEtchCondition', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    service.fetchEtchCondition.mockResolvedValue(result());
  });

  it('upper-cases the LOT and asks for one before searching', async () => {
    const { screen, focusLot } = setup();

    screen.updateLot('lot-1');
    expect(screen.lotNo.value).toBe('LOT-1');

    screen.updateLot('');
    await screen.search();
    expect(screen.activeDialog.value).toEqual({
      title: 'ERROR',
      message: 'LOT을 입력하여 주세요.',
    });
    expect(service.fetchEtchCondition).not.toHaveBeenCalled();

    screen.closeDialog();
    expect(focusLot).toHaveBeenCalledWith(false);
  });

  it('sends the LOT with the blank default machine and shows the chamber grid', async () => {
    const { screen } = setup();
    screen.updateLot('LOT-1');

    await screen.search();

    expect(service.fetchEtchCondition).toHaveBeenCalledWith('LOT-1', '');
    expect(screen.operRecipe.value).toBe('4200 DPS POLY / RCP: DP-POLY-07');
    expect(screen.gridKind.value).toBe('chamber');
    expect(screen.rows.value).toEqual(chamberRows);
    expect(screen.loading.value).toBe(false);
  });

  it('builds the comment from COMM2ND or from PARA2ND and VALUE2ND', async () => {
    const { screen } = setup();
    screen.updateLot('LOT-1');

    service.fetchEtchCondition.mockResolvedValueOnce(
      result({ comm2nd: '실비 조건을 확인하세요.' }),
    );
    await screen.search();
    expect(screen.comment.value).toBe('실비 조건을 확인하세요.');

    service.fetchEtchCondition.mockResolvedValueOnce(result({ para2nd: 'RF', value2nd: '650' }));
    await screen.search();
    expect(screen.comment.value).toBe('RF : 650 추가 반영');

    await screen.search();
    expect(screen.comment.value).toBe('');
  });

  it('shows HMEEN in an EEN dialog and still fills the screen', async () => {
    const { screen } = setup();
    screen.updateLot('LOT-1');
    service.fetchEtchCondition.mockResolvedValueOnce(result({ hmEen: 'EEN 적용 LOT입니다.' }));

    await screen.search();

    expect(screen.activeDialog.value).toEqual({ title: 'EEN', message: 'EEN 적용 LOT입니다.' });
    expect(screen.rows.value).toHaveLength(2);
  });

  it('adds no grid for an empty list or an unknown PROCESS_TYPE', async () => {
    const { screen } = setup();
    screen.updateLot('LOT-1');

    service.fetchEtchCondition.mockResolvedValueOnce(result({ rows: [] }));
    await screen.search();
    expect(screen.operRecipe.value).not.toBe('');
    expect(screen.gridKind.value).toBe('none');

    service.fetchEtchCondition.mockResolvedValueOnce(result({ processType: 'OTHER' }));
    await screen.search();
    expect(screen.gridKind.value).toBe('none');
    expect(screen.rows.value).toEqual([]);
  });

  it('shows the TE8500 grid and moves 진행 TIME into the comment', async () => {
    const { screen, focusLot } = setup();
    screen.updateLot('LOT-1');
    service.fetchEtchCondition.mockResolvedValueOnce(
      result({
        processType: 'TE8500',
        comm2nd: 'ignored',
        rows: [
          { COL: 'GAP', VALUE: '0.85' },
          { COL: '진행 TIME', VALUE: '45' },
        ],
      }),
    );

    await screen.search();

    expect(screen.gridKind.value).toBe('te8500');
    expect(screen.rows.value).toHaveLength(2);
    expect(screen.comment.value).toBe('진행 TIME [ 45 초 ]');
    expect(focusLot).toHaveBeenCalledWith(true);
  });

  it('selects the LOT after an EEN dialog when TE8500 reports 진행 TIME', async () => {
    const { screen, focusLot } = setup();
    screen.updateLot('LOT-1');
    service.fetchEtchCondition.mockResolvedValueOnce(
      result({ processType: 'TE8500', hmEen: 'EEN', rows: [{ COL: '진행 TIME', VALUE: '45' }] }),
    );

    await screen.search();
    expect(focusLot).not.toHaveBeenCalled();

    screen.closeDialog();
    expect(focusLot).toHaveBeenCalledWith(true);
  });

  it('reports a server error, clears the result and selects the LOT afterwards', async () => {
    const { screen, focusLot } = setup();
    screen.updateLot('LOT-1');
    await screen.search();
    service.fetchEtchCondition.mockRejectedValueOnce(new Error('LOT 정보가 없습니다.'));

    await screen.search();

    expect(screen.activeDialog.value).toEqual({ title: '에  러', message: 'LOT 정보가 없습니다.' });
    expect(screen.rows.value).toEqual([]);
    expect(screen.operRecipe.value).toBe('');
    screen.closeDialog();
    expect(focusLot).toHaveBeenLastCalledWith(true);

    // Like getErrorMessage, a request error is shown as is, without a substitute text.
    service.fetchEtchCondition.mockRejectedValueOnce(new Error('Network Error'));
    await screen.search();
    expect(screen.activeDialog.value?.message).toBe('Network Error');
  });

  it('ignores a second search while the first is pending', async () => {
    const { screen } = setup();
    screen.updateLot('LOT-1');
    let finish: (value: EtchConditionResult) => void = () => undefined;
    service.fetchEtchCondition.mockReturnValueOnce(
      new Promise<EtchConditionResult>((resolve) => (finish = resolve)),
    );

    const pending = screen.search();
    expect(screen.loading.value).toBe(true);
    await screen.search();
    await screen.scanLot();
    finish(result());
    await pending;

    expect(service.fetchEtchCondition).toHaveBeenCalledOnce();
    expect(barcode.barcodeStyleLotId).not.toHaveBeenCalled();
  });

  it('searches a scanned LOT barcode and stops on an unreadable one', async () => {
    const { screen } = setup();
    screen.updateLot(' LOT-1X');
    barcode.barcodeStyleLotId.mockReturnValueOnce({ isValid: true, parsedId: 'LOT-1' });

    await screen.scanLot();

    expect(barcode.barcodeStyleLotId).toHaveBeenCalledWith(' LOT-1X');
    expect(screen.lotNo.value).toBe('LOT-1');
    expect(service.fetchEtchCondition).toHaveBeenCalledWith('LOT-1', '');

    screen.updateLot('LOT-1');
    barcode.barcodeStyleLotId.mockReturnValueOnce({ isValid: false, parsedId: '' });
    await screen.scanLot();

    expect(screen.lotNo.value).toBe('');
    expect(screen.rows.value).toEqual([]);
    expect(service.fetchEtchCondition).toHaveBeenCalledOnce();
  });
});
