import {
  RemoteMeasMainMessageError,
  xrfEqpTypeCheck,
} from 'src/features/remote-meas-main/services/remote-meas-main.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPostAifMessage } = vi.hoisted(() => ({ mockPostAifMessage: vi.fn() }));

vi.mock('src/services/aif-message.service', () => ({ postAifMessage: mockPostAifMessage }));

function reply(result: Record<string, unknown>, statusCode = 200) {
  return { statusCode, result: JSON.stringify(result) };
}

const pass = (body: unknown) => reply({ STATUS: 'PASS', MSGBODY: body });

describe('remote meas main service', () => {
  beforeEach(() => {
    mockPostAifMessage.mockReset();
  });

  it('posts XRFEQPTYPECHECK with EQPID through the XrfEqpTypeCheck route', async () => {
    mockPostAifMessage.mockResolvedValueOnce(
      pass({ ITEMS: { ITEM: [{ MODEL: 'AIT-XP', MAINEQPID: 'AIT-01', EXTRA: 'x' }] } }),
    );

    await expect(xrfEqpTypeCheck('AIT-01-A')).resolves.toEqual([
      { MODEL: 'AIT-XP', MAINEQPID: 'AIT-01' },
    ]);
    expect(mockPostAifMessage).toHaveBeenCalledWith('XrfEqpTypeCheck', 'XRFEQPTYPECHECK', [
      ['EQPID', 'AIT-01-A'],
    ]);
  });

  it('keeps every ITEM row in order and accepts a single ITEM object', async () => {
    mockPostAifMessage
      .mockResolvedValueOnce(
        pass({
          ITEMS: {
            ITEM: [
              { MODEL: 'XRF-RIGAKU', MAINEQPID: 'XRF-01' },
              { MODEL: 'AEGIS-200', MAINEQPID: 7 },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(pass({ ITEMS: { ITEM: { MODEL: 'AEGIS-200', MAINEQPID: 'A-1' } } }))
      .mockResolvedValueOnce(pass({ ITEMS: { ITEM: [] } }));

    await expect(xrfEqpTypeCheck('X')).resolves.toEqual([
      { MODEL: 'XRF-RIGAKU', MAINEQPID: 'XRF-01' },
      { MODEL: 'AEGIS-200', MAINEQPID: '7' },
    ]);
    await expect(xrfEqpTypeCheck('X')).resolves.toEqual([{ MODEL: 'AEGIS-200', MAINEQPID: 'A-1' }]);
    await expect(xrfEqpTypeCheck('X')).resolves.toEqual([]);
  });

  it('rejects a missing ITEMS list or ITEM array like org.json getJSONObject / getJSONArray', async () => {
    mockPostAifMessage
      .mockResolvedValueOnce(pass({ OTHER: 'x' }))
      .mockResolvedValueOnce(pass({ ITEMS: {} }));

    await expect(xrfEqpTypeCheck('X')).rejects.toThrow('JSONObject["ITEMS"] not found.');
    await expect(xrfEqpTypeCheck('X')).rejects.toThrow('JSONObject["ITEM"] not found.');
  });

  it('throws ERRMSG on failure and the Android message for a PASS without MSGBODY', async () => {
    mockPostAifMessage
      .mockResolvedValueOnce(reply({ STATUS: 'FAIL', ERRMSG: '장비 없음', MSGBODY: '' }))
      .mockResolvedValueOnce(reply({ STATUS: 'PASS', MSGBODY: '' }))
      .mockResolvedValueOnce(reply({ STATUS: 'PASS' }));

    await expect(xrfEqpTypeCheck('X')).rejects.toEqual(new RemoteMeasMainMessageError('장비 없음'));
    await expect(xrfEqpTypeCheck('X')).rejects.toThrow('BODY가 존재하지 않습니다');
    await expect(xrfEqpTypeCheck('X')).rejects.toThrow('BODY가 존재하지 않습니다');
  });
});
