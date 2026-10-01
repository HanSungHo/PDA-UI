export interface BaseScreenProps {
  /** Screen title rendered as the header <h1>. */
  title: string;
  /** Whether the back button is shown in the header. */
  showBack?: boolean | undefined;
  /** Whether the default OK button is disabled. */
  okDisabled?: boolean | undefined;
  /** Label for the default OK button. */
  okLabel?: string | undefined;
  /** Whether the default OK button is loading. */
  okLoading?: boolean | undefined;
  /** Whether the default cancel button is disabled. */
  cancelDisabled?: boolean | undefined;
  /** Label for the default cancel button. */
  cancelLabel?: string | undefined;
}

export interface BaseScreenEmits {
  (e: 'back'): void;
  (e: 'ok'): void;
  (e: 'cancel'): void;
}

export const baseScreenDefaults = {
  showBack: true,
  okDisabled: false,
  okLabel: '실행',
  okLoading: false,
  cancelDisabled: false,
  cancelLabel: '닫기',
} as const;
