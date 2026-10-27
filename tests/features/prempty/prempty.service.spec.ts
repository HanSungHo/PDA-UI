import { sendIntlkPopupCheck } from 'src/features/prempty/services/prempty-interlock.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPostAifMessage } = vi.hoisted(() => ({
  mockPostAifMessage: vi.fn(),
}));

vi.mock('src/services/aif-message.service', () => ({
  postAifMessage: mockPostAifMessage,
}));

const baseParams = {
  masterTime: '2026/10/26_09:15:30',
  deviceName: 'PDA001',
  users: 'OPERATOR_01',
  currentTime: '2026/10/26_09:20:00',
  eqpId: 'EQP-PUMP-01',
};

describe('prempty service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendIntlkPopupCheck', () => {
    it('sends correct fields to SetGasusage with INTLKPOPUPCHECK and returns success', async () => {
      mockPostAifMessage.mockResolvedValueOnce({
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'PASS', RESULT: 'OK' }),
      });

      const response = await sendIntlkPopupCheck(baseParams);

      expect(mockPostAifMessage).toHaveBeenCalledWith(
        'SetGasusage',
        'INTLKPOPUPCHECK',
        expect.arrayContaining([
          ['MASTERTIMESTAMP', '2026/10/26_09:15:30'],
          ['EVENT_TYPE', 'PR_EMPTY'],
          ['NOTICE_TYPE', 'POP-UP'],
          ['IP', 'PDA001'],
          ['CLIENT_TYPE', 'PDA'],
          ['HOSTNAME', 'PDA001'],
          ['TARGET_URL', '"NULL"'],
          ['USER_CONFIRM', 'Y'],
          ['USER_CONFIRM_ID', 'OPERATOR_01'],
          ['USER_CONFIRM_TIME', '2026/10/26_09:20:00'],
          ['EQPID', 'EQP-PUMP-01'],
          ['RECIPE', 'NULL'],
          ['LOTID', 'NULL'],
          ['SLOT', 'NULL'],
        ]),
      );
      expect(response.isSuccess).toBe(true);
    });

    it('returns success even if backend result is not valid JSON string', async () => {
      mockPostAifMessage.mockResolvedValueOnce({
        statusCode: 200,
        result: 'PLAIN_OK',
      });

      const response = await sendIntlkPopupCheck(baseParams);

      expect(response.isSuccess).toBe(true);
    });

    it('returns failure when backend returns non-200 status code', async () => {
      mockPostAifMessage.mockResolvedValueOnce({
        statusCode: 500,
        result: 'Internal Server Error',
      });

      const response = await sendIntlkPopupCheck(baseParams);

      expect(response.isSuccess).toBe(false);
      expect(response.message).toBe('Internal Server Error');
    });

    it('returns failure when response result JSON contains STATUS: FAIL', async () => {
      mockPostAifMessage.mockResolvedValueOnce({
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'PR_EMPTY interlock check failed' }),
      });

      const response = await sendIntlkPopupCheck(baseParams);

      expect(response.isSuccess).toBe(false);
      expect(response.message).toBe('PR_EMPTY interlock check failed');
    });

    it('catches transport exceptions and returns isSuccess: false', async () => {
      mockPostAifMessage.mockRejectedValueOnce(new Error('Network disconnected'));

      const response = await sendIntlkPopupCheck(baseParams);

      expect(response.isSuccess).toBe(false);
      expect(response.message).toBe('Network disconnected');
    });

    it('catches non-Error transport exceptions and returns isSuccess: false', async () => {
      mockPostAifMessage.mockRejectedValueOnce('timeout');

      const response = await sendIntlkPopupCheck(baseParams);

      expect(response.isSuccess).toBe(false);
      expect(response.message).toBe('timeout');
    });
  });
});
