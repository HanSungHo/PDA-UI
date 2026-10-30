export interface BaseModalProps {
  open: boolean;
  title?: string | undefined;
  closable?: boolean | undefined;
  backClosable?: boolean | undefined;
  overlayClosable?: boolean | undefined;
  width?: number | string | undefined;
}

export interface BaseModalEmits {
  (e: 'update:open', value: boolean): void;
  (e: 'cancel', event?: MouseEvent): void;
  (e: 'afterClose'): void;
}

export const baseModalDefaults = {
  closable: false,
  backClosable: false,
  overlayClosable: true,
  width: 'calc(100vw - 20px)',
} as const;
