import * as service from 'src/features/split/services/split.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postAifMessage } = vi.hoisted(() => ({ postAifMessage: vi.fn() }));
vi.mock('src/services/aif-message.service', () => ({ postAifMessage }));

const pass = (body: Record<string, string> = {}) => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }),
});
const fail = (message: string) => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: message, MSGBODY: '' }),
});

describe('split.service (mock server API)', () => {
  beforeEach(() => {
    postAifMessage.mockReset();
  });

  it('sends SLOTINFO with the legacy LOTID and FACILITY and normalizes the LOT info', async () => {
    postAifMessage.mockResolvedValue(
      pass({
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
      }),
    );

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
    expect(postAifMessage).toHaveBeenCalledWith('SLOTINFO', 'SLOTINFO', [
      ['LOTID', 'ABC1234X'],
      ['FACILITY', 'FAB1'],
    ]);
  });

  it('uses empty defaults for missing LOT and customer fields', async () => {
    postAifMessage.mockResolvedValue(pass());

    await expect(service.fetchLotInfo('EMPTY', 'FAB1')).resolves.toMatchObject({
      ok: true,
      data: { product: '', quantity: 0, waferList: [], childLotSequence: 0 },
    });
    await expect(service.fetchCustomer('PROD-X')).resolves.toEqual({ ok: true, data: '' });
    expect(postAifMessage).toHaveBeenLastCalledWith('CALLCUSTOMER', 'CALLCUSTOMER', [
      ['PRODUCT', 'PROD-X'],
    ]);
  });

  it('returns server failures without throwing', async () => {
    postAifMessage.mockResolvedValue(fail('LOT not found'));

    await expect(service.fetchCustomer('PROD-X')).resolves.toEqual({
      ok: false,
      message: 'LOT not found',
    });
  });

  it('builds the legacy split XML with one ITEM per child LOT', () => {
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
        '</ITEM><ITEM>',
        '<SPLITLOTID>ABC1234N2</SPLITLOTID>',
        '<SPLITQTY>1</SPLITQTY>',
        '<SPLITPROD>PROD-A100</SPLITPROD>',
        '<WAFERID>03</WAFERID>',
        '</ITEM>',
      ].join('\n'),
    );
  });

  it('submits SPLIT with the fixed legacy parameters and the SPLITITEMS XML fragment', async () => {
    postAifMessage.mockResolvedValue(pass());

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

    const [route, name, fields] = postAifMessage.mock.calls[0] as [
      string,
      string,
      [string, string | { xml: string }][],
    ];
    expect([route, name]).toEqual(['SPLIT', 'SPLIT']);
    expect(fields.map(([key]) => key)).toEqual([
      'LOTID',
      'FACILITY',
      'QUANTITY',
      'OPERATION',
      'SUBOPERATION',
      'PRODUCT',
      'ISSAMPLE',
      'SAMPLEOPER',
      'SAMPLESUBOPER',
      'OPERATORID',
      'SPLITITEMS',
      'COMMENT',
    ]);
    const byKey = Object.fromEntries(fields);
    expect(byKey).toMatchObject({ QUANTITY: '21', ISSAMPLE: 'N', SAMPLEOPER: '', COMMENT: 'memo' });
    expect((byKey.SPLITITEMS as { xml: string }).xml).toContain(
      '<SPLITLOTID>ABC1234N1</SPLITLOTID>',
    );
  });

  it('converts thrown network errors to failed service results', async () => {
    postAifMessage.mockRejectedValue(new Error('Network down'));

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
    postAifMessage.mockRejectedValue('timeout');

    await expect(service.fetchLotInfo('LOT', 'FAB')).resolves.toEqual({
      ok: false,
      message: 'Network error',
    });
  });
});
