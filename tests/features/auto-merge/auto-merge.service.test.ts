import { createPinia, setActivePinia } from 'pinia';
import {
  executeAutoMergeLot,
  getAutoMergeLot,
  getAutoMergeLot2,
} from 'src/features/auto-merge/services/auto-merge.service';
import { useMainStore } from 'src/features/main/stores/main.store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('src/services/api-client', () => ({ default: { post }, setApiBaseUrl: vi.fn() }));

function response(body: unknown = {}) {
  return { data: { statusCode: 200, result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }) } };
}
const request = {
  FACTORYNAME: 'FAB',
  LOTNAME: 'MAIN',
  PARENTLOTNAME: 'PARENT',
  PRODUCTSPECNAME: 'PRODUCT',
  ROUTE: 'ROUTE',
  PROCESSOPERATIONNAME: '1000',
  QTY: '25',
  OPERATORID: 'OP',
  COMMENT: ' a<&"\ncomment ',
  MERGELOT: 'LOT1 10,LOT2 15',
};
function assertEnvelope(name: string, fields: Record<string, string>) {
  expect(post).toHaveBeenCalledTimes(1);
  const [url, payload] = post.mock.calls[0]!;
  expect(url).toBe('/hifos/message');
  const parsed = new DOMParser().parseFromString(payload.sMsg, 'application/xml');
  expect(parsed.querySelector('parsererror')).toBeNull();
  expect(parsed.querySelector('MSGNAME')?.textContent).toBe(name);
  expect(parsed.querySelector('RECEIVER')?.textContent).toBe('MOBILE');
  expect(parsed.querySelector('SENDER')?.textContent).toBe('PDA');
  expect(parsed.querySelector('MSGTYPE')?.textContent).toBe('P');
  expect(parsed.querySelector('WITHREPLY')?.textContent).toBe('YES');
  const body = parsed.querySelector('MSGBODY')!;
  expect(
    Object.fromEntries(Array.from(body.children).map((el) => [el.tagName, el.textContent])),
  ).toEqual(fields);
}

describe('Auto Merge service HTTP boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    const main = useMainStore();
    main.mobileServerName = 'MOBILE';
    main.deviceName = 'PDA';
  });

  it('sends GETAUTOMERGELOT through message and maps candidate fields in order', async () => {
    const item = {
      LOTNAME: 'L1',
      MAINLOTNAME: 'P1',
      PRODUCTSPECNAME: 'PRODUCT',
      PROCESSFLOWNAME: 'R1',
      PROCESSOPERATIONNAME: '1000',
      DESCRIPTION: 'DESC',
    };
    post.mockResolvedValueOnce(response({ ITEMS: { ITEM: [item] } }));
    expect(await getAutoMergeLot('FAB', ' L1 ')).toEqual([item]);
    assertEnvelope('GETAUTOMERGELOT', { FACILITY: 'FAB', LOTID: ' L1 ' });
  });
  it('maps all parent fields and merge ITEMS', async () => {
    const parent = {
      PARENTLOTNAME: 'P',
      PARENTQTY: '25',
      PARENTPRODUCTSPECNAME: 'PRODUCT',
      PARENTPROCESSFLOWNAME: 'R',
      PARENTOPERATION: '1000',
      PARENTDESCRIPTION: 'DESC',
    };
    const item = {
      LOTNAME: 'L1',
      PRODUCTQUANTITY: '25',
      PRODUCTSPECNAME: 'PRODUCT',
      PROCESSFLOWNAME: 'R',
      PROCESSOPERATIONNAME: '1000',
      OPERATIONDESCRIPTION: 'DESC',
      LOTSTATE: 'Released',
    };
    post.mockResolvedValueOnce(response({ ...parent, ITEMS: { ITEM: [item] } }));
    expect(await getAutoMergeLot2('L1', 'P', 'L1,L2')).toEqual({ ...parent, ITEMS: [item] });
    assertEnvelope('GETAUTOMERGELOT2', { LOTID: 'L1', PARENTLOTID: 'P', LOTLIST: 'L1,L2' });
  });
  it('sends exact execute fields preserving comment and maps both independent results', async () => {
    post.mockResolvedValueOnce(response({ FAILLOTNAME: 'L2', SUCCESS: 'Y' }));
    expect(await executeAutoMergeLot(request)).toEqual({ FAILLOTNAME: 'L2', SUCCESS: 'Y' });
    assertEnvelope('EXECUTEAUTOMERGE', request);
  });
  const calls = [
    () => getAutoMergeLot('FAB', 'L'),
    () => getAutoMergeLot2('L', 'P', 'L'),
    () => executeAutoMergeLot(request),
  ];
  it.each(calls)('propagates FAIL message for each API (%#)', async (call) => {
    post.mockResolvedValueOnce({
      data: { statusCode: 200, result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'server error' }) },
    });
    await expect(call()).rejects.toThrow('server error');
  });
  it.each(calls)('rejects missing MSGBODY for each API (%#)', async (call) => {
    post.mockResolvedValueOnce({
      data: { statusCode: 200, result: JSON.stringify({ STATUS: 'PASS' }) },
    });
    await expect(call()).rejects.toThrow('BODY가 존재하지 않습니다');
  });
  it.each(calls)('propagates transport failures (%#)', async (call) => {
    post.mockRejectedValueOnce(new Error('offline'));
    await expect(call()).rejects.toThrow('offline');
  });
  it('maps empty/missing candidate list without seed or placeholder', async () => {
    for (const value of [{}, { ITEMS: { ITEM: [] } }]) {
      post.mockResolvedValueOnce(response(value));
      expect(await getAutoMergeLot('FAB', 'L')).toEqual([]);
    }
  });
  it('maps missing parent fields and merge list to empty values', async () => {
    post.mockResolvedValueOnce(response());
    expect(await getAutoMergeLot2('L', 'P', 'L')).toEqual({
      PARENTLOTNAME: '',
      PARENTQTY: '',
      PARENTPRODUCTSPECNAME: '',
      PARENTPROCESSFLOWNAME: '',
      PARENTOPERATION: '',
      PARENTDESCRIPTION: '',
      ITEMS: [],
    });
  });
  it('maps empty execute body without inventing success', async () => {
    post.mockResolvedValueOnce(response());
    expect(await executeAutoMergeLot(request)).toEqual({ FAILLOTNAME: '', SUCCESS: '' });
  });
});
