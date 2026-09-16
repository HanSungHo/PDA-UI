export type BaseTooltipPlacement =
  | 'top'
  | 'left'
  | 'right'
  | 'bottom'
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight'
  | 'leftTop'
  | 'leftBottom'
  | 'rightTop'
  | 'rightBottom';

export type BaseTooltipTrigger = 'hover' | 'focus' | 'click' | 'contextmenu';

export interface BaseTooltipProps {
  title?: string;
  placement?: BaseTooltipPlacement;
  trigger?: BaseTooltipTrigger | BaseTooltipTrigger[];
  arrow?: boolean;
}

export const baseTooltipDefaults = {
  arrow: true,
  placement: 'top',
  trigger: 'click',
} as const;
