export type BaseTagAndChipSize = 'xs' | 's' | 'm';
export type BaseTagandChipColor =
  | 'gray'
  | 'blue'
  | 'green'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'purple'
  | 'pink'
  | 'brand'
  | 'cyan';
export type BaseTagAndChipShape = 'rounded' | 'rectangle';

type BaseTagAnhChipCommonProps = {
  size?: BaseTagAndChipSize | undefined;
  color?: BaseTagandChipColor | undefined;
  shape?: BaseTagAndChipShape | undefined;
  bordered?: boolean | undefined;
  closable?: boolean | undefined;
};

type BaseTagAndChipSingleProps = {
  type: 'single';
  label: string;
  value?: never;
};

type BaseTagAndChipTwoValueProps = {
  type: 'two-value';
  label: string;
  value: string;
};

export type BaseTagAndChipProps =
  | (BaseTagAnhChipCommonProps & BaseTagAndChipSingleProps)
  | (BaseTagAnhChipCommonProps & BaseTagAndChipTwoValueProps);
