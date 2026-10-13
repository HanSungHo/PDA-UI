export interface BaseScreenProps {
  /** Screen title rendered as the header <h1>. */
  title?: string | undefined;
  /** Whether the title header is rendered. */
  showHeader?: boolean | undefined;
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
  (e: 'ok'): void;
  (e: 'cancel'): void;
}

export const baseScreenDefaults = {
  showHeader: true,
  okDisabled: false,
  okLabel: '실행',
  okLoading: false,
  cancelDisabled: false,
  cancelLabel: '닫기',
} as const;
