import { createPinia, setActivePinia } from 'pinia';
import { GetCabinetInfo, SetGasusage } from 'src/features/gas/services/gas.service';
import { useMainStore } from 'src/features/main/stores/main.store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('src/services/api-client', () => ({ default: { post } }));

function response(body: unknown = {}) {
  return {
    data: { statusCode: 200, result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }) },
  };
}

function assertEnvelope(url: string, name: string, fields: Record<string, string>) {
  expect(post).toHaveBeenCalledTimes(1);
  const [calledUrl, payload] = post.mock.calls[0]!;
  expect(calledUrl).toBe(url);
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

const okResult = { isSuccessFul: true, messageBody: {}, errorMessage: '' };

describe('Gas service HTTP boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    const mainStore = useMainStore();
    mainStore.mobileServerName = 'MOBILE';
    mainStore.deviceName = 'PDA';
  });

  it('sends GETCABINETINFO to /hifos/getcabinetinfo and returns the body', async () => {
    const body = { ITEMS: { ITEM: [{ CABINET: 'C1', GAS: 'N2', TYPE: 'Y' }] }, PRESSURE: '1' };
    post.mockResolvedValueOnce(response(body));

    await expect(GetCabinetInfo('C1')).resolves.toEqual({
      isSuccessFul: true,
      messageBody: body,
      errorMessage: '',
    });
    assertEnvelope('/hifos/getcabinetinfo', 'GETCABINETINFO', { CABINETNAME: 'C1' });
  });

  it('sends SETGASUSAGE with the exact legacy fields, escaping XML and keeping empty WEIGHT', async () => {
    post.mockResolvedValueOnce(response({ OK: 'Y' }));

    await expect(SetGasusage('C1', 'OP-1', '3.5', '', 'A & <B>')).resolves.toMatchObject({
      isSuccessFul: true,
    });
    assertEnvelope('/hifos/setgasusage', 'SETGASUSAGE', {
      CABINETNAME: 'C1',
      USERID: 'OP-1',
      PRESSURE: '3.5',
      WEIGHT: '',
      COMMENT: 'A & <B>',
    });
  });

  it('treats FAIL, empty MSGBODY and unparsable results as unsuccessful', async () => {
    post.mockResolvedValueOnce({
      data: { statusCode: 200, result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'nope' }) },
    });
    await expect(GetCabinetInfo('X')).resolves.toMatchObject({
      isSuccessFul: false,
      errorMessage: 'nope',
    });

    post.mockResolvedValueOnce({
      data: { statusCode: 200, result: JSON.stringify({ STATUS: 'PASS', MSGBODY: '' }) },
    });
    await expect(SetGasusage('C', 'U', '1', '', '')).resolves.toMatchObject({
      isSuccessFul: false,
    });

    post.mockResolvedValueOnce({ data: { statusCode: 200, result: 'not json' } });
    await expect(GetCabinetInfo('C')).resolves.toEqual({
      isSuccessFul: false,
      messageBody: {},
      errorMessage: 'not json',
    });
  });

  it('accepts a PASS whose MSGBODY is not an object with an empty body map', async () => {
    post.mockResolvedValueOnce(response('text'));
    await expect(GetCabinetInfo('C')).resolves.toEqual(okResult);
  });
});
