import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import {
  ComPareWaferType,
  getWaferTYpe,
} from 'src/features/wafer-code-check/services/wafer-code-check.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('src/services/api-client', () => ({ default: { post } }));

function response(body: unknown = {}) {
  return {
    data: {
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }),
    },
  };
}

function assertEnvelope(name: string, fields: Record<string, string>) {
  expect(post).toHaveBeenCalledTimes(1);
  const [url, payload] = post.mock.calls[0]!;
  expect(url).toBe(`/hifos/${name === 'GETWAFERTYPE' ? 'getWaferTYpe' : 'ComPareWaferType'}`);
  const parsed = new DOMParser().parseFromString(payload.sMsg, 'application/xml');
  expect(parsed.querySelector('parsererror')).toBeNull();
  expect(parsed.querySelector('MSGNAME')?.textContent).toBe(name);
  expect(parsed.querySelector('RECEIVER')?.textContent).toBe('MOBILE');
  expect(parsed.querySelector('SENDER')?.textContent).toBe('PDA');
  expect(parsed.querySelector('MSGTYPE')?.textContent).toBe('P');
  expect(parsed.querySelector('WITHREPLY')?.textContent).toBe('YES');
  expect(
    Object.fromEntries(
      Array.from(parsed.querySelector('MSGBODY')!.children).map((element) => [
        element.tagName,
        element.textContent,
      ]),
    ),
  ).toEqual(fields);
}

describe('Wafer Code Check service HTTP boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    const mainStore = useMainStore();
    mainStore.mobileServerName = 'MOBILE';
    mainStore.deviceName = 'PDA';
  });

  it('sends GETWAFERTYPE and returns the legacy message body', async () => {
    const messageBody = { ITEMS: { ITEM: [{ LOTNAME: 'LOT-01', WAFERTYPE: 'SILICON' }] } };
    post.mockResolvedValueOnce(response(messageBody));

    await expect(getWaferTYpe('RUN-01')).resolves.toEqual({
      isSuccessFul: true,
      messageBody,
      errorMessage: '',
    });
    assertEnvelope('GETWAFERTYPE', { LOTNAME: 'RUN-01' });
  });

  it('sends COMPAREWAFERTYPE with the exact legacy fields', async () => {
    post.mockResolvedValueOnce(response({ COMPARERESULT: 'OK' }));

    await expect(
      ComPareWaferType('LOT-01', 'SILICON', 'INITIAL-01', 'A & <B>', 'OP-01'),
    ).resolves.toMatchObject({ isSuccessFul: true, messageBody: { COMPARERESULT: 'OK' } });
    assertEnvelope('COMPAREWAFERTYPE', {
      LOTNAME: 'LOT-01',
      WAFERTYPE: 'SILICON',
      INITIALBOXNAME: 'INITIAL-01',
      COMMENT: 'A & <B>',
      USERID: 'OP-01',
    });
  });

  it('maps business failures and rejects responses without a message body', async () => {
    post.mockResolvedValueOnce({
      data: {
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'RUN NAME을 찾을 수 없습니다.' }),
      },
    });
    await expect(getWaferTYpe('RUN-MISSING')).resolves.toMatchObject({
      isSuccessFul: false,
      errorMessage: 'RUN NAME을 찾을 수 없습니다.',
    });

    post.mockResolvedValueOnce({
      data: { statusCode: 200, result: JSON.stringify({ STATUS: 'PASS' }) },
    });
    await expect(getWaferTYpe('RUN-EMPTY')).resolves.toMatchObject({ isSuccessFul: false });
  });
});
