import { createPinia, setActivePinia } from 'pinia';
import { usePREmpty } from 'src/features/prempty/composables/usePrempty';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const closeDialog = vi.fn();
const receiverMessage = ref('');

vi.mock('src/constants/deviceinfo', () => ({
  DeviceInfo: {
    DEVICE_NAME: 'MOCK_PDA_DEV',
    OPERATOR_ID: 'MOCK_OPERATOR',
  },
}));

const { mockSendIntlkPopupCheck } = vi.hoisted(() => ({
  mockSendIntlkPopupCheck: vi.fn(),
}));

vi.mock('src/features/prempty/services/prempty-interlock.service', () => ({
  sendIntlkPopupCheck: mockSendIntlkPopupCheck,
}));

const sampleXml = `<diffgr:diffgram xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" xmlns:diffgr="urn:schemas-microsoft-com:xml-diffgram-v1">
  <DocumentElement xmlns="">
    <INTERLOCKMANAGER>
      <Table diffgr:id="Table1" msdata:rowOrder="0">
        <TIME>2026-10-26T09:15:30.000+09:00</TIME>
        <COL1>val1</COL1>
        <ALARMLEVEL>2</ALARMLEVEL>
        <EQPID>EQP-PUMP-01</EQPID>
        <MODEL>MODEL-A</MODEL>
        <FACILITY>FAC-01</FACILITY>
        <COL2>val2</COL2>
        <COL3>val3</COL3>
        <PUMPID>PUMP-001</PUMPID>
        <PUMPNAME>MAIN PUMP</PUMPNAME>
        <DESC>[PR_EMPTY_ALARM] Pump ready empty detected</DESC>
      </Table>
    </INTERLOCKMANAGER>
  </DocumentElement>
</diffgr:diffgram>`;

