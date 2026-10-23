import {
  formatCurrentTime,
  formatMasterTime,
  parseRecipeInterlockMessage,
  sendIntlkPopupCheck,
} from 'src/features/recipe-interlock/services/recipe-interlock.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPostAifMessage } = vi.hoisted(() => ({
  mockPostAifMessage: vi.fn(),
}));

vi.mock('src/services/aif-message.service', () => ({
  postAifMessage: mockPostAifMessage,
}));

const sampleXml = `<diffgr:diffgram xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" xmlns:diffgr="urn:schemas-microsoft-com:xml-diffgram-v1">
  <DocumentElement xmlns="">
    <INTERLOCKMANAGER>
      <Table diffgr:id="Table1" msdata:rowOrder="0">
        <TIME>2026-06-01T21:37:02.000+09:00</TIME>
        <COL1>val1</COL1>
        <COL2>val2</COL2>
        <COL3>val3</COL3>
        <MACHINE>EQP-TEST01</MACHINE>
        <LOTID>LOT-20260601</LOTID>
        <REMOTERECIPE>RCP_REMOTE_001</REMOTERECIPE>
        <PROCESSRECIPE>RCP_PROCESS_999</PROCESSRECIPE>
      </Table>
    </INTERLOCKMANAGER>
  </DocumentElement>
</diffgr:diffgram>`;

describe('recipe-interlock service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseRecipeInterlockMessage', () => {
    it('returns empty fields when receiverMessage is empty or does not contain INTERLOCKMANAGER', () => {
      expect(parseRecipeInterlockMessage('')).toEqual({
        machine: '',
        lotid: '',
        rRecipe: '',
        pRecipe: '',
        time: '',
      });
      expect(parseRecipeInterlockMessage('RANDOM MESSAGE')).toEqual({
        machine: '',
        lotid: '',
        rRecipe: '',
        pRecipe: '',
        time: '',
      });
    });

    it('parses machine, lotid, recipes, and formatted time from valid XML', () => {
      const result = parseRecipeInterlockMessage(sampleXml);
      expect(result.machine).toBe('EQP-TEST01');
      expect(result.lotid).toBe('LOT-20260601');
      expect(result.rRecipe).toBe('RCP_REMOTE_001');
      expect(result.pRecipe).toBe('RCP_PROCESS_999');
      expect(result.time).toBe('2026-06-01 21:37:02.000');
    });

    it('parses time correctly when raw time does not contain + timezone offset', () => {
      const noPlusXml = sampleXml.replace('+09:00', '');
      const result = parseRecipeInterlockMessage(noPlusXml);
      expect(result.time).toBe('2026-06-01 21:37:02.000');
    });
  });

  describe('formatMasterTime', () => {
    it('formats yyyy-MM-dd HH:mm:ss.SSS into yyyy/MM/dd_HH:mm:ss', () => {
      const formatted = formatMasterTime('2026-06-01 21:37:02.000');
      expect(formatted).toBe('2026/06/01_21:37:02');
    });

    it('formats yyyy-MM-dd HH:mm:ss without milliseconds', () => {
      const formatted = formatMasterTime('2026-06-01 21:37:02');
      expect(formatted).toBe('2026/06/01_21:37:02');
    });

    it('returns original input when parsing fails or input is not a string', () => {
      expect(formatMasterTime('invalid-date')).toBe('invalid-date');
      // @ts-expect-error test non-string
      expect(formatMasterTime(null)).toBe(null);
    });
  });

  describe('formatCurrentTime', () => {
    it('formats a date to yyyy/MM/dd_HH:mm:ss', () => {
      const fixedDate = new Date(2026, 9, 20, 14, 30, 45);
      expect(formatCurrentTime(fixedDate)).toBe('2026/10/20_14:30:45');
    });
  });

  describe('sendIntlkPopupCheck', () => {
    it('sends correct fields to SetGasusage with INTLKPOPUPCHECK and returns success', async () => {
      mockPostAifMessage.mockResolvedValueOnce({
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'PASS', RESULT: 'OK' }),
      });

      const response = await sendIntlkPopupCheck({
        masterTime: '2026/06/01_21:37:02',
        deviceName: 'PDA001',
        users: 'OPERATOR_01',
        currentTime: '2026/10/20_14:30:45',
        eqpId: 'EQP-TEST01',
        recipe: 'RCP_REMOTE_001',
        lotId: 'NULL',
        slot: 'NULL',
      });

      expect(mockPostAifMessage).toHaveBeenCalledWith(
        'SetGasusage',
        'INTLKPOPUPCHECK',
        expect.arrayContaining([
          ['MASTERTIMESTAMP', '2026/06/01_21:37:02'],
          ['EVENT_TYPE', 'RECIPE'],
          ['NOTICE_TYPE', 'POP-UP'],
          ['IP', 'PDA001'],
          ['CLIENT_TYPE', 'PDA'],
          ['HOSTNAME', 'PDA001'],
          ['TARGET_URL', '"NULL"'],
          ['USER_CONFIRM', 'Y'],
          ['USER_CONFIRM_ID', 'OPERATOR_01'],
          ['USER_CONFIRM_TIME', '2026/10/20_14:30:45'],
          ['EQPID', 'EQP-TEST01'],
          ['RECIPE', 'RCP_REMOTE_001'],
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

      const response = await sendIntlkPopupCheck({
        masterTime: '2026/06/01_21:37:02',
        deviceName: 'PDA001',
        users: 'OPERATOR_01',
        currentTime: '2026/10/20_14:30:45',
        eqpId: 'EQP-TEST01',
        recipe: 'RCP_REMOTE_001',
      });

      expect(response.isSuccess).toBe(true);
    });

    it('returns failure when backend returns non-200 status code', async () => {
      mockPostAifMessage.mockResolvedValueOnce({
        statusCode: 500,
        result: 'Internal Server Error',
      });

      const response = await sendIntlkPopupCheck({
        masterTime: '2026/06/01_21:37:02',
        deviceName: 'PDA001',
        users: 'OPERATOR_01',
        currentTime: '2026/10/20_14:30:45',
        eqpId: 'EQP-TEST01',
        recipe: 'RCP_REMOTE_001',
      });

      expect(response.isSuccess).toBe(false);
      expect(response.message).toBe('Internal Server Error');
    });

    it('returns failure when response result JSON contains STATUS: FAIL', async () => {
      mockPostAifMessage.mockResolvedValueOnce({
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'Failed on server' }),
      });

      const response = await sendIntlkPopupCheck({
        masterTime: '2026/06/01_21:37:02',
        deviceName: 'PDA001',
        users: 'OPERATOR_01',
        currentTime: '2026/10/20_14:30:45',
        eqpId: 'EQP-TEST01',
        recipe: 'RCP_REMOTE_001',
      });

      expect(response.isSuccess).toBe(false);
      expect(response.message).toBe('Failed on server');
    });

    it('catches transport exceptions and returns isSuccess: false', async () => {
      mockPostAifMessage.mockRejectedValueOnce(new Error('Network disconnected'));

      const response = await sendIntlkPopupCheck({
        masterTime: '2026/06/01_21:37:02',
        deviceName: 'PDA001',
        users: 'OPERATOR_01',
        currentTime: '2026/10/20_14:30:45',
        eqpId: 'EQP-TEST01',
        recipe: 'RCP_REMOTE_001',
      });

      expect(response.isSuccess).toBe(false);
      expect(response.message).toBe('Network disconnected');
    });
  });
});
