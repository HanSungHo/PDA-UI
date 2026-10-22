import { useShelfIncoming } from 'src/features/shelf-incoming/composables/use-shelf-incoming';
import { sendShelfMessage } from 'src/features/shelf-incoming/services/shelf-incoming.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/features/shelf-incoming/services/shelf-incoming.service', () => ({
  sendShelfMessage: vi.fn(),
}));
const send = vi.mocked(sendShelfMessage);
const pass = (body: Record<string, string> = {}) => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }),
});
const focus = vi.fn();
function create() {
  return useShelfIncoming({
    device: { mobileServerName: 'SERVER', deviceName: 'DEVICE' },
    facility: 'FAB',
    operatorId: 'USER',
    focus,
  });
}
beforeEach(() => {
  send.mockReset();
  focus.mockReset();
  send.mockResolvedValue(pass());
});

describe('Shelf Incoming legacy flow', () => {
  it('starts empty and enables the matching category after a manual lookup', async () => {
    const state = create();
    expect(state.hasLots.value).toBe(false);
    expect(state.category.value).toBe('');
    send.mockResolvedValue(pass({ CATEGORY: 'C' }));
    state.shelfId.value = 'CART-01';
    await state.searchShelfInfo();
    expect(state.category.value).toBe('C');
    expect(state.searchShelf.value).toBe('CART-01');
    expect(send).toHaveBeenCalledWith('SHELFCALL', [['SHELFNO', 'CART-01']], expect.anything());
  });
  it('shows and acknowledges empty shelf and LOT errors with focus restoration', async () => {
    const state = create();
    await state.searchShelfInfo();
    expect(state.dialog.value?.message).toBe('SHELF NO 를 입력하세요.');
    state.closeDialog();
    expect(focus).not.toHaveBeenCalled();
    state.afterDialogClose();
    expect(focus).toHaveBeenLastCalledWith('shelf');
    await state.setLotInfo();
    expect(state.dialog.value?.message).toBe('LOT NO를 입력하세요');
    state.closeDialog();
    state.afterDialogClose();
    expect(focus).toHaveBeenLastCalledWith('lot');
    expect(send).not.toHaveBeenCalled();
  });
  it('invalidates the category on a failed shelf lookup', async () => {
    const state = create();
    state.category.value = 'S';
    send.mockResolvedValue({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'Shelf failed' }),
    });
    await state.searchShelfInfo('BAD');
    expect(state.category.value).toBe('');
    expect(state.dialog.value?.message).toBe('Shelf failed');
  });
  it('adds LOTs down each column, displays metadata and warns without rejecting reserved LOTs', async () => {
    const state = create();
    send.mockResolvedValue(
      pass({
        PRODUCTSPECNAME: 'PRODUCT',
        PROCESSOPERATIONNAME: '1200',
        OPERATIONDESCRIPTION: 'PHOTO',
        MACHINENAME: 'EQP',
        LOTRESUSER: 'USER',
        BAYNAME: 'BAY',
      }),
    );
    for (let i = 0; i < 9; i++) await state.setLotInfo(`LOT-${i}`);
    expect(state.rows.value[0]).toEqual({ id: 0, c0: 'LOT-0', c1: 'LOT-8', c2: '' });
    expect(state.productSpecName.value).toBe('PRODUCT');
    expect(state.operationName.value).toBe('1200');
    expect(state.operationDesc.value).toBe('PHOTO');
    expect(state.dialog.value?.title).toBe('알  림');
    expect(state.dialog.value?.message).toContain('BAY BAY');
    expect(send).toHaveBeenLastCalledWith(
      'CHECKINSHELFLOT',
      [
        ['LOTID', 'LOT-8'],
        ['FACILITY', 'FAB'],
      ],
      expect.anything(),
    );
  });
  it('blocks duplicate and twenty-fifth LOT requests', async () => {
    const state = create();
    await state.setLotInfo('LOT');
    await state.setLotInfo('LOT');
    expect(state.dialog.value?.title).toBe('중 복');
    state.lots.value = Array.from({ length: 24 }, (_, index) => `LOT-${index}`);
    const count = send.mock.calls.length;
    await state.setLotInfo('EXTRA');
    expect(state.dialog.value?.message).toBe('LOT 수량을 초과했습니다.');
    expect(send).toHaveBeenCalledTimes(count);
  });
  it('shows the fixed legacy LOT failure rather than the backend message', async () => {
    const state = create();
    send.mockRejectedValue(new Error('Details'));
    await state.setLotInfo('BAD');
    expect(state.dialog.value?.message).toBe('입고가 불가능한 LOT 입니다.');
    expect(state.hasLots.value).toBe(false);
  });
  it('toggles individual cells and deletes only selected LOTs without compacting the grid', () => {
    const state = create();
    state.lots.value[0] = 'FIRST';
    state.lots.value[1] = 'SECOND';
    state.toggleCell(0);
    state.toggleCell(1);
    state.toggleCell(1);
    state.deleteLotId();
    expect(state.lots.value.slice(0, 2)).toEqual(['', 'SECOND']);
    expect(state.selected.value).toEqual([]);
    expect(focus).toHaveBeenLastCalledWith('lot');
  });
  it.each(['SHELF IN', 'CART IN', 'SHELF OUT', 'CART OUT'] as const)(
    'submits all LOTs for %s, including unselected ones, then resets',
    async (command) => {
      const state = create();
      state.shelfId.value = 'SHELF';
      state.category.value = 'S';
      state.lots.value[0] = 'FIRST';
      state.lots.value[8] = 'SECOND';
      state.selected.value = [0];
      await state.execute(command);
      const fields = send.mock.calls[0]?.[1];
      expect(fields).toContainEqual([
        command.endsWith(' IN') ? 'INSERTSHELFLOT' : 'DELETESHELFLOT',
        'FIRST|SECOND',
      ]);
      expect(fields).toContainEqual(['USERID', 'USER']);
      expect(fields).toContainEqual(['SHELFNO', 'SHELF']);
      if (command.endsWith(' OUT')) expect(fields).toContainEqual(['COMMANDTYPE', command]);
      expect(state.hasLots.value).toBe(false);
      expect(state.category.value).toBe('');
      expect(state.shelfId.value).toBe('');
      expect(focus).toHaveBeenLastCalledWith('shelf');
    },
  );
  it('shows ERRORLOT and still clears the grid on a successful transport/business envelope', async () => {
    const state = create();
    state.lots.value[0] = 'LOT';
    send.mockResolvedValue(pass({ ERRORLOT: 'LOT failed' }));
    await state.execute('SHELF IN');
    expect(state.dialog.value?.message).toBe('LOT failed');
    expect(state.hasLots.value).toBe(false);
    state.closeDialog();
    expect(state.dialog.value).toBeNull();
    expect(focus).not.toHaveBeenCalled();
    state.afterDialogClose();
    expect(focus).toHaveBeenLastCalledWith('shelf');
  });
  it('preserves the grid on an OUT failure and restores LOT focus on acknowledgement', async () => {
    const state = create();
    state.lots.value[0] = 'LOT';
    send.mockRejectedValue(new Error('Failed'));
    await state.execute('CART OUT');
    expect(state.hasLots.value).toBe(true);
    expect(state.dialog.value?.message).toBe('Failed');
    state.closeDialog();
    state.afterDialogClose();
    expect(focus).toHaveBeenLastCalledWith('lot');
  });
  it('blocks empty submissions and repeated actions during loading', async () => {
    const state = create();
    await state.execute('SHELF IN');
    expect(state.dialog.value?.message).toBe('LOT을 입력하여 주세요.');
    state.loading.value = true;
    await state.searchShelfInfo('S');
    await state.setLotInfo('L');
    await state.searchData('lot');
    await state.execute('SHELF IN');
    state.toggleCell(0);
    state.deleteLotId();
    expect(send).not.toHaveBeenCalled();
    expect(state.selected.value).toEqual([]);
  });
  it('decodes equipment and LOT barcodes and restores the validated shelf', async () => {
    const state = create();
    send.mockResolvedValueOnce(pass({ CATEGORY: 'S' }));
    state.shelfId.value = 'EQP-$SHELF-01#';
    await state.searchData('shelf');
    expect(state.shelfId.value).toBe('$SHELF-01');
    expect(state.category.value).toBe('S');
    state.lotId.value = ' LOT-01#';
    await state.searchData('lot');
    expect(state.lots.value[0]).toBe('LOT-01');
    expect(state.shelfId.value).toBe('$SHELF-01');
    expect(focus).toHaveBeenLastCalledWith('lot');
  });
  it('decodes lowercase equipment barcode prefixes with the shared parser', async () => {
    const state = create();
    send.mockResolvedValueOnce(pass({ CATEGORY: 'S' }));
    state.shelfId.value = 'eqp-$SHELF-01#';

    await state.searchData('shelf');

    expect(state.shelfId.value).toBe('$SHELF-01');
    expect(state.category.value).toBe('S');
    expect(send).toHaveBeenCalledWith('SHELFCALL', [['SHELFNO', '$SHELF-01']], {
      mobileServerName: 'SERVER',
      deviceName: 'DEVICE',
    });
  });
  it('rejects plain input, empty scans and LOT scans before a shelf is validated', async () => {
    const state = create();
    await state.searchData('shelf');
    expect(state.dialog.value?.message).toBe('조회할 정보가 없습니다.');
    state.lotId.value = 'PLAIN#';
    await state.searchData('lot');
    expect(state.dialog.value?.message).toBe('입력된 정보를 확인하세요');
    state.lotId.value = ' LOT#';
    await state.searchData('lot');
    expect(state.dialog.value?.message).toBe('Shelf No가 확인되지 않았습니다!');
    expect(state.lotId.value).toBe('');
  });
  it.each([
    ['', 'SHELF IN#', 'Shelf No가 확인되지 않았습니다!'],
    ['S', 'CART IN#', 'SHELF를 선택 후 CART 기능을 시도하셨습니다.'],
    ['C', 'SHELF OUT#', 'CART를 선택 후 SHELF 기능을 시도하셨습니다.'],
  ])('validates category %s for scanned command %s', async (category, command, error) => {
    const state = create();
    state.category.value = category;
    state.lotId.value = command ?? '';
    await state.searchData('lot');
    expect(state.dialog.value?.message).toBe(error);
    expect(send).not.toHaveBeenCalled();
  });
  it('executes command barcodes from the LOT input', async () => {
    const state = create();
    state.category.value = 'C';
    state.shelfId.value = 'CART-01';
    state.lots.value[0] = 'LOT';
    state.lotId.value = 'CART OUT#';
    await state.searchData('lot');
    expect(send).toHaveBeenCalledWith(
      'LOTOUTSHELF',
      expect.arrayContaining([
        ['SHELFNO', 'CART-01'],
        ['COMMANDTYPE', 'CART OUT'],
      ]),
      expect.anything(),
    );
    expect(state.lotId.value).toBe('');
  });
});
