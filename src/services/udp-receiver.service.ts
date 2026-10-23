import { Capacitor } from '@capacitor/core';
import { ROUTE } from 'src/constants/routes';
import router from 'src/router';
import { HifosUdpAlarm } from 'src/services/hifos-udp-alarm.plugin';
import { ref } from 'vue';

export interface UdpReceiverPayload {
  level: string;
  message: string;
  roomName?: string;
}

let nativeListener: { remove: () => Promise<void> } | undefined;
const stepperIdleOpen = ref(false);
const stepperIdleMessage = ref('');

export function showStepperIdlePopup(message: string): void {
  stepperIdleMessage.value = message;
  stepperIdleOpen.value = true;
}

export function closeStepperIdlePopup(): void {
  stepperIdleOpen.value = false;
  stepperIdleMessage.value = '';
}

export const stepperIdlePopup = {
  open: stepperIdleOpen,
  receiverMessage: stepperIdleMessage,
  show: showStepperIdlePopup,
  close: closeStepperIdlePopup,
};

const recipeInterlockOpen = ref(false);
const recipeInterlockMessage = ref('');

export function showRecipeInterlockPopup(message: string): void {
  recipeInterlockMessage.value = message;
  recipeInterlockOpen.value = true;
}

export function closeRecipeInterlockPopup(): void {
  recipeInterlockOpen.value = false;
  recipeInterlockMessage.value = '';
}

export const recipeInterlockPopup = {
  open: recipeInterlockOpen,
  receiverMessage: recipeInterlockMessage,
  show: showRecipeInterlockPopup,
  close: closeRecipeInterlockPopup,
};

/**
 * Dispatches UDP messages using the legacy UDPReceiver event markers.
 */
export async function handleUdpMessage(
  payload: UdpReceiverPayload,
  navRouter = router,
): Promise<void> {
  const { level, message } = payload;
  if (!message || level !== 'HIGH') return;

  // Stepper IDLE: <EVENT_TYPE>STEPPERIDLE</EVENT_TYPE> (matches legacy UDPReceiver)
  if (message.includes('<EVENT_TYPE>STEPPERIDLE</EVENT_TYPE>')) {
    showStepperIdlePopup(message);
    return;
  }

  // Recipe Interlock: <EVENT_TYPE>RECIPE</EVENT_TYPE>
  if (message.includes('<EVENT_TYPE>RECIPE</EVENT_TYPE>')) {
    showRecipeInterlockPopup(message);
    return;
  }

  // 2. EMax Vent: <EVENT_TYPE>FDC</EVENT_TYPE> with ETCH_EMAX_LL_FDC and LOT_END
  if (
    message.includes('<EVENT_TYPE>FDC</EVENT_TYPE>') &&
    message.includes('<FDC_PROCESS_TYPE>ETCH_EMAX_LL_FDC</FDC_PROCESS_TYPE>') &&
    message.includes('<PARAMETER>LOT_END</PARAMETER>')
  ) {
    await navRouter.push({
      path: `/${ROUTE.emax}`,
      query: { receiverMessage: message },
    });
  }
}

export const UDP_MESSAGE_EVENT = 'udp-message';

function handleCustomEvent(event: Event): void {
  const customEvent = event as CustomEvent<UdpReceiverPayload>;
  if (customEvent.detail) {
    void handleUdpMessage(customEvent.detail);
  }
}

/**
 * Helper to mock a Stepper IDLE UDP event during development, manual testing, or E2E.
 */
export function mockStepperIdle(customXml?: string): void {
  const defaultXml = `<diffgr:diffgram xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" xmlns:diffgr="urn:schemas-microsoft-com:xml-diffgram-v1">
  <DocumentElement xmlns="">
    <INTERLOCKMANAGER>
      <Table diffgr:id="Table1" msdata:rowOrder="0">
        <PREAMBLE>X</PREAMBLE>
        <TIME>2026-10-21T09:15:30.000+09:00</TIME>
        <COL1>IDLE</COL1>
        <MACHINE>STEPPER-EQP-01</MACHINE>
        <COL3></COL3>
        <COL4></COL4>
        <LOTID>LOT-DEMO-IDLE-01</LOTID>
        <COL6></COL6>
        <COL7></COL7>
        <COL8></COL8>
        <WAFER>12</WAFER>
      </Table>
    </INTERLOCKMANAGER>
  </DocumentElement>
  <EVENT_TYPE>STEPPERIDLE</EVENT_TYPE>
</diffgr:diffgram>`;

  const message = customXml || defaultXml;
  void handleUdpMessage({ level: 'HIGH', message });
}

/**
 * Helper to mock a recipe interlock UDP event during development, manual testing, or E2E.
 */
export function mockRecipeInterlock(customXml?: string): void {
  const defaultXml = `<diffgr:diffgram xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" xmlns:diffgr="urn:schemas-microsoft-com:xml-diffgram-v1">
  <DocumentElement xmlns="">
    <INTERLOCKMANAGER>
      <Table diffgr:id="Table1" msdata:rowOrder="0">
        <TIME>2026-06-01T21:37:02.000+09:00</TIME>
        <COL1></COL1><COL2></COL2><COL3></COL3>
        <MACHINE>EQP-TEST01</MACHINE>
        <LOTID>LOT-20260601</LOTID>
        <REMOTERECIPE>RCP_REMOTE_001</REMOTERECIPE>
        <PROCESSRECIPE>RCP_PROCESS_999</PROCESSRECIPE>
      </Table>
    </INTERLOCKMANAGER>
  </DocumentElement>
  <EVENT_TYPE>RECIPE</EVENT_TYPE>
</diffgr:diffgram>`;

  const message = customXml || defaultXml;
  void handleUdpMessage({ level: 'HIGH', message });
}

/**
 * Starts listening to native UDP messages via HifosUdpAlarm plugin and browser window events.
 */
export async function startUdpReceiver(): Promise<void> {
  if (typeof window !== 'undefined') {
    window.addEventListener(UDP_MESSAGE_EVENT, handleCustomEvent);
    (
      window as unknown as {
        mockStepperIdle?: typeof mockStepperIdle;
      }
    ).mockStepperIdle = mockStepperIdle;
    (
      window as unknown as {
        mockRecipeInterlock?: typeof mockRecipeInterlock;
      }
    ).mockRecipeInterlock = mockRecipeInterlock;
  }

  if (!Capacitor.isNativePlatform() || nativeListener) return;

  nativeListener = await HifosUdpAlarm.addListener('udpMessage', (payload) => {
    void handleUdpMessage(payload);
  });
  await HifosUdpAlarm.startListening();
}

/**
 * Stops listening to native UDP messages.
 */
export async function stopUdpReceiver(): Promise<void> {
  if (typeof window !== 'undefined') {
    window.removeEventListener(UDP_MESSAGE_EVENT, handleCustomEvent);
  }
  await nativeListener?.remove();
  nativeListener = undefined;
}
