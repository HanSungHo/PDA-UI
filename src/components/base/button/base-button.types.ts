import type { BaseComponentSize } from '../shared/base-field.types';

export type BaseButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'link' | 'neutro';

export type BaseButtonSize = BaseComponentSize | 'xs';

export type BaseButtonHtmlType = 'button' | 'submit' | 'reset';

interface BaseButtonCommonProps {
  label?: string | undefined;
  variant?: BaseButtonVariant | undefined;
  size?: BaseButtonSize | undefined;
  block?: boolean | undefined;
  disabled?: boolean | undefined;
  loading?: boolean | undefined;
  htmlType?: BaseButtonHtmlType | undefined;
  href?: string | undefined;
  target?: string | undefined;
}

type BaseButtonAccessibleNameProps =
  | {
      iconOnly?: false | undefined;
      ariaLabel?: string | undefined;
    }
  | {
      iconOnly: true;
      ariaLabel: string;
    };

export type BaseButtonProps = BaseButtonCommonProps & BaseButtonAccessibleNameProps;

export interface BaseButtonEmits {
  click: [event: MouseEvent];
}

export const baseButtonDefaults = {
  block: false,
  disabled: false,
  htmlType: 'button',
  iconOnly: false,
  loading: false,
  size: 'medium',
  variant: 'primary',
} as const;
