import { createPinia, setActivePinia } from 'pinia';
import { useRecipeInterlock } from 'src/features/recipe-interlock/composables/useRecipeInterlock';
import * as recipeInterlockService from 'src/features/recipe-interlock/services/recipe-interlock.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const receiverMessage = ref('');
const closeDialog = vi.fn();

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

describe('useRecipeInterlock composable', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    receiverMessage.value = '';
  });

  function createComposable() {
    return useRecipeInterlock(() => receiverMessage.value, closeDialog);
  }

  it('populates fields from the dialog receiver message', () => {
    receiverMessage.value = sampleXml;
    const composable = createComposable();

    expect(composable.txtReceiverMACHINEValue.value).toBe('EQP-TEST01');
    expect(composable.txtReceiverLOTIDValue.value).toBe('LOT-20260601');
    expect(composable.txtReceiverRemoteRecipeValue.value).toBe('RCP_REMOTE_001');
    expect(composable.txtReceiverProcessRecipeValue.value).toBe('RCP_PROCESS_999');
    expect(composable.txtReceiverTIMEValue.value).toBe('2026-06-01 21:37:02.000');
    expect(composable.isRecipeMismatch.value).toBe(true);
  });

  it('identifies when recipe matches (isRecipeMismatch is false)', () => {
    receiverMessage.value = sampleXml.replace('RCP_PROCESS_999', 'RCP_REMOTE_001');
    const composable = createComposable();

    expect(composable.isRecipeMismatch.value).toBe(false);
  });

  it('updates parsed fields when the receiver message changes', async () => {
    const composable = createComposable();
    receiverMessage.value = sampleXml;
    await composable.receiverMessage.value;

    expect(composable.txtReceiverMACHINEValue.value).toBe('EQP-TEST01');
  });

  it('setData sends intlk popup check and calls finish', async () => {
    const sendSpy = vi.spyOn(recipeInterlockService, 'sendIntlkPopupCheck').mockResolvedValueOnce({
      isSuccess: true,
    });

    receiverMessage.value = sampleXml;
    const composable = createComposable();

    await composable.setData();

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        eqpId: 'EQP-TEST01',
        recipe: 'RCP_REMOTE_001',
      }),
    );
    expect(closeDialog).toHaveBeenCalledOnce();
  });

  it('handles setData failure and error message', async () => {
    vi.spyOn(recipeInterlockService, 'sendIntlkPopupCheck').mockResolvedValueOnce({
      isSuccess: false,
      message: 'Server interlock error',
    });

    receiverMessage.value = sampleXml;
    const composable = createComposable();

    await composable.setData();
    expect(closeDialog).toHaveBeenCalledOnce();
  });

  it('handles setData exception safely', async () => {
    vi.spyOn(recipeInterlockService, 'sendIntlkPopupCheck').mockRejectedValueOnce(
      new Error('Crash error'),
    );

    receiverMessage.value = sampleXml;
    const composable = createComposable();

    await composable.setData();
    expect(closeDialog).toHaveBeenCalledOnce();
  });

  it('prevents multiple simultaneous setData executions when loading', async () => {
    let resolvePromise: (val: { isSuccess: boolean }) => void;
    const pendingPromise = new Promise<{ isSuccess: boolean }>((resolve) => {
      resolvePromise = resolve;
    });

    vi.spyOn(recipeInterlockService, 'sendIntlkPopupCheck').mockReturnValueOnce(pendingPromise);

    receiverMessage.value = sampleXml;
    const composable = createComposable();

    const call1 = composable.setData();
    const call2 = composable.setData();

    resolvePromise!({ isSuccess: true });
    await Promise.all([call1, call2]);

    expect(recipeInterlockService.sendIntlkPopupCheck).toHaveBeenCalledTimes(1);
    expect(closeDialog).toHaveBeenCalledOnce();
  });

  it('finish asks the dialog owner to close the popup', async () => {
    const composable = createComposable();
    await composable.finish();
    await composable.finish();
    expect(closeDialog).toHaveBeenCalledOnce();
  });
});
