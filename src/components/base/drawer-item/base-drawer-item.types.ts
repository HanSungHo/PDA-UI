export type BaseDrawerItemValue<TValue = string | number> = TValue;

export interface BaseDrawerItemProps<TValue = BaseDrawerItemValue> {
  label: string;
  value: TValue;
  selected?: boolean | undefined;
  disabled?: boolean | undefined;
}

export interface BaseDrawerItemEmits<TValue = BaseDrawerItemValue> {
  select: [value: TValue, event: MouseEvent];
}

export const baseDrawerItemDefaults = {
  disabled: false,
  selected: false,
} as const;
