import {
  closeRecipeInterlockPopup,
  closeStepperIdlePopup,
  handleUdpMessage,
  mockRecipeInterlock,
  mockStepperIdle,
  recipeInterlockPopup,
  startUdpReceiver,
  stepperIdlePopup,
  stopUdpReceiver,
  type UdpReceiverPayload,
} from 'src/services/udp-receiver.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Router } from 'vue-router';

const { mockAddListener, mockStartListening, mockIsNativePlatform, mockPush } = vi.hoisted(() => ({
  mockAddListener: vi.fn(),
  mockStartListening: vi.fn(),
  mockIsNativePlatform: vi.fn(() => false),
  mockPush: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: mockIsNativePlatform,
  },
  registerPlugin: () => ({
    addListener: mockAddListener,
    startListening: mockStartListening,
  }),
}));

vi.mock('src/router', () => ({
  default: {
    push: mockPush,
  },
}));

const mockRouter = {
  push: mockPush,
} as unknown as Router;

describe('udp-receiver service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    closeRecipeInterlockPopup();
    closeStepperIdlePopup();
  });

  describe('handleUdpMessage', () => {
    it('ignores message if level is not HIGH', async () => {
      const payload: UdpReceiverPayload = {
        level: 'LOW',
        message: '<EVENT_TYPE>RECIPE</EVENT_TYPE>',
      };

      await handleUdpMessage(payload, mockRouter);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('ignores empty message', async () => {
      const payload: UdpReceiverPayload = {
        level: 'HIGH',
        message: '',
      };

      await handleUdpMessage(payload, mockRouter);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('opens and clears the popup for a Stepper IDLE message', async () => {
      const xml = '<EVENT_TYPE>STEPPERIDLE</EVENT_TYPE><INTERLOCKMANAGER />';

      await handleUdpMessage({ level: 'HIGH', message: xml }, mockRouter);

      expect(stepperIdlePopup.open.value).toBe(true);
      expect(stepperIdlePopup.receiverMessage.value).toBe(xml);

      closeStepperIdlePopup();

      expect(stepperIdlePopup.open.value).toBe(false);
      expect(stepperIdlePopup.receiverMessage.value).toBe('');
    });

    it('opens the Recipe Interlock dialog when message contains <EVENT_TYPE>RECIPE</EVENT_TYPE>', async () => {
      const xml = '<EVENT_TYPE>RECIPE</EVENT_TYPE><MACHINE>EQP01</MACHINE>';
      const payload: UdpReceiverPayload = {
        level: 'HIGH',
        message: xml,
      };

      await handleUdpMessage(payload, mockRouter);

      expect(recipeInterlockPopup.open.value).toBe(true);
      expect(recipeInterlockPopup.receiverMessage.value).toBe(xml);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('navigates to emax when message contains FDC with ETCH_EMAX_LL_FDC and LOT_END', async () => {
      const xml =
        '<EVENT_TYPE>FDC</EVENT_TYPE><FDC_PROCESS_TYPE>ETCH_EMAX_LL_FDC</FDC_PROCESS_TYPE><PARAMETER>LOT_END</PARAMETER>';
      const payload: UdpReceiverPayload = {
        level: 'HIGH',
        message: xml,
      };

      await handleUdpMessage(payload, mockRouter);

      expect(mockPush).toHaveBeenCalledWith({
        path: '/emax',
        query: { receiverMessage: xml },
      });
    });

    it('does not navigate if message does not match known events', async () => {
      const xml = '<EVENT_TYPE>OTHER</EVENT_TYPE>';
      const payload: UdpReceiverPayload = {
        level: 'HIGH',
        message: xml,
      };

      await handleUdpMessage(payload, mockRouter);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('development message helpers', () => {
    it('opens the popup with the default Stepper IDLE fixture', () => {
      mockStepperIdle();

      expect(stepperIdlePopup.open.value).toBe(true);
      expect(stepperIdlePopup.receiverMessage.value).toContain(
        '<EVENT_TYPE>STEPPERIDLE</EVENT_TYPE>',
      );
    });

    it('opens the Recipe Interlock dialog with the default fixture', () => {
      mockRecipeInterlock();

      expect(recipeInterlockPopup.open.value).toBe(true);
      expect(recipeInterlockPopup.receiverMessage.value).toContain(
        '<EVENT_TYPE>RECIPE</EVENT_TYPE>',
      );
    });
  });

  describe('startUdpReceiver & stopUdpReceiver lifecycle', () => {
    it('opens Stepper IDLE dialog for a window udp-message event', async () => {
      mockIsNativePlatform.mockReturnValue(false);

      await startUdpReceiver();
      expect(window).toHaveProperty('mockStepperIdle');

      const xml = '<EVENT_TYPE>STEPPERIDLE</EVENT_TYPE>';
      window.dispatchEvent(
        new CustomEvent('udp-message', {
          detail: { level: 'HIGH', message: xml },
        }),
      );

      expect(stepperIdlePopup.open.value).toBe(true);
      expect(stepperIdlePopup.receiverMessage.value).toBe(xml);

      await stopUdpReceiver();
    });

    it('opens Recipe Interlock from a window udp-message event', async () => {
      mockIsNativePlatform.mockReturnValue(false);

      await startUdpReceiver();
      expect(window).toHaveProperty('mockRecipeInterlock');

      const xml = '<EVENT_TYPE>RECIPE</EVENT_TYPE><MACHINE>EQP01</MACHINE>';
      window.dispatchEvent(
        new CustomEvent('udp-message', {
          detail: { level: 'HIGH', message: xml },
        }),
      );

      expect(recipeInterlockPopup.open.value).toBe(true);
      expect(recipeInterlockPopup.receiverMessage.value).toBe(xml);
      expect(mockPush).not.toHaveBeenCalled();

      await stopUdpReceiver();
    });

    it('does not start native listener when not on native platform', async () => {
      mockIsNativePlatform.mockReturnValue(false);

      await startUdpReceiver();
      expect(mockAddListener).not.toHaveBeenCalled();
      expect(mockStartListening).not.toHaveBeenCalled();
      await stopUdpReceiver();
    });

    it('starts listening and registers listener on native platform', async () => {
      mockIsNativePlatform.mockReturnValue(true);
      const mockRemove = vi.fn();
      mockAddListener.mockResolvedValueOnce({ remove: mockRemove });

      await startUdpReceiver();

      expect(mockAddListener).toHaveBeenCalledWith('udpMessage', expect.any(Function));
      expect(mockStartListening).toHaveBeenCalled();

      const onNativeMessage = mockAddListener.mock.calls[0][1] as (
        payload: UdpReceiverPayload,
      ) => void;
      const xml = '<EVENT_TYPE>STEPPERIDLE</EVENT_TYPE><INTERLOCKMANAGER />';
      onNativeMessage({ level: 'HIGH', message: xml });

      expect(stepperIdlePopup.open.value).toBe(true);
      expect(stepperIdlePopup.receiverMessage.value).toBe(xml);

      await stopUdpReceiver();
      expect(mockRemove).toHaveBeenCalled();
    });
  });
});
