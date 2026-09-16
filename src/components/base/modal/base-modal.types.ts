export interface BaseModalProps {
  open: boolean;
  title?: string;
  closable?: boolean;
  overlayClosable?: boolean;
}

export interface BaseModalEmits {
  (e: 'update:open', value: boolean): void;
  (e: 'cancel', event?: MouseEvent): void;
  (e: 'afterClose'): void;
}

export const baseModalDefaults = {
  closable: true,
  overlayClosable: true,
} as const;
