import {
  buildStockOutItemList,
  lotStatusByBayService,
} from 'src/features/lot-status-by-bay/services/lot-status-by-bay.service';
import { postAifMessage } from 'src/services/aif-message.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/aif-message.service', () => ({ postAifMessage: vi.fn() }));

function respond(body: unknown): void {
  vi.mocked(postAifMessage).mockResolvedValue({
    statusCode: 200,
    result: JSON.stringify(body),
  });
}

const ROW = {
  JOBCODE: 'J100',
  PROCESSSTEP: 'PHOTO-COAT',
  LOTID: 'LOT-A001',
  LOCATION: 'STK-A',
  QUANTITY: '25',
  LOC_TYPE: 'S',
};

describe('lotStatusByBayService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends AREABAYINFO with AREA and FACILITY and reads BAYS.ITEM[].BAY', async () => {
    respond({ STATUS: 'PASS', MSGBODY: { BAYS: { ITEM: [{ BAY: 'BAY-A' }, { BAY: 'BAY-B' }] } } });

    await expect(
      lotStatusByBayService.areaBayInfo({ area: 'PHOTO', facility: 'GUMI' }),
    ).resolves.toEqual({ isSuccessFul: true, messageBody: ['BAY-A', 'BAY-B'], errorMessage: '' });
    expect(postAifMessage).toHaveBeenCalledWith('AREABAYINFO', 'AREABAYINFO', [
      ['AREA', 'PHOTO'],
      ['FACILITY', 'GUMI'],
    ]);
  });

  it('reads a single ITEM object and a bare BAYS array as lists', async () => {
    respond({ STATUS: 'PASS', MSGBODY: { BAYS: { ITEM: { BAY: 'P01' } } } });
    expect(
      (await lotStatusByBayService.areaBayInfo({ area: '', facility: '' })).messageBody,
    ).toEqual(['P01']);

    respond({ STATUS: 'PASS', MSGBODY: { BAYS: [{ BAY: 'P01' }, { BAY: 'P02' }] } });
    expect(
      (await lotStatusByBayService.areaBayInfo({ area: '', facility: '' })).messageBody,
    ).toEqual(['P01', 'P02']);

    respond({ STATUS: 'PASS', MSGBODY: {} });
    expect(
      (await lotStatusByBayService.areaBayInfo({ area: '', facility: '' })).messageBody,
    ).toEqual([]);
  });

  it('sends BAYSTOCKERINFO with BAY and FACILITY and reads STOCKERS.ITEM[].STOCKER', async () => {
    respond({ STATUS: 'PASS', MSGBODY: { STOCKERS: { ITEM: [{ STOCKER: 'STK-A' }] } } });

    const result = await lotStatusByBayService.bayStockerInfo({ bay: 'BAY-A', facility: 'GUMI' });

    expect(result.messageBody).toEqual(['STK-A']);
    expect(postAifMessage).toHaveBeenCalledWith('BAYSTOCKERINFO', 'BAYSTOCKERINFO', [
      ['BAY', 'BAY-A'],
      ['FACILITY', 'GUMI'],
    ]);
  });

  it('sends BLSTINFO in the legacy field order and maps BLSTITEMS rows to the grid keys', async () => {
    respond({
      STATUS: 'PASS',
      MSGBODY: {
        BLSTITEMS: { ITEM: [{ ...ROW, BAY: 'BAY-A', QUANTITY: 25 }, { LOTID: 'LOT-X' }] },
      },
    });

    const result = await lotStatusByBayService.blstInfo({
      bay: 'BAY-A',
      stk: '모두',
      job: 'J100',
      facility: 'GUMI',
    });

    expect(result.messageBody).toEqual([
      ROW,
      { JOBCODE: '', PROCESSSTEP: '', LOTID: 'LOT-X', LOCATION: '', QUANTITY: '', LOC_TYPE: '' },
    ]);
    expect(postAifMessage).toHaveBeenCalledWith('BLSTINFO', 'BLSTINFO', [
      ['BAY', 'BAY-A'],
      ['STOCKER', '모두'],
      ['JOBCODE', 'J100'],
      ['FACILITY', 'GUMI'],
    ]);
  });

  it('sends STOCKOUT with ROWNO and the raw STOCKERS item list', async () => {
    respond({ STATUS: 'PASS', MSGBODY: {} });
    const items = [
      { lotId: 'LOT-A001', stockerId: 'STK-A' },
      { lotId: 'LOT-A002', stockerId: 'STK-B' },
    ];

    await lotStatusByBayService.stockOut({ facility: 'GUMI', port: '2OUT', items });

    expect(postAifMessage).toHaveBeenCalledWith('STOCKOUT', 'STOCKOUT', [
      ['FACILITY', 'GUMI'],
      ['PORT', '2OUT'],
      ['ROWNO', '2'],
      ['STOCKERS', { xml: `\n${buildStockOutItemList(items)}\n` }],
    ]);
    expect(buildStockOutItemList(items)).toBe(
      '<ITEM>\n<LOTID>LOT-A001</LOTID>\n<STOCKER>STK-A</STOCKER>\n</ITEM>' +
        '<ITEM>\n<LOTID>LOT-A002</LOTID>\n<STOCKER>STK-B</STOCKER>\n</ITEM>',
    );
  });

  it('returns ERRMSG for a FAIL envelope and the error text for a transport failure', async () => {
    respond({ STATUS: 'FAIL', ERRMSG: 'BAY DATA Empty!', MSGBODY: '' });
    await expect(
      lotStatusByBayService.bayStockerInfo({ bay: 'BAY-A', facility: 'GUMI' }),
    ).resolves.toEqual({ isSuccessFul: false, messageBody: [], errorMessage: 'BAY DATA Empty!' });

    vi.mocked(postAifMessage).mockRejectedValueOnce(new Error('Network Error'));
    await expect(
      lotStatusByBayService.blstInfo({ bay: 'BAY-A', stk: '모두', job: '', facility: 'GUMI' }),
    ).resolves.toEqual({ isSuccessFul: false, messageBody: [], errorMessage: 'Network Error' });

    vi.mocked(postAifMessage).mockRejectedValueOnce('timeout');
    await expect(
      lotStatusByBayService.stockOut({ facility: 'GUMI', port: 'OUT', items: [] }),
    ).resolves.toEqual({ isSuccessFul: false, messageBody: {}, errorMessage: 'timeout' });
  });
});
