export interface BaseModalProps {
  open: boolean;
  title?: string | undefined;
  closable?: boolean | undefined;
  overlayClosable?: boolean | undefined;
  width?: number;
}

export interface BaseModalEmits {
  (e: 'update:open', value: boolean): void;
  (e: 'cancel', event?: MouseEvent): void;
  (e: 'afterClose'): void;
}

export const baseModalDefaults = {
  closable: true,
  overlayClosable: true,
  width: 340,
} as const;
