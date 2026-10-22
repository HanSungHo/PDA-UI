import {
  checkBatchCreate,
  fetchBatchCount,
  fetchBatchListByLot,
  fetchBatchZone,
  fetchLotInfo,
  fetchMachineInfo,
  fetchParentBatchIds,
  submitBatch,
} from 'src/features/batch/services/batch.service';
import { ApiError } from 'src/services/api-error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('src/services/api-client', () => ({
  default: { post },
}));

function pass(body: Record<string, unknown> = {}) {
  return { data: { result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }) } };
}

function fail(message = 'failed') {
  return { data: { result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: message }) } };
}

describe('batch.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts REALEQPID with BACHCREATE and maps equipment info', async () => {
    post.mockResolvedValueOnce(pass({ EQPID: 'EQP-01', MSG: 'warning' }));

    await expect(fetchMachineInfo({ facility: 'KFAB', eqpId: 'eqp-01' })).resolves.toEqual({
      EQPID: 'EQP-01',
      MSG: 'warning',
    });
    expect(post).toHaveBeenCalledWith('/hifos/REALEQPID', {
      FACILITY: 'KFAB',
      EQPID: 'eqp-01',
      TYPE: 'BACHCREATE',
    });
  });

  it('posts BLOTINFO and maps every field used by BatchActivity', async () => {
    const response = {
      PRODUCT: 'P1',
      OPERATION: '1100',
      SUBOPERATION: '00',
      PROCESSSTEP: 'DIFF',
      QUANTITY: '25',
      BATCHID: '',
      STEPRECIPE: 'RCP',
      LIMITZONE: 'O',
      STATUS: 'RUN',
      VIEWCOUNT: '1/2/3',
      PROCESSNAME: '',
      PTIN: 'Y',
      PTSPEC: 'Y',
      CHECKQTIME: 'qtime',
      PROCESSOPERATIONTYPE: 'TYPE-A',
      JALOT: 'LOT-JA',
      MOLOT: '',
      CHECKRECIPE: 'RCP-CHECK',
      JACOUNT: '1',
      LIMITRECIPE: 'RCP',
      FQCSAMPLE: 'sample',
      CHECKMACHINE: '',
      CHECKOPERTION: '',
      CHECKDEPOCOMMENT: '',
      CHECKRECYCLECOMMENT: '',
      CHECKTHCIKNESSCOMMENT: '',
      MAXBATCHMESSAGE: '',
    };
    post.mockResolvedValueOnce(pass(response));

    await expect(
      fetchLotInfo({
        lotId: 'LOT-01',
        facility: 'KFAB',
        zone: '1',
        eqpId: 'EQP-01',
        addedLotId: "'LOT-00'",
      }),
    ).resolves.toEqual(response);
    expect(post).toHaveBeenCalledWith('/hifos/BLOTINFO', {
      LOTID: 'LOT-01',
      FACILITY: 'KFAB',
      ZONE: '1',
      EQPID: 'EQP-01',
      ADDEDLOTID: "'LOT-00'",
    });
  });

  it('posts BATCHLISTBYLOT with CASE SERCH and maps batch rows', async () => {
    post.mockResolvedValueOnce(
      pass({
        BATCHID: 'BAT-01',
        EQPID: 'EQP-01',
        BATCHTYPE: 'R',
        MWCOUNT: '2',
        RECIPE: 'RCP-A',
        PARENTBATCHID: 'PBAT-01',
        CHILDZONE: 'P02',
        BATCHITEMS: [{ LOTID: 'LOT-01', PRODUCT: 'P1', QUANTITY: '25', STATUS: 'RUN' }],
      }),
    );

    const result = await fetchBatchListByLot({ lotId: 'LOT-01', facility: 'KFAB' });

    expect(result.BATCHID).toBe('BAT-01');
    expect(result.BATCHITEMS).toEqual([
      expect.objectContaining({ LOTID: 'LOT-01', PRODUCT: 'P1', QUANTITY: '25', STATUS: 'RUN' }),
    ]);
    expect(post).toHaveBeenCalledWith('/hifos/BATCHLISTBYLOT', {
      LOTID: 'LOT-01',
      FACILITY: 'KFAB',
      CASE: 'SERCH',
    });
  });

  it('maps all raw batch grid fields with zero-based NUM for store normalization', async () => {
    const item = {
      ISDCOL: 'Y',
      LOTID: 'LOT-01',
      PRODUCT: 'P',
      QUANTITY: '25',
      PROCESSSTEP: 'S',
      OPERATION: '100',
      SUBOPERATION: '00',
      N: '1',
      RECIPE: 'R',
      VIEWCOUNT: '3/4',
      WAFERTYPE: '',
      THIN: 'VALUE',
      THSPEC: 'SPEC',
      PTIN: 'PT',
      PTSPEC: 'PTSPEC',
      STATUS: 'RUN',
    };
    post.mockResolvedValueOnce(pass({ BATCHITEMS: [item, { ...item, LOTID: 'LOT-02', NUM: 1 }] }));
    expect((await fetchBatchListByLot({ lotId: 'LOT-01', facility: 'KFAB' })).BATCHITEMS).toEqual([
      { ...item, NUM: '0' },
      { ...item, LOTID: 'LOT-02', NUM: '1' },
    ]);
  });

  it('reads batch rows only from the BATCHITEMS source contract', async () => {
    post.mockResolvedValueOnce(pass({ BATCHITEMS: [], ITEMS: [{ LOTID: 'UNRELATED' }] }));
    expect((await fetchBatchListByLot({ lotId: 'LOT-01', facility: 'KFAB' })).BATCHITEMS).toEqual(
      [],
    );
  });

  it('reads batch rows from the nested ITEM response used by Android', async () => {
    post.mockResolvedValueOnce(pass({ BATCHITEMS: { ITEM: [{ LOTID: 'LOT-01' }] } }));
    const result = await fetchBatchListByLot({ lotId: 'LOT-01', facility: 'KFAB' });
    expect(result.BATCHITEMS).toEqual([expect.objectContaining({ LOTID: 'LOT-01' })]);
  });

  it('reads parent candidates from the nested ITEM response used by Android', async () => {
    post.mockResolvedValueOnce(pass({ ITEMS: { ITEM: [{ BATCHID: 'PBAT-01' }] } }));
    await expect(
      fetchParentBatchIds({ facility: 'KFAB', eqpId: 'EQP-01', checkLotId: 'LOT-01' }),
    ).resolves.toEqual([{ BATCHID: 'PBAT-01' }]);
  });

  it.each([{ ITEM: [] }, {}, null])('maps an empty nested list %j to no items', async (value) => {
    post.mockResolvedValueOnce(pass({ BATCHITEMS: value }));
    expect((await fetchBatchListByLot({ lotId: 'LOT-01', facility: 'KFAB' })).BATCHITEMS).toEqual(
      [],
    );
    post.mockResolvedValueOnce(pass({ ITEMS: value }));
    await expect(
      fetchParentBatchIds({ facility: 'KFAB', eqpId: 'EQP-01', checkLotId: 'LOT-01' }),
    ).resolves.toEqual([]);
  });

  it('posts BATCHCOUNTSERCH with empty payload and maps count text', async () => {
    post.mockResolvedValueOnce(pass({ BATCHCOUNTVIEW: 'RUN: 2\nM: 1' }));

    await expect(fetchBatchCount()).resolves.toEqual({ BATCHCOUNTVIEW: 'RUN: 2\nM: 1' });
    expect(post).toHaveBeenCalledWith('/hifos/BATCHCOUNTSERCH', {});
  });

  it('posts parent and zone lookups with MessageFactory keys and ITEMS response', async () => {
    post
      .mockResolvedValueOnce(pass({ ITEMS: [{ BATCHID: 'PBAT-01' }] }))
      .mockResolvedValueOnce(pass({ ZONE: 'P03' }));
    await expect(
      fetchParentBatchIds({ facility: 'KFAB', eqpId: 'EQP-01', checkLotId: 'LOT-01,LOT-02' }),
    ).resolves.toEqual([{ BATCHID: 'PBAT-01' }]);
    await expect(fetchBatchZone({ facility: 'KFAB', batchId: 'PBAT-01' })).resolves.toEqual({
      ZONE: 'P03',
    });
    expect(post).toHaveBeenNthCalledWith(1, '/hifos/GETPARENTBATCHID', {
      FACILITY: 'KFAB',
      LOTID: 'LOT-01,LOT-02',
      MACHINENAME: 'EQP-01',
    });
    expect(post).toHaveBeenNthCalledWith(2, '/hifos/GETBATCHZONE', {
      FACILITY: 'KFAB',
      MBATCHID: 'PBAT-01',
    });
  });

  const item = {
    ZONE: 'Y',
    LOTID: 'LOT-01',
    OPERATION: '1100',
    SUBOPERATION: '00',
    SLOTTYPE: '',
    PTIN: 'N',
    THIN: 'Y',
  };
  const fragment =
    '<ITEM>\n<ZONE>Y</ZONE>\n<LOTID>LOT-01</LOTID>\n<OPERATION>1100</OPERATION>\n<SUBOPERATION>00</SUBOPERATION>\n<SLOTTYPE></SLOTTYPE>\n<PTIN>N</PTIN>\n<THIN>Y</THIN>\n</ITEM>\n';
  const sampling = {
    CUMCOUNT: '10',
    MAXCOUNT: '20',
    UPDATEFLAG: 'Y',
    UVFLAG: 'N',
    SAMPLECYCLE: '3',
  };
  const submitRequest = {
    type: 'C' as const,
    facility: 'KFAB',
    eqpId: 'EQP-01',
    batchId: '',
    batchType: 'R',
    childCheck: '',
    parentBatchId: '',
    childZone: '',
    operatorId: 'USER',
    rowNo: '6',
    monitorWaferCount: '2',
    items: [item],
  };
  const submitPayload = {
    TYPE: 'C',
    FACILITY: 'KFAB',
    EQPID: 'EQP-01',
    BATCHID: '',
    BATCHTYPE: 'R',
    CHALIDCHECK: '',
    MBATCHID: '',
    CHALIDZONE: '',
    OPERATORID: 'USER',
    ROWNO: '6',
    MWCOUNT: '2',
    BATCHITEMS: fragment,
  };

  it('posts exact pre-check payload and maps all sampling/remote fields', async () => {
    const response = { BATCHMESSGE: 'sample warning', ...sampling, REMOTE: 'Y' };
    post.mockResolvedValueOnce(pass(response));
    await expect(
      checkBatchCreate({ facility: 'KFAB', eqpId: 'EQP-01', childCheck: 'N', items: [item] }),
    ).resolves.toEqual(response);
    expect(post).toHaveBeenCalledWith('/hifos/BATCHCRTCHECK', {
      FACILITY: 'KFAB',
      EQPID: 'EQP-01',
      CHALIDCHECK: 'N',
      BATCHITEMS: fragment,
    });
  });

  it('serializes all six items without mapping grid fields or padding inside the service', async () => {
    const emptyItem = {
      ZONE: '',
      LOTID: '',
      OPERATION: '',
      SUBOPERATION: '',
      SLOTTYPE: '',
      PTIN: '',
      THIN: '',
    };
    const emptyFragment =
      '<ITEM>\n<ZONE></ZONE>\n<LOTID></LOTID>\n<OPERATION></OPERATION>\n<SUBOPERATION></SUBOPERATION>\n<SLOTTYPE></SLOTTYPE>\n<PTIN></PTIN>\n<THIN></THIN>\n</ITEM>\n';
    post.mockResolvedValueOnce(pass());
    await checkBatchCreate({
      facility: 'KFAB',
      eqpId: 'EQP-01',
      childCheck: 'N',
      items: [item, ...Array.from({ length: 5 }, () => ({ ...emptyItem }))],
    });
    expect(post).toHaveBeenCalledWith('/hifos/BATCHCRTCHECK', {
      FACILITY: 'KFAB',
      EQPID: 'EQP-01',
      CHALIDCHECK: 'N',
      BATCHITEMS: fragment + emptyFragment.repeat(5),
    });
  });

  it.each(['C', 'M'] as const)(
    'posts BATCHCRT TYPE %s with sampling nodes at the top level and maps warning order fields',
    async (type) => {
      const response = {
        INTERLOCKMSG: 'first',
        TTINTERLOCKMSG: 'second',
        NOTICEDOWN: 'third',
        MSG: '',
      };
      post.mockResolvedValueOnce(pass(response));
      await expect(submitBatch({ ...submitRequest, type, sampling })).resolves.toEqual(response);
      expect(post).toHaveBeenCalledWith('/hifos/BATCHCRT', {
        ...submitPayload,
        TYPE: type,
        ...sampling,
      });
    },
  );

  it('posts child identifiers and operator exactly as provided without adding sampling fields', async () => {
    post.mockResolvedValueOnce(pass());
    await submitBatch({
      ...submitRequest,
      childCheck: 'Y',
      parentBatchId: 'PARENT',
      childZone: 'P02',
      operatorId: '[Y]USER',
    });
    expect(post).toHaveBeenCalledWith('/hifos/BATCHCRT', {
      ...submitPayload,
      CHALIDCHECK: 'Y',
      MBATCHID: 'PARENT',
      CHALIDZONE: 'P02',
      OPERATORID: '[Y]USER',
    });
  });

  it('posts deletion with an empty BATCHITEMS value', async () => {
    post.mockResolvedValueOnce(pass());
    await submitBatch({
      ...submitRequest,
      type: 'D',
      batchId: 'BATCH-01',
      batchType: '',
      monitorWaferCount: '',
      items: [],
    });
    expect(post).toHaveBeenCalledWith('/hifos/BATCHCRT', {
      ...submitPayload,
      TYPE: 'D',
      BATCHID: 'BATCH-01',
      BATCHTYPE: '',
      MWCOUNT: '',
      BATCHITEMS: '',
    });
  });

  it('maps all BLOTINFO interlocks including the source spelling CHECKTHCIKNESSCOMMENT', async () => {
    const interlocks = {
      CHECKMACHINE: 'machine',
      CHECKOPERTION: 'operation',
      CHECKDEPOCOMMENT: 'depo',
      CHECKRECYCLECOMMENT: 'recycle',
      CHECKTHCIKNESSCOMMENT: 'thickness',
      MAXBATCHMESSAGE: 'max',
    };
    post.mockResolvedValueOnce(pass(interlocks));
    expect(
      await fetchLotInfo({ lotId: 'L', facility: 'F', zone: '1', eqpId: 'E', addedLotId: '' }),
    ).toMatchObject(interlocks);
  });

  it('defaults empty pre-check, submit, parent and zone responses deterministically', async () => {
    post.mockResolvedValue(pass());
    await expect(
      checkBatchCreate({ facility: 'F', eqpId: 'E', childCheck: 'N', items: [] }),
    ).resolves.toEqual({
      BATCHMESSGE: '',
      CUMCOUNT: '',
      MAXCOUNT: '',
      UPDATEFLAG: '',
      UVFLAG: '',
      SAMPLECYCLE: '',
      REMOTE: '',
    });
    await expect(submitBatch(submitRequest)).resolves.toEqual({
      INTERLOCKMSG: '',
      TTINTERLOCKMSG: '',
      NOTICEDOWN: '',
      MSG: '',
    });
    await expect(
      fetchParentBatchIds({ facility: 'F', eqpId: 'E', checkLotId: 'L' }),
    ).resolves.toEqual([]);
    await expect(fetchBatchZone({ facility: 'F', batchId: 'B' })).resolves.toEqual({ ZONE: '' });
  });

  it.each([
    ['REALEQPID', () => fetchMachineInfo({ facility: 'F', eqpId: 'E' })],
    [
      'BLOTINFO',
      () => fetchLotInfo({ lotId: 'L', facility: 'F', zone: '1', eqpId: 'E', addedLotId: '' }),
    ],
    ['BATCHLISTBYLOT', () => fetchBatchListByLot({ lotId: 'L', facility: 'F' })],
    ['BATCHCOUNTSERCH', () => fetchBatchCount()],
    ['GETPARENTBATCHID', () => fetchParentBatchIds({ facility: 'F', eqpId: 'E', checkLotId: 'L' })],
    ['GETBATCHZONE', () => fetchBatchZone({ facility: 'F', batchId: 'B' })],
    [
      'BATCHCRTCHECK',
      () => checkBatchCreate({ facility: 'F', eqpId: 'E', childCheck: 'N', items: [] }),
    ],
    ['BATCHCRT', () => submitBatch(submitRequest)],
  ] as const)('rejects FAIL for %s with the API code', async (code, call) => {
    post.mockResolvedValueOnce(fail('source error'));
    await expect(call()).rejects.toMatchObject({ message: 'source error', code });
  });

  it('throws ApiError on FAIL and maps empty response deterministically', async () => {
    post.mockResolvedValueOnce(fail('bad lot')).mockResolvedValueOnce(pass());

    await expect(
      fetchLotInfo({
        lotId: 'LOT-404',
        facility: 'KFAB',
        zone: '1',
        eqpId: 'EQP-01',
        addedLotId: '',
      }),
    ).rejects.toMatchObject(new ApiError('bad lot', { code: 'BLOTINFO' }));

    await expect(fetchBatchListByLot({ lotId: 'LOT-EMPTY', facility: 'KFAB' })).resolves.toEqual({
      BATCHID: '',
      EQPID: '',
      BATCHTYPE: '',
      MWCOUNT: '',
      RECIPE: '',
      PARENTBATCHID: '',
      CHILDZONE: '',
      BATCHITEMS: [],
    });
  });
});
