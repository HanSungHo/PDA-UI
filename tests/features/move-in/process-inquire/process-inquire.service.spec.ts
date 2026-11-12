import processInquireService from 'src/features/move-in/services/process-inquire.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postAifMessage } = vi.hoisted(() => ({ postAifMessage: vi.fn() }));
vi.mock('src/services/aif-message.service', () => ({ postAifMessage }));

const pass = (body: Record<string, unknown> = {}) => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }),
});
const fail = (message: string) => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: message, MSGBODY: '' }),
});

describe('process-inquire.service (mock server API)', () => {
  beforeEach(() => {
    postAifMessage.mockReset();
  });

  it('sends MEASUREINFO with the operation and maps MEASUREITEMS.MEASUREITEM rows', async () => {
    postAifMessage.mockResolvedValue(
      pass({
        PRODUCT: 'P-DM',
        OPERATION: 'P00002',
        SUBOPERATION: '00',
        PHOTOJOBCODE: 'JOB',
        PROCESSSTEP: 'VI',
        QUANTITY: '25',
        SLOTLIST: '01',
        WAFERLIST: '02',
        SEMSLOTLIST: '03',
        SEMWAFERLIST: '04',
        MEASUREITEMS: {
          MEASUREITEM: [
            { SUBOPERATION: 'CD', SUBPROCESSSTEP: 'CD', ISCOMPLETE: 'Y', DESCRIPTION: 'd' },
          ],
        },
      }),
    );

    const res = await processInquireService.getMeasureInfo('WP-MEASURE', 'P00002');

    expect(postAifMessage).toHaveBeenCalledWith('MEASUREINFO', 'MEASUREINFO', [
      ['LOTID', 'WP-MEASURE'],
      ['FACILITY', 'FACILITY'],
      ['OPERATION', 'P00002'],
    ]);
    expect(res.data).toMatchObject({
      product: 'P-DM',
      processStep: 'VI',
      semWaferList: '04',
      measureItems: [
        { id: 'CD', subOperation: 'CD', processName: 'CD', status: 'Y', description: 'd' },
      ],
    });
  });

  it('throws the server ERRMSG on failure', async () => {
    postAifMessage.mockResolvedValue(fail('검색한 MEASURE 정보가 없습니다.'));

    await expect(processInquireService.getMeasureInfo('WP-MEASDONE', 'P00002')).rejects.toThrow(
      '검색한 MEASURE 정보가 없습니다.',
    );
  });

  it('sends CHECKDICYCLE through the message route with quoted operations and MULTI', async () => {
    postAifMessage.mockResolvedValue(pass({ DICYCLE: 'Y', ITEMS: [{ PHOTOOPERTYPE: 'CD' }] }));

    const res = await processInquireService.checkDiCycle('WP-MEASURE-DICYCLE', 'P00002', [
      'P00002-CD',
      'P00002-TH',
    ]);

    expect(postAifMessage).toHaveBeenCalledWith('message', 'CHECKDICYCLE', [
      ['LOTID', 'WP-MEASURE-DICYCLE'],
      ['FACILITY', 'FACILITY'],
      ['OPERATION', "'P00002-CD','P00002-TH'"],
      ['SUBOPERATION', 'MULTI'],
    ]);
    expect(res.data).toEqual({ diCycle: 'Y', items: [{ PHOTOOPERTYPE: 'CD' }] });
  });

  it('sends MEASURESET and MOVEIN with the legacy fields', async () => {
    postAifMessage.mockResolvedValueOnce(pass({ RECIPE: 'RCP', PROCESSSTEP: 'VI' }));
    postAifMessage.mockResolvedValueOnce(pass());

    const set = await processInquireService.submitMeasureSet({
      lotId: 'WP-MEASURE',
      facility: 'KFAB',
      operation: 'P00002',
      subOperation: 'CD',
      qty: '25',
      slotList: '01',
      waferList: '02',
      semSlotList: '03',
      semWaferList: '04',
    });
    await processInquireService.moveIn({
      lotId: 'WP-MEASURE',
      facility: 'KFAB',
      operation: 'P00002',
      subOperation: 'TH',
      qty: '25',
      reworkSkip: 'N',
    });

    expect(set.data.RECIPE).toBe('RCP');
    expect(postAifMessage.mock.calls[0]?.[2]).toContainEqual(['OPERATORID', 'OPERATOR_ID']);
    expect(postAifMessage.mock.calls[1]?.[2]).toEqual([
      ['LOTID', 'WP-MEASURE'],
      ['FACILITY', 'FACILITY'],
      ['RECIPE', ''],
      ['EQPID', ''],
      ['OPERATION', 'P00002'],
      ['SUBOPERATION', 'TH'],
      ['ISSKIP', 'Y'],
      ['OPERATORID', 'OPERATOR_ID'],
      ['ISEXPOSURE', 'N'],
      ['IDENTCODE', ''],
      ['RETICLEID', ''],
      ['QUANTITY', '25'],
      ['COMMENT', ''],
      ['REWORKSKIP', 'N'],
    ]);
  });
});
