import { createPinia, setActivePinia } from 'pinia';
import { DeviceInfo } from 'src/constants/device-info';
import { useAutoMergeStore } from 'src/features/auto-merge/stores/auto-merge.store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getAutoMergeLot: vi.fn(),
  getAutoMergeLot2: vi.fn(),
  executeAutoMergeLot: vi.fn(),
}));
vi.mock('src/features/auto-merge/services/auto-merge.service', () => api);
const { show } = vi.hoisted(() => ({ show: vi.fn() }));
vi.mock('src/services/ok-dialog.service', () => ({ okDialog: { show } }));

const candidate = {
  LOTNAME: 'CHILD',
  MAINLOTNAME: 'PARENT',
  PRODUCTSPECNAME: 'PRODUCT',
  PROCESSFLOWNAME: 'R',
  PROCESSOPERATIONNAME: '1000',
  DESCRIPTION: 'DESC',
};
const mergeLot = {
  LOTNAME: 'CHILD',
  PRODUCTQUANTITY: '10',
  PRODUCTSPECNAME: 'PRODUCT',
  PROCESSFLOWNAME: 'R',
  PROCESSOPERATIONNAME: '1000',
  OPERATIONDESCRIPTION: 'DESC',
  LOTSTATE: 'Released',
};
const parent = {
  PARENTLOTNAME: 'PARENT',
  PARENTQTY: '25',
  PARENTPRODUCTSPECNAME: 'PRODUCT-P',
  PARENTPROCESSFLOWNAME: 'R',
  PARENTOPERATION: '1000',
  PARENTDESCRIPTION: 'PARENT DESC',
  ITEMS: [mergeLot],
};

