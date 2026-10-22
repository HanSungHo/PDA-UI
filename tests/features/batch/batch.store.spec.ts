import { createPinia, setActivePinia } from 'pinia';
import { DeviceInfo } from 'src/constants/deviceinfo';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBatchStore } from '../../../src/features/batch/stores/batch.store';

const api = vi.hoisted(() => ({
  checkBatchCreate: vi.fn(),
  fetchBatchCount: vi.fn(),
  fetchBatchListByLot: vi.fn(),
  fetchBatchZone: vi.fn(),
  fetchLotInfo: vi.fn(),
  fetchMachineInfo: vi.fn(),
  fetchParentBatchIds: vi.fn(),
  submitBatch: vi.fn(),
}));
vi.mock('src/features/batch/services/batch.service', () => api);

function lot(overrides: Record<string, string> = {}) {
  return {
    PRODUCT: 'P',
    OPERATION: '1100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'DIFF',
    QUANTITY: '25',
    BATCHID: '',
    STEPRECIPE: 'R',
    LIMITZONE: 'O',
    STATUS: 'RUN',
    VIEWCOUNT: '1/2/3',
    PROCESSNAME: '',
    PTIN: 'measurement',
    PTSPEC: 'spec',
    CHECKQTIME: '',
    PROCESSOPERATIONTYPE: 'TYPE',
    JALOT: '',
    MOLOT: '',
    CHECKRECIPE: 'R',
    JACOUNT: '0',
    LIMITRECIPE: 'R',
    FQCSAMPLE: '',
    CHECKMACHINE: '',
    CHECKOPERTION: '',
    CHECKDEPOCOMMENT: '',
    CHECKTHCIKNESSCOMMENT: '',
    CHECKRECYCLECOMMENT: '',
    MAXBATCHMESSAGE: '',
    ...overrides,
  };
}
const hooks = () => ({
  alert: vi.fn().mockResolvedValue(undefined),
  confirm: vi.fn().mockResolvedValue(true),
});
async function add(
  store: ReturnType<typeof useBatchStore>,
  id = 'A',
  overrides: Record<string, string> = {},
) {
  store.editLotNo = id;
  api.fetchLotInfo.mockResolvedValueOnce(lot(overrides));
  return store.getLotInfo(hooks());
}
function batch(overrides: Record<string, unknown> = {}) {
  return {
    BATCHID: 'B',
    EQPID: 'EQP',
    BATCHTYPE: 'R',
    MWCOUNT: '2',
    RECIPE: 'COMMON',
    PARENTBATCHID: '',
    CHILDZONE: '',
    BATCHITEMS: [
      {
        NUM: '0',
        ISDCOL: 'Y',
        LOTID: 'A',
        PRODUCT: 'P',
        PTIN: 'value',
        PTSPEC: '',
        THIN: 'value',
        THSPEC: 'spec',
      },
    ],
    ...overrides,
  };
}