describe('usePREmpty composable', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    receiverMessage.value = '';
    mockSendIntlkPopupCheck.mockResolvedValue({ isSuccess: true });
  });

  function createComposable() {
    return usePREmpty(() => receiverMessage.value, closeDialog);
  }

  describe('parseReceiverMessage', () => {
    it('populates all fields from a valid INTERLOCKMANAGER XML', () => {
      receiverMessage.value = sampleXml;
      const composable = createComposable();

      expect(composable.txtPREMPTYTimeResult.value).toBe('2026-10-26 09:15:30.000');
      expect(composable.txtPREMPTYLevelResult.value).toBe('2');
      expect(composable.txtPREMPTYMcahineResult.value).toBe('EQP-PUMP-01');
      expect(composable.txtPREMPTYModelResult.value).toBe('MODEL-A');
      expect(composable.txtPREMPTYFacilityResult.value).toBe('FAC-01');
      expect(composable.txtPREMPTYPumpidResult.value).toBe('PUMP-001');
      expect(composable.txtPREMPTYPumpnameResult.value).toBe('MAIN PUMP');
      expect(composable.txtPREMPTYDescResult.value).toBe('PR_EMPTY_ALARM');
    });

    it('strips timezone offset when time contains +', () => {
      receiverMessage.value = sampleXml;
      const composable = createComposable();

      expect(composable.txtPREMPTYTimeResult.value).not.toContain('+');
    });

    it('parses time correctly when raw time has no + timezone offset', () => {
      receiverMessage.value = sampleXml.replace('+09:00', '');
      const composable = createComposable();

      expect(composable.txtPREMPTYTimeResult.value).toBe('2026-10-26 09:15:30.000');
    });

    it('ignores message when INTERLOCKMANAGER is not present', () => {
      receiverMessage.value = 'SOME_OTHER_MESSAGE';
      const composable = createComposable();

      expect(composable.txtPREMPTYTimeResult.value).toBe('');
      expect(composable.txtPREMPTYMcahineResult.value).toBe('');
    });

    it('does nothing when receiverMessage is empty', () => {
      receiverMessage.value = '';
      const composable = createComposable();

      expect(composable.txtPREMPTYTimeResult.value).toBe('');
    });

    it('ignores DESC when there are no square brackets', () => {
      receiverMessage.value = sampleXml.replace(
        '[PR_EMPTY_ALARM] Pump ready empty detected',
        'PR_EMPTY_ALARM Pump ready empty detected',
      );
      const composable = createComposable();

      expect(composable.txtPREMPTYDescResult.value).toBe('');
    });

    it('appends values from multiple Table entries', () => {
      receiverMessage.value = sampleXml.replace(
        '</INTERLOCKMANAGER>',
        `<Table diffgr:id="Table1" msdata:rowOrder="1">
        <TIME>2026-10-26T09:16:00.000+09:00</TIME>
        <COL1>val1</COL1>
        <ALARMLEVEL>3</ALARMLEVEL>
        <EQPID>EQP-PUMP-02</EQPID>
        <MODEL>MODEL-B</MODEL>
        <FACILITY>FAC-02</FACILITY>
        <COL2>val2</COL2>
        <COL3>val3</COL3>
        <PUMPID>PUMP-002</PUMPID>
        <PUMPNAME>SUB PUMP</PUMPNAME>
        <DESC>[PR_EMPTY_WARN] Secondary pump warning</DESC>
      </Table>
    </INTERLOCKMANAGER>`,
      );
      const composable = createComposable();

      expect(composable.txtPREMPTYMcahineResult.value).toBe('EQP-PUMP-01EQP-PUMP-02');
      expect(composable.txtPREMPTYDescResult.value).toBe('PR_EMPTY_ALARMPR_EMPTY_WARN');
    });

    it('updates parsed fields when the receiver message changes', async () => {
      const composable = createComposable();
      receiverMessage.value = sampleXml;
      await composable.receiverMessage.value;

      expect(composable.txtPREMPTYMcahineResult.value).toBe('EQP-PUMP-01');
    });
  });

  describe('finish', () => {
    it('calls onFinish', () => {
      const composable = createComposable();
      composable.finish();
      expect(closeDialog).toHaveBeenCalledTimes(1);
    });
  });

  describe('setData', () => {
    it('formats masterTime and sends INTLKPOPUPCHECK, then calls finish', async () => {
      receiverMessage.value = sampleXml;
      const composable = createComposable();

      await composable.setData();

      expect(mockSendIntlkPopupCheck).toHaveBeenCalledWith({
        masterTime: '2026/10/26_09:15:30',
        deviceName: expect.any(String),
        users: expect.any(String),
        currentTime: expect.stringMatching(/^\d{4}\/\d{2}\/\d{2}_\d{2}:\d{2}:\d{2}$/),
        eqpId: 'EQP-PUMP-01',
      });
      expect(closeDialog).toHaveBeenCalledTimes(1);
      expect(composable.loading.value).toBe(false);
    });

    it('falls back to raw time string when masterTime cannot be parsed', async () => {
      const composable = createComposable();
      composable.txtPREMPTYTimeResult.value = 'INVALID_TIME';
      composable.txtPREMPTYMcahineResult.value = 'EQP-PUMP-01';

      await composable.setData();

      expect(mockSendIntlkPopupCheck).toHaveBeenCalledWith(
        expect.objectContaining({ masterTime: 'INVALID_TIME' }),
      );
    });

    it('still calls finish even when sendIntlkPopupCheck fails', async () => {
      mockSendIntlkPopupCheck.mockResolvedValueOnce({ isSuccess: false, message: 'Server error' });
      receiverMessage.value = sampleXml;
      const composable = createComposable();

      await composable.setData();

      expect(closeDialog).toHaveBeenCalledTimes(1);
    });

    it('does not call sendIntlkPopupCheck when loading is already true', async () => {
      const composable = createComposable();
      composable.loading.value = true;

      await composable.setData();

      expect(mockSendIntlkPopupCheck).not.toHaveBeenCalled();
      expect(closeDialog).not.toHaveBeenCalled();
    });

    it('resets loading to false after completion', async () => {
      receiverMessage.value = sampleXml;
      const composable = createComposable();

      await composable.setData();

      expect(composable.loading.value).toBe(false);
    });
  });
});
