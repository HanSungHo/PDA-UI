import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('src/services/api-client', () => ({ default: { post } }));

async function loadService() {
  vi.resetModules();
  vi.stubEnv('VITE_USE_MOCK', 'false');
  return import('src/features/split/services/split.service');
}

async function loadMockService() {
  vi.resetModules();
  vi.stubEnv('VITE_USE_MOCK', 'true');
  return import('src/features/split/services/split.service');
}

describe('split.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fetches and normalizes LOT info from the message gateway', async () => {
    const service = await loadService();
    post.mockResolvedValueOnce({
      data: {
        isSuccessful: true,
        errorMessage: '',
        body: {
          PRODUCT: 'PROD-A100',
          OPERATION: '1000',
          SUBOPERATION: 'A',
          PROCESSSTEP: 'STEP01',
          QUANTITY: '25',
          STATE: 'WIP',
          STATUS: 'WAIT',
          HOLDSTATUS: '',
          BATCHID: '',
          WAFERLIST: '01, 02,,03',
          SAMPLEFLAG: '',
          ROOTLOTNAME: 'ABC1234',
          CHILDLOTSEQUENCE: 'bad-number',
        },
      },
    });

    await expect(service.fetchLotInfo('ABC1234X', 'FAB1')).resolves.toEqual({
      ok: true,
      data: {
        product: 'PROD-A100',
        operation: '1000',
        subOperation: 'A',
        processStep: 'STEP01',
        quantity: 25,
        state: 'WIP',
        status: 'WAIT',
        holdStatus: '',
        batchId: '',
        waferList: ['01', '02', '03'],
        sampleFlag: '',
        rootLotName: 'ABC1234',
        childLotSequence: 0,
      },
    });
    expect(post).toHaveBeenCalledWith('/api/message/send', {
      name: 'SLOTINFO',
      params: { lotId: 'ABC1234X', facility: 'FAB1' },
    });
  });

  it('uses empty defaults for missing LOT and customer fields', async () => {
    const service = await loadService();
    post.mockResolvedValueOnce({
      data: { isSuccessful: true, errorMessage: '', body: {} },
    });

    await expect(service.fetchLotInfo('EMPTY', 'FAB1')).resolves.toEqual({
      ok: true,
      data: {
        product: '',
        operation: '',
        subOperation: '',
        processStep: '',
        quantity: 0,
        state: '',
        status: '',
        holdStatus: '',
        batchId: '',
        waferList: [],
        sampleFlag: '',
        rootLotName: '',
        childLotSequence: 0,
      },
    });

    post.mockResolvedValueOnce({
      data: { isSuccessful: true, errorMessage: '', body: {} },
    });
    await expect(service.fetchCustomer('PROD-X')).resolves.toEqual({ ok: true, data: '' });
  });

  it('returns gateway failures without throwing', async () => {
    const service = await loadService();
    post.mockResolvedValueOnce({
      data: { isSuccessful: false, errorMessage: 'LOT not found', body: {} },
    });

    await expect(service.fetchCustomer('PROD-X')).resolves.toEqual({
      ok: false,
      message: 'LOT not found',
    });
  });

  it('builds the legacy split XML with one ITEM per child LOT', async () => {
    const service = await loadService();

    expect(
      service.buildSplitLostXml([
        { splitLotId: 'ABC1234N1', splitQty: 2, splitProd: 'PROD-A100', waferId: '01,02' },
        { splitLotId: 'ABC1234N2', splitQty: 1, splitProd: 'PROD-A100', waferId: '03' },
      ]),
    ).toBe(
      [
        '<ITEM>',
        '<SPLITLOTID>ABC1234N1</SPLITLOTID>',
        '<SPLITQTY>2</SPLITQTY>',
        '<SPLITPROD>PROD-A100</SPLITPROD>',
        '<WAFERID>01,02</WAFERID>',
        '</ITEM>',
        '<ITEM>',
        '<SPLITLOTID>ABC1234N2</SPLITLOTID>',
        '<SPLITQTY>1</SPLITQTY>',
        '<SPLITPROD>PROD-A100</SPLITPROD>',
        '<WAFERID>03</WAFERID>',
        '</ITEM>',
      ]
        .join('\n')
        .replace('</ITEM>\n<ITEM>', '</ITEM><ITEM>'),
    );
  });

  it('submits split requests using fixed legacy parameters and XML payload', async () => {
    const service = await loadService();
    post.mockResolvedValueOnce({ data: { isSuccessful: true, errorMessage: '', body: {} } });

    await expect(
      service.submitSplit({
        lotId: 'ABC1234X',
        facility: 'FAB1',
        qty: 21,
        operation: '1000',
        subOperation: 'A',
        product: 'PROD-A100',
        operatorId: 'OP01',
        items: [
          { splitLotId: 'ABC1234N1', splitQty: 4, splitProd: 'PROD-A100', waferId: '01,02,03,04' },
        ],
        comment: 'memo',
      }),
    ).resolves.toEqual({ ok: true, data: null });

    expect(post).toHaveBeenCalledWith('/api/message/send', {
      name: 'SPLIT',
      params: expect.objectContaining({
        lotId: 'ABC1234X',
        facility: 'FAB1',
        qty: '21',
        operation: '1000',
        subOperation: 'A',
        product: 'PROD-A100',
        flag: 'N',
        reserved1: '',
        reserved2: '',
        operatorId: 'OP01',
        splitLostList: expect.stringContaining('<SPLITLOTID>ABC1234N1</SPLITLOTID>'),
        comment: 'memo',
      }),
    });
  });

  it('converts thrown network errors to failed service results', async () => {
    const service = await loadService();
    post.mockRejectedValueOnce(new Error('Network down'));

    await expect(
      service.submitSplit({
        lotId: 'LOT',
        facility: 'FAB',
        qty: 0,
        operation: '',
        subOperation: '',
        product: '',
        operatorId: 'OP',
        items: [],
        comment: '',
      }),
    ).resolves.toEqual({ ok: false, message: 'Network down' });
  });

  it('uses a generic network message for non-Error exceptions', async () => {
    const service = await loadService();
    post.mockRejectedValueOnce('timeout');

    await expect(service.fetchLotInfo('LOT', 'FAB')).resolves.toEqual({
      ok: false,
      message: 'Network error',
    });
  });

  it('uses split mock responses when mock mode is enabled', async () => {
    const service = await loadMockService();

    await expect(service.fetchLotInfo('ABC1234X', 'FAB1')).resolves.toMatchObject({
      ok: true,
      data: {
        product: 'PROD-A100',
        quantity: 25,
        waferList: expect.arrayContaining(['01', '25']),
      },
    });
    await expect(service.fetchCustomer('PROD-CUST')).resolves.toEqual({
      ok: true,
      data: 'CUSTOMER-X',
    });
    expect(post).not.toHaveBeenCalled();
  });
});
