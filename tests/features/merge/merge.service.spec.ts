import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('src/services/api-client', () => ({ default: { post } }));
vi.mock('src/features/main/stores/main.store', () => ({
  useMainStore: () => ({ mobileServerName: 'SERVER', deviceName: 'DEVICE' }),
}));

import {
  executeMergeLot,
  getMergeLot,
  mapMergeLotInfo,
} from 'src/features/merge/services/merge.service';

function response(body: Record<string, unknown>, status = 'PASS') {
  return {
    data: {
      statusCode: 200,
      result: JSON.stringify({ STATUS: status, ERRMSG: 'server error', MSGBODY: body }),
    },
  };
}

describe('merge service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps all summary fields and handles single ITEM or missing ITEMS', () => {
    const body = {
      PRODUCTSPECNAME: 'P',
      PRODUCTQUANTITY: 25,
      ITEMS: { ITEM: { LOTNAME: 'L2', PRODUCTQUANTITY: 12 } },
    };
    expect(mapMergeLotInfo(body).items).toEqual([
      {
        LOTNAME: 'L2',
        PRODUCTSPECNAME: '',
        PROCESSFLOWNAME: '',
        OPERATIONDESCRIPTION: '',
        PROCESSOPERATIONNAME: '',
        JOBCODE: '',
        PRODUCTQUANTITY: '12',
      },
    ]);
    expect(mapMergeLotInfo(body).PRODUCTQUANTITY).toBe('25');
    expect(mapMergeLotInfo({}).items).toEqual([]);
  });

  it('sends GETMERGELOT with the same fields as MessageFactoryUtil', async () => {
    post.mockResolvedValue(
      response({
        PRODUCTSPECNAME: 'P',
        ITEMS: { ITEM: [{ LOTNAME: 'L2', PRODUCTQUANTITY: '12' }] },
      }),
    );
    const result = await getMergeLot('FAB', 'L1');
    expect(result.items[0]?.LOTNAME).toBe('L2');
    expect(post).toHaveBeenCalledWith('/hifos/getmergelot', {
      sMsg: expect.stringContaining('<MSGNAME>GETMERGELOT</MSGNAME>'),
    });
    const xml = post.mock.calls[0]?.[1].sMsg as string;
    expect(xml).toContain('<FACILITY>FAB</FACILITY>');
    expect(xml).toContain('<LOTID>L1</LOTID>');
  });

  it('sends EXECUTEMERGE fields in order and escapes XML content', async () => {
    post.mockResolvedValue(response({ SUCCESS: 'Y', FAILLOTNAME: '' }));
    const result = await executeMergeLot({
      facility: 'FAB',
      lotName: 'L1',
      productSpec: 'P',
      route: 'R',
      operation: '100',
      qty: '25',
      operatorId: 'OP',
      comment: 'A&B',
      mergeLot: 'L2 12,L3 13',
    });
    expect(result.SUCCESS).toBe('Y');
    expect(post).toHaveBeenCalledWith('/hifos/executemerge', expect.anything());
    const xml = post.mock.calls[0]?.[1].sMsg as string;
    expect(xml).toContain('<FACTORYNAME>FAB</FACTORYNAME>');
    expect(xml).toContain('<COMMENT>A&amp;B</COMMENT>');
    expect(xml).toContain('<MERGELOT>L2 12,L3 13</MERGELOT>');
    expect(xml.indexOf('<LOTNAME>')).toBeLessThan(xml.indexOf('<MERGELOT>'));
  });

  it('surfaces server error', async () => {
    post.mockResolvedValue(response({}, 'FAIL'));
    await expect(getMergeLot('FAB', 'L1')).rejects.toThrow('server error');
  });
});
