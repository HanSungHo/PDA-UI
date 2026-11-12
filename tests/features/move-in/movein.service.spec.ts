import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import * as service from 'src/features/move-in/services/movein.service';
import apiClient from 'src/services/api-client';
import responseParser from 'src/services/response-parser';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/api-client', () => ({
  default: { post: vi.fn() },
}));

const wire = (body: unknown) => ({
  data: { statusCode: 200, result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }) },
});
const wireFail = (message: string) => ({
  data: {
    statusCode: 200,
    result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: message, MSGBODY: '' }),
  },
});

describe('move-in service (mock server API)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const mainStore = useMainStore();
    mainStore.deviceName = 'WEB_BROWSER';
    mainStore.mobileServerName = 'L4-DEVICE';
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.post).mockResolvedValue(wire({}));
  });

  it.each([
    ['sendLotInfo', ['L1', 'F1', 'MVIN', 'OP1'], 'lotinfo', 'LOTINFO'],
    [
      'sendMoveIn',
      ['L1', 'F1', 'R1', 'EQ1', 'OP', 'SUB', 'N', 'OP1', 'N', '', '', '10', 'note', 'N'],
      'movein',
      'MOVEIN',
    ],
    ['sendMcfdcEqpInfo', ['EQ1'], 'mcfdceqpinfo', 'MCFDCEQPINFO'],
    ['sendEqpInfo', ['EQ1', 'MOVEIN', 'L1'], 'eqpinfo', 'EQPINFO'],
    ['sendLoginUserCheck', ['OP1', 'EQ1', 'Y'], 'loginusercheck', 'LOGINUSERCHECK'],
    ['sendLotInfoEnd', ['L1', 'F1', 'EQ1', 'MOVEINEND', 'S'], 'lotinfoend', 'LOTINFOEND'],
    ['sendCheckDiCycle', ['L1', 'F1', 'OP', 'SUB'], 'checkdicycle', 'CHECKDICYCLE'],
    ['sendSlotInfo', ['L1', 'F1'], 'slotinfo', 'SLOTINFO'],
    ['sendProbeCardInfo', ['PC1', 'EQ1'], 'probecardinfo', 'PROBECARDINFO'],
    ['sendProbeCardValue', ['PC1', 'P1', 'EQ1'], 'probecardvalue', 'PROBECARDVALUE'],
  ] as const)(
    'posts the legacy AIFMSG for %s to /hifos/%s',
    async (methodName, args, route, msg) => {
      const call = service[methodName] as (...values: readonly unknown[]) => Promise<unknown>;
      const result = await call(...args);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/hifos/${route}`,
        expect.objectContaining({ sMsg: expect.stringContaining(`<MSGNAME>${msg}</MSGNAME>`) }),
      );
      expect(result).toMatchObject({ isSuccessFul: true });
    },
  );

  it('converts a PASS body into the AIFMSG string the composable parses', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(wire({ WAFERLIST: 'L1.01,L1.02', QUANTITY: 2 }));

    const result = await service.sendSlotInfo('L1', 'F1');

    expect(result.isSuccessFul).toBe(true);
    expect(responseParser.parseResponseData(result).messageBody).toEqual({
      WAFERLIST: 'L1.01,L1.02',
      QUANTITY: '2',
    });
  });

  it('converts a FAIL reply into isSuccessFul=false with the server ERRMSG', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(wireFail('장비 정보를 찾을 수 없습니다.'));

    const result = await service.sendMcfdcEqpInfo('EQ-NOTFOUND');

    expect(result.isSuccessFul).toBe(false);
    expect(responseParser.getErrorMessage(result)).toBe('장비 정보를 찾을 수 없습니다.');
  });

  it('escapes XML special characters in body values', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(wire({ PROBECARDMSG: 'a<b>&c' }));

    const result = await service.sendProbeCardInfo('PC1', 'EQ1');

    expect(result.result).toContain('<PROBECARDMSG>a&lt;b&gt;&amp;c</PROBECARDMSG>');
  });
});