describe('BatchActivity source parity', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
    DeviceInfo.FACILITY = 'TEST-FAB';
    DeviceInfo.OPERATOR_ID = 'OP';
    api.checkBatchCreate.mockResolvedValue({
      BATCHMESSGE: '',
      CUMCOUNT: '',
      MAXCOUNT: '',
      UPDATEFLAG: '',
      UVFLAG: '',
      SAMPLECYCLE: '',
      REMOTE: '',
    });
    api.submitBatch.mockResolvedValue({
      INTERLOCKMSG: '',
      TTINTERLOCKMSG: '',
      NOTICEDOWN: '',
      MSG: '',
    });
  });
  it('initializes source zero-based cursor and an unselected monitor', () => {
    const s = useBatchStore();
    expect(s.batchItemList).toEqual([{ NUM: '0' }]);
    expect(s.monitorWaferCount).toBe('');
  });
  it('preserves rows and monitor when changing RUN/M', async () => {
    const s = useBatchStore();
    await add(s);
    s.monitorWaferCount = '3';
    const rows = structuredClone(s.batchItemList.map((x) => ({ ...x })));
    s.checkedRadioButton('M');
    expect(s.batchItemList).toEqual(rows);
    expect(s.monitorWaferCount).toBe('3');
    expect(s.zoneColumnVisible).toBe(false);
  });
  it('advances cursor and sends the next ZONE using configured facility', async () => {
    const s = useBatchStore();
    await add(s);
    await add(s, 'B');
    expect(api.fetchLotInfo).toHaveBeenLastCalledWith({
      lotId: 'B',
      facility: 'TEST-FAB',
      zone: '2',
      eqpId: '',
      addedLotId: "'A'",
    });
    expect(s.selectedRowIndex).toBe(2);
    expect(s.batchItemList.at(-1)).toEqual({ NUM: '2' });
  });
  it('replaces the selected row instead of always appending', async () => {
    const s = useBatchStore();
    await add(s);
    await add(s, 'B');
    s.selectBatchLot('0');
    await add(s, 'C');
    expect(s.validBatchItems.map((x) => x.LOTID)).toEqual(['C', 'B']);
  });
  it('blocks a seventh LOT and does not append a seventh placeholder', async () => {
    const s = useBatchStore();
    for (let n = 0; n < 6; n++) await add(s, String(n));
    expect(s.batchItemList).toHaveLength(6);
    expect(s.selectedRowIndex).toBe(6);
    expect(await add(s, 'SEVEN')).toMatchObject({
      ok: false,
      message: 'LOT을 입력할 ROW를 먼저 선택하세요.',
      focus: 'lot',
    });
    expect(s.batchItemList).toHaveLength(6);
  });
  it('allows deletion only of the final filled row and clears form fields', async () => {
    const s = useBatchStore();
    await add(s);
    await add(s, 'B');
    s.selectBatchLot('0');
    expect(s.rowDeleteEnabled).toBe(false);
    s.btnDeleteBatch();
    expect(s.validBatchItems).toHaveLength(2);
    s.selectBatchLot('1');
    expect(s.rowDeleteEnabled).toBe(true);
    s.btnDeleteBatch();
    expect(s.validBatchItems.map((x) => x.LOTID)).toEqual(['A']);
    expect(s.txtProductName).toBe('');
    expect(s.editLotNo).toBe('');
    expect(s.selectedRowIndex).toBe(1);
  });
  it.each([
    'CHECKMACHINE',
    'CHECKOPERTION',
    'CHECKDEPOCOMMENT',
    'CHECKTHCIKNESSCOMMENT',
    'CHECKRECYCLECOMMENT',
    'MAXBATCHMESSAGE',
  ])('stops on %s', async (key) => {
    const s = useBatchStore();
    expect(await add(s, 'A', { [key]: 'interlock' })).toMatchObject({
      ok: false,
      message: 'interlock',
    });
    expect(s.validBatchItems).toEqual([]);
  });
  it('reports QTIME and FQC in sequence and then inserts the LOT', async () => {
    const s = useBatchStore(),
      h = hooks();
    s.editLotNo = 'A';
    api.fetchLotInfo.mockResolvedValueOnce(lot({ CHECKQTIME: 'Q', FQCSAMPLE: 'F' }));
    await s.getLotInfo(h);
    expect(h.alert.mock.calls.map((x) => x[0])).toEqual(['Q', 'F']);
    expect(s.validBatchItems).toHaveLength(1);
  });
  it('applies zone-recipe restriction unless child-batch checkbox bypasses it', async () => {
    const s = useBatchStore();
    expect(await add(s, 'A', { LIMITZONE: 'P02' })).toMatchObject({ ok: false });
    s.checkBoxChildBatch = true;
    expect(await add(s, 'A', { LIMITZONE: 'P02' })).toMatchObject({ ok: true });
  });
  it('normalizes new LOT flags without conflating LIMITZONE and THIN', async () => {
    const s = useBatchStore();
    await add(s);
    expect(s.batchItemList[0]).toMatchObject({
      NUM: '0',
      LOTID: 'A',
      N: 'N',
      ISDCOL: 'Y',
      THIN: 'N',
      THSPEC: 'Y',
      PTIN: 'Y',
      PTSPEC: 'Y',
      VIEWCOUNT: '',
      WAFERTYPE: '',
      PROCESSSTEP: 'DIFF(110000)',
    });
  });
  it('keeps dummy LOT id/recipe/count and uses the first non-dummy TYPE/recipe baseline', async () => {
    const s = useBatchStore();
    await add(s, 'DUMMY', { PROCESSNAME: 'MW_TEST', CHECKRECIPE: 'D', PROCESSOPERATIONTYPE: 'D' });
    expect(s.batchItemList[0]).toMatchObject({
      LOTID: 'DUMMY',
      WAFERTYPE: 'D/W',
      RECIPE: 'R',
      VIEWCOUNT: '1/2/3',
      THSPEC: 'N',
    });
    expect(await add(s, 'A')).toMatchObject({ ok: true });
  });
  it('checks STATUS before TYPE and preserves detailed message and clears LOT', async () => {
    const s = useBatchStore();
    await add(s);
    const r = await add(s, 'B', { STATUS: 'WAIT', PROCESSOPERATIONTYPE: 'OTHER' });
    expect(r.message).toBe(
      '[B] LOT의 상태는  [WAIT]\n이미구성된 LOT의 상태와 동일하지 않아\nBATCH를 구성할 수 없습니다.',
    );
    expect(s.editLotNo).toBe('');
  });
  it('toggles Z/TH/PT only under source flag conditions', async () => {
    const s = useBatchStore();
    await add(s);
    s.toggleBatchCell('0', 'ISDCOL');
    s.toggleBatchCell('0', 'THIN');
    s.toggleBatchCell('0', 'PTIN');
    expect(s.batchItemList[0]).toMatchObject({ ISDCOL: 'N', THIN: 'Y', PTIN: 'N' });
    s.checkedRadioButton('M');
    s.toggleBatchCell('0', 'ISDCOL');
    expect(s.batchItemList[0]?.ISDCOL).toBe('N');
    s.batchItemList[0]!.THSPEC = 'N';
    s.toggleBatchCell('0', 'THIN');
    s.toggleBatchCell('0', 'PTIN');
    expect(s.batchItemList[0]).toMatchObject({ THIN: 'Y', PTIN: 'N' });
  });
  it('aggregates parent LOTs using the source loop and automatically looks up the first zone', async () => {
    const s = useBatchStore();
    await add(s);
    await add(s, 'B');
    s.editMachine = 'EQP';
    api.fetchParentBatchIds.mockResolvedValueOnce([{ BATCHID: 'PB' }]);
    api.fetchBatchZone.mockResolvedValueOnce({ ZONE: 'P03' });
    await s.checkBoxChildChanged(true);
    expect(api.fetchParentBatchIds).toHaveBeenCalledWith({
      facility: 'TEST-FAB',
      eqpId: 'EQP',
      checkLotId: 'A,B,',
    });
    expect(api.fetchBatchZone).toHaveBeenCalledWith({ facility: 'TEST-FAB', batchId: 'PB' });
    expect(s.selectedChildZone).toBe('P03');
  });
  it('rolls back child on zone failure', async () => {
    const s = useBatchStore();
    s.checkBoxChild = true;
    api.fetchBatchZone.mockRejectedValueOnce(new Error('zone'));
    await expect(s.parentBatchChanged('PB')).rejects.toThrow('zone');
    expect(s.checkBoxChild).toBe(false);
  });
  it('validates child parent/zone and bypasses precheck for child create', async () => {
    const s = useBatchStore();
    s.editMachine = 'EQP';
    await add(s);
    s.checkBoxChild = true;
    expect(await s.btnBatchInput(hooks())).toMatchObject({
      ok: false,
      message: '모 BATCH ID와 자 ZONE을 입력 하세요.',
    });
    expect(api.checkBatchCreate).not.toHaveBeenCalled();
    s.selectedParentBatchId = 'PB';
    s.selectedChildZone = 'P03';
    await s.btnBatchInput(hooks());
    expect(api.checkBatchCreate).not.toHaveBeenCalled();
    expect(api.submitBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'C',
        childCheck: 'Y',
        parentBatchId: 'PB',
        childZone: 'P03',
        operatorId: '[Y]OP',
        rowNo: '6',
      }),
    );
  });
  it('submits source-shaped padded items and RUN count including the placeholder', async () => {
    const s = useBatchStore();
    s.editMachine = 'EQP';
    await add(s);
    await s.btnBatchInput(hooks());
    const p = api.submitBatch.mock.calls[0]![0];
    expect(p.monitorWaferCount).toBe('2');
    expect(p.items).toHaveLength(6);
    expect(p.items[0]).toEqual({
      ZONE: 'Y',
      LOTID: 'A',
      OPERATION: '1100',
      SUBOPERATION: '00',
      SLOTTYPE: '',
      PTIN: 'Y',
      THIN: 'N',
    });
    expect(p.items[5]).toEqual({
      ZONE: '',
      LOTID: '',
      OPERATION: '',
      SUBOPERATION: '',
      SLOTTYPE: '',
      PTIN: '',
      THIN: '',
    });
  });
  it('uses M update and source delete empty fields', async () => {
    const s = useBatchStore();
    s.editMachine = 'EQP';
    s.txtBatId = 'B';
    await add(s);
    await s.btnBatchInput(hooks());
    expect(api.submitBatch).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'M' }));
    await s.deleteBatch(hooks());
    expect(api.submitBatch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'D',
        batchType: '',
        parentBatchId: '',
        childZone: '',
        monitorWaferCount: '',
        items: [],
        operatorId: 'OP',
      }),
    );
  });
  it('stops on sample OK, continues on No with sampling and ordered warnings', async () => {
    const s = useBatchStore(),
      h = hooks();
    s.editMachine = 'EQP';
    await add(s);
    const check = {
      BATCHMESSGE: 'sample',
      CUMCOUNT: '1',
      MAXCOUNT: '2',
      UPDATEFLAG: 'Y',
      UVFLAG: 'N',
      SAMPLECYCLE: '3',
      REMOTE: 'Y',
    };
    api.checkBatchCreate.mockResolvedValue(check);
    expect(await s.btnBatchInput(h)).toMatchObject({ ok: false });
    expect(api.submitBatch).not.toHaveBeenCalled();
    h.confirm.mockResolvedValue(false);
    api.submitBatch.mockResolvedValue({ INTERLOCKMSG: 'I', TTINTERLOCKMSG: 'T', NOTICEDOWN: 'N' });
    await s.btnBatchInput(h);
    expect(api.submitBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        sampling: { CUMCOUNT: '1', MAXCOUNT: '2', UPDATEFLAG: 'Y', UVFLAG: 'N', SAMPLECYCLE: '3' },
      }),
    );
    expect(h.alert.mock.calls.map((x) => x[0])).toEqual(['Remote 장비 입니다.', 'I', 'T', 'N']);
  });
  it('loads common recipe and flags, locks parent, and keeps lookup summary', async () => {
    const s = useBatchStore();
    s.editLotNo = 'A';
    api.fetchLotInfo.mockResolvedValueOnce(lot({ BATCHID: 'B', MOLOT: 'PARENT' }));
    api.fetchBatchListByLot.mockResolvedValueOnce(batch({ PARENTBATCHID: 'PB', CHILDZONE: 'P02' }));
    await s.getLotInfo(hooks());
    expect(s.batchItemList[0]).toMatchObject({
      RECIPE: 'COMMON',
      THIN: 'Y',
      THSPEC: 'Y',
      PTIN: 'Y',
      PTSPEC: 'N',
      WAFERTYPE: '',
    });
    expect(s.parentBatchIds).toEqual([{ BATCHID: 'PB' }]);
    expect(s.childCheckDisabled).toBe(true);
    expect(s.txtProductName).toBe('P');
    expect(s.txtStep).toBe('DIFF(110000)');
    expect(s.relatedBatchLabel).toBe('母');
  });
  it('selects row into all summary fields', async () => {
    const s = useBatchStore();
    await add(s);
    s.selectBatchLot('0');
    expect(s.editLotNo).toBe('A');
    expect(s.txtProductName).toBe('P');
    expect(s.txtStep).toBe('DIFF(110000)(110000)');
  });
  it('clears equipment but preserves mode on initialize and Batchsub return', async () => {
    const s = useBatchStore();
    s.checkedRadioButton('M');
    s.monitorWaferCount = '3';
    s.editMachine = 'EQP';
    s.btnInitialize();
    expect(s.editMachine).toBe('');
    expect(s.radioType).toBe('M');
    expect(s.monitorWaferCount).toBe('3');
    s.editMachine = 'EQP';
    api.fetchLotInfo.mockResolvedValueOnce(lot());
    await s.applyBatchsubResult({ JALOTNAME: 'JA' }, hooks());
    expect(api.fetchLotInfo).toHaveBeenLastCalledWith(
      expect.objectContaining({ lotId: 'JA', eqpId: '' }),
    );
  });
  it('clears and refocuses LOT on backend failure', async () => {
    const s = useBatchStore();
    s.editLotNo = 'BAD';
    api.fetchLotInfo.mockRejectedValueOnce(new Error('bad'));
    await expect(s.getLotInfo()).rejects.toThrow('bad');
    expect(s.editLotNo).toBe('');
  });
  it('retains related navigation and clears LOT even when existing-batch load fails', async () => {
    const s = useBatchStore();
    s.editLotNo = 'A';
    api.fetchLotInfo.mockResolvedValueOnce(lot({ BATCHID: 'B', JALOT: 'JA', JACOUNT: '1' }));
    api.fetchBatchListByLot.mockRejectedValueOnce(new Error('list'));
    await expect(s.getLotInfo(hooks())).rejects.toThrow('list');
    expect(s.editLotNo).toBe('');
    expect(s.relatedBatchEnabled).toBe(true);
    expect(s.pslotname).toBe('JA');
  });
  it('loads the selected parent zone through its listener when Child was already checked', async () => {
    const s = useBatchStore();
    s.checkBoxChild = true;
    s.editLotNo = 'A';
    api.fetchLotInfo.mockResolvedValueOnce(lot({ BATCHID: 'B' }));
    api.fetchBatchListByLot.mockResolvedValueOnce(batch({ PARENTBATCHID: 'PB', CHILDZONE: 'P02' }));
    api.fetchBatchZone.mockResolvedValueOnce({ ZONE: 'P04' });
    await s.getLotInfo(hooks());
    expect(api.fetchBatchZone).toHaveBeenCalledWith({ facility: 'TEST-FAB', batchId: 'PB' });
    expect(s.selectedChildZone).toBe('P04');
  });
  it('preserves source NUM before filtering empty response LOT rows', async () => {
    const s = useBatchStore();
    api.fetchBatchListByLot.mockResolvedValueOnce(
      batch({ BATCHITEMS: [{ LOTID: '' }, { LOTID: 'A', ISDCOL: 'Y' }] }),
    );
    await s.getBatchListByLot('A');
    expect(s.batchItemList[0]?.NUM).toBe('1');
  });
  it('does not select an unknown CHILDZONE from existing batch', async () => {
    const s = useBatchStore();
    s.selectedChildZone = 'P04';
    api.fetchBatchListByLot.mockResolvedValueOnce(batch({ CHILDZONE: 'INVALID' }));
    await s.getBatchListByLot('A');
    expect(s.selectedChildZone).toBe('P04');
  });
  it('looks up a duplicate before applying source duplicate validation', async () => {
    const s = useBatchStore();
    await add(s);
    expect(await add(s)).toMatchObject({ ok: false, message: '이미 BATCH구성된 LOT입니다.' });
    expect(api.fetchLotInfo).toHaveBeenCalledTimes(2);
  });
  it.each([
    [
      { PROCESSOPERATIONTYPE: 'OTHER' },
      '[B] Lot의 공정은  [OTHER] 이며,\n이전 입력한 Lot의 공정 Type과 달라 Batch 생성이 불가 합니다.',
    ],
    [
      { CHECKRECIPE: 'OTHER' },
      '[B] Lot의 Recipe는  [OTHER] 이며,\n이전 입력한 Lot의 Recipe와 달라 Batch 생성이 불가 합니다.',
    ],
  ])('keeps the source TYPE/recipe interlock message', async (overrides, message) => {
    const s = useBatchStore();
    await add(s);
    expect(await add(s, 'B', overrides)).toMatchObject({ ok: false, message, focus: 'lot' });
  });
  it('declines existing batch lookup without fetching rows or clearing LOT', async () => {
    const s = useBatchStore(),
      h = hooks();
    s.editLotNo = 'A';
    h.confirm.mockResolvedValueOnce(false);
    api.fetchLotInfo.mockResolvedValueOnce(lot({ BATCHID: 'B' }));
    expect(await s.getLotInfo(h)).toEqual({ ok: false });
    expect(api.fetchBatchListByLot).not.toHaveBeenCalled();
    expect(s.editLotNo).toBe('A');
  });
  it('rejects a LOT belonging to another batch in edit mode', async () => {
    const s = useBatchStore();
    s.txtBatId = 'B';
    expect(await add(s, 'A', { BATCHID: 'OTHER' })).toMatchObject({
      ok: false,
      message: '[A]은 [OTHER]BATCH ID에 포함되어 있는 LOT입니다.',
    });
  });
  it('existing-batch lookup bypasses machine interlock but still blocks MAXBATCHMESSAGE', async () => {
    const s = useBatchStore();
    api.fetchBatchListByLot.mockResolvedValueOnce(batch());
    expect(
      await add(s, 'A', { BATCHID: 'B', CHECKMACHINE: 'blocked on insert only' }),
    ).toMatchObject({ ok: true });
    s.initializeBatchForm();
    expect(await add(s, 'A', { BATCHID: 'B', MAXBATCHMESSAGE: 'max' })).toMatchObject({
      ok: false,
      message: 'max',
    });
    expect(api.fetchBatchListByLot).toHaveBeenCalledTimes(1);
  });
  it('parent failures roll back selection, empty candidates do not invent a parent', async () => {
    const s = useBatchStore();
    await add(s);
    s.editMachine = 'EQP';
    api.fetchParentBatchIds.mockResolvedValueOnce([]);
    await s.checkBoxChildChanged(true);
    expect(s.selectedParentBatchId).toBe('');
    expect(api.fetchBatchZone).not.toHaveBeenCalled();
    api.fetchParentBatchIds.mockRejectedValueOnce(new Error('parent'));
    await expect(s.checkBoxChildChanged(true)).rejects.toThrow('parent');
    expect(s.checkBoxChild).toBe(false);
    expect(s.selectedChildZone).toBe('');
  });
  it('requires equipment/LOT before parent lookup and clears selection on uncheck', async () => {
    const s = useBatchStore();
    expect(await s.checkBoxChildChanged(true)).toMatchObject({
      ok: false,
      message: '장비명 먼저 입력후 선택하세요',
    });
    s.editMachine = 'EQP';
    expect(await s.checkBoxChildChanged(true)).toMatchObject({
      ok: false,
      message: 'LOT 먼저 입력후 선택하세요',
    });
    expect(s.checkBoxChild).toBe(false);
    s.selectedParentBatchId = 'PB';
    s.selectedChildZone = 'P03';
    await s.checkBoxChildChanged(false);
    expect(s.selectedParentBatchId).toBe('');
    expect(s.selectedChildZone).toBe('');
  });
  it('validates M count then equipment and overrides every M ZONE to N', async () => {
    const s = useBatchStore();
    s.checkedRadioButton('M');
    expect(await s.btnBatchInput()).toMatchObject({
      ok: false,
      message: 'MONITOR WAFER 갯수를 입력하세요.',
    });
    s.monitorWaferCount = '7';
    expect(await s.btnBatchInput()).toMatchObject({
      ok: false,
      message: 'MONITOR WAFER 갯수는 6개를 넘을수 없습니다.',
    });
    s.monitorWaferCount = '3';
    expect(await s.btnBatchInput()).toMatchObject({ ok: false, message: '장비를 입력하세요.' });
    s.editMachine = 'EQP';
    await add(s);
    await s.btnBatchInput(hooks());
    expect(api.submitBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        monitorWaferCount: '3',
        items: expect.arrayContaining([expect.objectContaining({ LOTID: 'A', ZONE: 'N' })]),
      }),
    );
  });
  it('uses N zone for dummy on RUN and blocks dummy measurement toggles', async () => {
    const s = useBatchStore();
    await add(s, 'DUMMY', { PROCESSNAME: 'MW_TEST' });
    s.editMachine = 'EQP';
    s.toggleBatchCell('0', 'THIN');
    s.toggleBatchCell('0', 'PTIN');
    expect(s.batchItemList[0]).toMatchObject({ THIN: 'N', PTIN: 'Y' });
    await s.btnBatchInput(hooks());
    expect(api.submitBatch.mock.calls[0]![0].items[0]).toMatchObject({
      ZONE: 'N',
      LOTID: 'DUMMY',
      SLOTTYPE: 'D/W',
    });
  });
  it('reloads a single related child directly with cleared equipment', async () => {
    const s = useBatchStore();
    s.editLotNo = 'A';
    api.fetchLotInfo.mockResolvedValueOnce(lot({ BATCHID: 'B', JALOT: 'JA', JACOUNT: '1' }));
    api.fetchBatchListByLot.mockResolvedValueOnce(batch());
    await s.getLotInfo(hooks());
    api.fetchLotInfo.mockResolvedValueOnce(lot());
    await s.searchRelatedBatch(hooks());
    expect(api.fetchLotInfo).toHaveBeenLastCalledWith(
      expect.objectContaining({ lotId: 'JA', eqpId: '' }),
    );
  });
  it('returns count title and handles empty count without success', async () => {
    const s = useBatchStore();
    api.fetchBatchCount
      .mockResolvedValueOnce({ BATCHCOUNTVIEW: 'R:2' })
      .mockResolvedValueOnce({ BATCHCOUNTVIEW: '' });
    expect(await s.getBatchCount()).toMatchObject({
      ok: true,
      title: 'BATCH COUNT 확인',
      message: 'R:2',
    });
    expect(await s.getBatchCount()).toMatchObject({
      ok: false,
      message: 'BATCHCOUNT 가 확인되지 않습니다.',
    });
  });
  it('redraw resets TextView-only measurement toggles to the source row flags', async () => {
    const s = useBatchStore();
    await add(s);
    s.toggleBatchCell('0', 'ISDCOL');
    s.toggleBatchCell('0', 'THIN');
    s.toggleBatchCell('0', 'PTIN');
    expect(s.batchItemList[0]).toMatchObject({ ISDCOL: 'N', THIN: 'Y', PTIN: 'N' });
    await add(s, 'B');
    expect(s.batchItemList[0]).toMatchObject({ ISDCOL: 'Y', THIN: 'N', PTIN: 'Y' });
    s.toggleBatchCell('0', 'THIN');
    s.selectBatchLot('1');
    s.btnDeleteBatch();
    expect(s.batchItemList[0]?.THIN).toBe('N');
  });
  it('does not enable parent selectors when candidates are empty or equipment validation stops lookup', async () => {
    const s = useBatchStore();
    await add(s);
    s.editMachine = 'EQP';
    api.fetchParentBatchIds.mockResolvedValueOnce([]);
    await s.checkBoxChildChanged(true);
    expect(s.parentBatchDisabled).toBe(true);
    expect(s.childZoneDisabled).toBe(true);
    await s.checkBoxChildChanged(false);
    s.editMachine = '';
    await s.checkBoxChildChanged(true);
    expect(s.parentBatchDisabled).toBe(true);
  });
  it('uses source NUM for the business cursor while selecting a response row by its unique display index', async () => {
    const s = useBatchStore();
    api.fetchBatchListByLot.mockResolvedValueOnce(
      batch({ BATCHITEMS: [{ LOTID: '' }, { LOTID: 'A', ISDCOL: 'Y' }] }),
    );
    await s.getBatchListByLot('A');
    s.selectBatchLot('0');
    expect(s.selectedRowIndex).toBe(1);
    expect(s.editLotNo).toBe('A');
    expect(s.rowDeleteEnabled).toBe(false);
    expect(s.selectedGridRowIndex).toBe(0);
  });
});