describe('Auto Merge workflow from Android source', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    DeviceInfo.FACILITY = 'FAB';
    DeviceInfo.OPERATOR_ID = 'OP';
  });
  async function loaded() {
    const s = useAutoMergeStore();
    s.editLotNo = 'MAIN';
    api.getAutoMergeLot.mockResolvedValueOnce([candidate]);
    await s.getMergeLotInfo();
    api.getAutoMergeLot2.mockResolvedValueOnce(parent);
    await s.selectLotList(candidate);
    return s;
  }
  it('initializes empty fields and one placeholder row per grid', () => {
    const s = useAutoMergeStore();
    expect(s.gridList).toHaveLength(1);
    expect(s.gridList2).toHaveLength(1);
    expect(s.txtSelectedLot).toBe('');
    expect(s.mergeFlag).toBe(true);
  });
  it('clearData detaches grids and clears fields but preserves grid references and mergeFlag', async () => {
    const s = await loaded();
    s.editComment = 'comment';
    s.mergeFlag = false;
    s.clearData();
    expect(s.editLotNo).toBe('MAIN');
    expect(s.gridList2).toEqual([mergeLot]);
    expect(s.mergeFlag).toBe(false);
    expect([s.gridVisible, s.grid2Visible]).toEqual([false, false]);
    expect([s.txtParentLot, s.txtSelectedLot, s.editComment, s.gMainLotId, s.gLotList]).toEqual([
      '',
      '',
      '',
      '',
      '',
    ]);
  });
  it('clears data before validating an empty search', async () => {
    const s = useAutoMergeStore();
    s.txtProduct = 'old';
    await s.getMergeLotInfo();
    expect(s.txtProduct).toBe('');
    expect(s.dialogs[0]?.message).toBe('LOT ID을 입력하세요');
    expect(api.getAutoMergeLot).not.toHaveBeenCalled();
  });
  it('queries input unchanged and joins all candidate LOTNAME without auto-selection', async () => {
    const s = useAutoMergeStore();
    s.editLotNo = ' MAIN ';
    api.getAutoMergeLot.mockResolvedValueOnce([candidate, { ...candidate, LOTNAME: 'CHILD2' }]);
    await s.getMergeLotInfo();
    expect(api.getAutoMergeLot).toHaveBeenCalledWith('FAB', ' MAIN ');
    expect([s.gMainLotId, s.gLotList, s.txtSelectedLot]).toEqual([' MAIN ', 'CHILD,CHILD2', '']);
    expect(api.getAutoMergeLot2).not.toHaveBeenCalled();
  });
  it('keeps queried main LOT with empty candidate response', async () => {
    const s = useAutoMergeStore();
    s.editLotNo = 'MAIN';
    api.getAutoMergeLot.mockResolvedValueOnce([]);
    await s.getMergeLotInfo();
    expect([s.gMainLotId, s.gLotList]).toEqual(['MAIN', '']);
    expect(s.gridList).toEqual([]);
  });
  it('preserves source concatenation when the first candidate LOTNAME is empty', async () => {
    const s = useAutoMergeStore();
    s.editLotNo = 'MAIN';
    api.getAutoMergeLot.mockResolvedValueOnce([
      { ...candidate, LOTNAME: '' },
      { ...candidate, LOTNAME: 'L2' },
    ]);
    await s.getMergeLotInfo();
    expect(s.gLotList).toBe('L2');
  });
  it('search failure waits for acknowledgement before clearing input and focusing/selecting', async () => {
    const s = useAutoMergeStore();
    s.editLotNo = 'MAIN';
    api.getAutoMergeLot.mockRejectedValueOnce(new Error('search fail'));
    await s.getMergeLotInfo();
    expect(s.dialogs[0]?.message).toBe('search fail');
    expect(s.editLotNo).toBe('MAIN');
    expect(s.focusRequest.id).toBe(0);
    s.acknowledgeDialog();
    expect(s.editLotNo).toBe('');
    expect(s.focusRequest.select).toBe(true);
    expect(s.dialogs).toEqual([]);
  });
  it('selects source fields and sends the parent identifier with candidate list', async () => {
    const s = await loaded();
    expect(api.getAutoMergeLot2).toHaveBeenCalledWith('CHILD', 'PARENT', 'CHILD');
    expect([s.txtSelectedLot, s.txtProduct, s.txtRoute, s.txtProcessNum, s.txtProcessStep]).toEqual(
      ['CHILD', 'PRODUCT', 'R', '1000', 'DESC'],
    );
    expect([
      s.txtParentLot,
      s.txtQty,
      s.txtProduct2,
      s.txtRoute2,
      s.txtProcessNum2,
      s.txtProcessStep2,
    ]).toEqual(['PARENT', '25', 'PRODUCT-P', 'R', '1000', 'PARENT DESC']);
  });
  it.each([
    { row: { ...mergeLot, PROCESSFLOWNAME: 'OTHER' }, operation: '1000' },
    { row: { ...mergeLot, PROCESSOPERATIONNAME: '2000' }, operation: '1000' },
    { row: mergeLot, operation: '2000' },
  ])(
    'marks mismatch and blocks execute before other validation (%#)',
    async ({ row, operation }) => {
      const s = useAutoMergeStore();
      api.getAutoMergeLot2.mockResolvedValueOnce({
        ...parent,
        PARENTOPERATION: operation,
        ITEMS: [row],
      });
      await s.selectLotList(candidate);
      expect(s.mergeFlag).toBe(false);
      expect(s.isMismatch(row)).toBe(true);
      s.editLotNo = '';
      await s.executeMerge();
      expect(s.dialogs[0]?.message).toBe(
        '선택된 LOT이 모두 AUTO MERGE와 같은 ROUTE, 공정이어야 작업진행이 가능합니다.',
      );
      expect(api.executeAutoMergeLot).not.toHaveBeenCalled();
    },
  );
  it('does not compare parent route and resets mergeFlag on next detail query', async () => {
    const s = useAutoMergeStore();
    s.mergeFlag = false;
    api.getAutoMergeLot2.mockResolvedValueOnce({ ...parent, PARENTPROCESSFLOWNAME: 'OTHER' });
    await s.selectLotList(candidate);
    expect(s.mergeFlag).toBe(true);
  });
  it('keeps previous parent and merge reference on detail FAIL but detaches the visible grid', async () => {
    const s = await loaded();
    s.mergeFlag = false;
    api.getAutoMergeLot2.mockRejectedValueOnce(new Error('detail fail'));
    await s.selectLotList({ ...candidate, LOTNAME: 'OTHER' });
    expect(s.txtSelectedLot).toBe('OTHER');
    expect(s.txtParentLot).toBe('PARENT');
    expect(s.gridList2).toEqual([mergeLot]);
    expect(s.grid2Visible).toBe(false);
    expect(s.mergeFlag).toBe(true);
    expect(s.dialogs[0]?.message).toBe('detail fail');
    api.executeAutoMergeLot.mockResolvedValueOnce({ FAILLOTNAME: '', SUCCESS: 'N' });
    await s.executeMerge();
    expect(api.executeAutoMergeLot.mock.calls[0]?.[0].MERGELOT).toBe('CHILD 10');
  });
  it.each(['rows', 'selected', 'parent'])(
    'checks missing %s before empty search input',
    async (missing) => {
      const s = await loaded();
      if (missing === 'rows') s.gridList2 = [];
      if (missing === 'selected') s.txtSelectedLot = '';
      if (missing === 'parent') s.txtParentLot = '';
      s.editLotNo = '';
      await s.executeMerge();
      expect(s.dialogs[0]?.message).toBe('Merge할 Lot이 없습니다.');
      expect(api.executeAutoMergeLot).not.toHaveBeenCalled();
    },
  );
  it('checks input after merge data validation', async () => {
    const s = await loaded();
    s.editLotNo = '';
    await s.executeMerge();
    expect(s.dialogs[0]?.message).toBe('LOT ID을 입력하세요');
    expect(api.executeAutoMergeLot).not.toHaveBeenCalled();
  });
  it('sends stored main LOT, selected fields, parent qty, raw comment and all merge rows', async () => {
    const s = await loaded();
    s.editLotNo = 'CHANGED';
    s.editComment = ' comment\n';
    s.gridList2.push({ ...mergeLot, LOTNAME: 'L2', PRODUCTQUANTITY: '15' });
    api.executeAutoMergeLot.mockResolvedValueOnce({ FAILLOTNAME: '', SUCCESS: '' });
    await s.executeMerge();
    expect(api.executeAutoMergeLot).toHaveBeenCalledWith({
      FACTORYNAME: 'FAB',
      LOTNAME: 'MAIN',
      PARENTLOTNAME: 'PARENT',
      PRODUCTSPECNAME: 'PRODUCT',
      ROUTE: 'R',
      PROCESSOPERATIONNAME: '1000',
      QTY: '25',
      OPERATORID: 'OP',
      COMMENT: ' comment\n',
      MERGELOT: 'CHILD 10,L2 15',
    });
    expect(s.editLotNo).toBe('CHANGED');
    expect(s.dialogs).toEqual([]);
  });
  it.each(['N', ''])('shows failed LOT without clearing for SUCCESS=%s', async (success) => {
    const s = await loaded();
    api.executeAutoMergeLot.mockResolvedValueOnce({ FAILLOTNAME: 'L2', SUCCESS: success });
    await s.executeMerge();
    expect(s.dialogs.map((d) => d.message)).toEqual(['L2']);
    expect(s.txtSelectedLot).toBe('CHILD');
  });
  it.each(['', 'L2'])('handles SUCCESS=Y independently of FAILLOTNAME=%s', async (failLot) => {
    const s = await loaded();
    s.editComment = 'keep until confirmed';
    api.executeAutoMergeLot.mockResolvedValueOnce({ FAILLOTNAME: failLot, SUCCESS: 'Y' });
    await s.executeMerge();
    expect(s.dialogs.map((d) => d.message)).toEqual([
      ...(failLot ? [failLot] : []),
      '작업을 수행하였습니다.',
    ]);
    expect([s.editLotNo, s.txtSelectedLot, s.txtParentLot, s.editComment]).toEqual([
      'MAIN',
      'CHILD',
      'PARENT',
      'keep until confirmed',
    ]);
    expect(s.focusRequest.id).toBe(0);
    if (failLot) {
      s.acknowledgeDialog();
      expect(s.dialogs[0]?.message).toBe('작업을 수행하였습니다.');
      expect([s.editLotNo, s.txtSelectedLot, s.txtParentLot, s.editComment]).toEqual([
        'MAIN',
        'CHILD',
        'PARENT',
        'keep until confirmed',
      ]);
      expect(s.focusRequest.id).toBe(0);
    }
    s.acknowledgeDialog();
    expect([s.editLotNo, s.txtSelectedLot, s.txtParentLot]).toEqual(['', '', '']);
    expect(s.editComment).toBe('');
    expect([s.gridVisible, s.grid2Visible]).toEqual([false, false]);
    expect(s.focusRequest.id).toBe(1);
    expect(s.focusRequest.select).toBe(false);
    s.acknowledgeDialog();
    expect(s.focusRequest.id).toBe(1);
  });
  it('retains form and selects input on execute failure', async () => {
    const s = await loaded();
    api.executeAutoMergeLot.mockRejectedValueOnce(new Error('execute fail'));
    await s.executeMerge();
    expect(s.txtSelectedLot).toBe('CHILD');
    expect(s.dialogs[0]?.message).toBe('execute fail');
    expect(s.focusRequest.id).toBe(0);
    s.acknowledgeDialog();
    expect(s.txtSelectedLot).toBe('CHILD');
    expect(s.editLotNo).toBe('MAIN');
    expect(s.focusRequest.select).toBe(true);
  });
  it.each([
    [' LOT1#', 'LOT1'],
    [' $LOT1#', 'LOT1'],
    [' $  LOT1#', 'LOT1'],
  ])('parses barcode %s without trimming prematurely', async (input, lot) => {
    const s = useAutoMergeStore();
    s.editLotNo = input;
    api.getAutoMergeLot.mockResolvedValueOnce([]);
    await s.handleLotEnter();
    expect(s.editLotNo).toBe(lot);
    expect(api.getAutoMergeLot).toHaveBeenCalledWith('FAB', lot);
  });
  it.each(['PLAIN', ' ', ' #'])(
    'clears invalid or empty barcode %s without querying',
    async (input) => {
      const s = useAutoMergeStore();
      s.editLotNo = input;
      s.txtProduct = 'old';
      await s.handleLotEnter();
      expect(s.editLotNo).toBe('');
      expect(s.txtProduct).toBe('');
      expect(api.getAutoMergeLot).not.toHaveBeenCalled();
      expect(show).not.toHaveBeenCalled();
      expect(s.dialogs.map((dialog) => dialog.title)).toEqual(
        input === 'PLAIN' ? ['READING ERROR'] : [],
      );
    },
  );
  it('blocks duplicate requests while loading and always releases loading', async () => {
    let resolve!: (rows: (typeof candidate)[]) => void;
    api.getAutoMergeLot.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const s = useAutoMergeStore();
    s.editLotNo = 'MAIN';
    const pending = s.getMergeLotInfo();
    expect(s.loading).toBe(true);
    await s.getMergeLotInfo();
    expect(api.getAutoMergeLot).toHaveBeenCalledTimes(1);
    resolve([]);
    await pending;
    expect(s.loading).toBe(false);
  });
});
