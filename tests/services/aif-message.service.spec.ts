import { createPinia, setActivePinia } from 'pinia';
import { DeviceInfo } from 'src/constants/device-info';
import { useMainStore } from 'src/features/main/stores/main.store';
import { buildAifMessage, postAifMessage } from 'src/services/aif-message.service';
import apiClient from 'src/services/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('aif-message service', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    DeviceInfo.DEVICE_NAME = 'ANDROID_000';
  });

  it('uses active Main store header values and escapes message fields', () => {
    const mainStore = useMainStore();
    mainStore.mobileServerName = 'SERVER&01';
    mainStore.deviceName = 'PDA<01>';

    const message = buildAifMessage('EQP&STATUS', [['EQPID', 'MC<01>&"\'']]);

    expect(message).toContain('<MSGNAME>EQP&amp;STATUS</MSGNAME>');
    expect(message).toContain('<RECEIVER>SERVER&amp;01</RECEIVER>');
    expect(message).toContain('<SENDER>PDA&lt;01&gt;</SENDER>');
    expect(message).toContain('<EQPID>MC&lt;01&gt;&amp;&quot;&apos;</EQPID>');
  });

  it('inserts an XML fragment field verbatim, like the legacy nested ITEM lists', () => {
    const message = buildAifMessage('STOCKOUT', [
      ['PORT', 'OUT'],
      ['STOCKERS', { xml: '<ITEM><LOTID>LOT-1</LOTID></ITEM>' }],
    ]);

    expect(message).toContain(
      '<PORT>OUT</PORT>\n<STOCKERS><ITEM><LOTID>LOT-1</LOTID></ITEM></STOCKERS>',
    );
  });

  it('uses legacy header constants when Main store values are empty', () => {
    const mainStore = useMainStore();
    mainStore.mobileServerName = '';
    mainStore.deviceName = '';

    const message = buildAifMessage('EQPSTATUS', []);

    expect(message).toContain('<RECEIVER>L4-DEVICE</RECEIVER>');
    expect(message).toContain('<SENDER>ANDROID_000</SENDER>');
  });

  it('posts the AIF envelope to the normalized HiFOS endpoint', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: { statusCode: 200, result: '{"STATUS":"PASS","MSGBODY":{}}' },
    });

    await postAifMessage('EQPSTATUS', 'EQPSTATUS', [['EQPID', 'MC01']]);

    expect(postSpy).toHaveBeenCalledWith('/hifos/eqpstatus', {
      sMsg: expect.stringContaining('<EQPID>MC01</EQPID>'),
    });
  });
});
