export interface NotificationInboundParams {
  /**
   * Equivalent: intent.getStringExtra(DeviceInfo.UDP_RECEIVER_MESSAGE)
   */
  UDP_RECEIVER_MESSAGE?: string | null;
}

export interface NotificationViewBinding {
  titleReceiverMessage: {
    text: string;
    textColor: string;
  };
  txtReceiverMessage: {
    text: string;
  };
  btnOk: {
    text: string;
    isEnabled: boolean;
  };
}

export interface SingleClickListener {
  onSingleClick: () => void;
}
