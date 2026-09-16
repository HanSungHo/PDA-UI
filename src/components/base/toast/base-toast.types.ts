export type BaseToastType = 'success' | 'error' | 'info' | 'warning';

export interface BaseToastProps {
  type?: BaseToastType;
  title?: string;
  description?: string;
  closable?: boolean;
  duration?: number;
}

export interface BaseToastEmits {
  (e: 'close'): void;
}

export const baseToastDefaults = {
  closable: true,
  duration: 3000,
  type: 'success',
} as const;
