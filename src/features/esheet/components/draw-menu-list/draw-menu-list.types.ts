import type { ESheetDrawMenuRow, ESheetOperationContext } from '../../types/esheet.types';
import type { DrawMenuActionId, DrawMenuActionTarget } from './draw-menu-list.constants';

export type { DrawMenuActionId, DrawMenuActionTarget } from './draw-menu-list.constants';

export interface DrawMenuActionPayload {
  LOTID?: string;
  FACTORYNAME?: string;
  PRODUCT?: string;
  ROUTE?: string;
  OPERATION?: string;
  SUBOPERATION?: string;
  PROCESSSTEP?: string;
  OPERSEQUENCE?: string;
}

export interface DrawMenuActionItem {
  id: DrawMenuActionId;
  label: string;
  disabled: boolean;
  selected: boolean;
  payload: DrawMenuActionPayload;
  target?: DrawMenuActionTarget;
}

export interface DrawMenuListProps extends ESheetOperationContext {
  open: boolean;
  title: string;
  row: ESheetDrawMenuRow;
  selectedAction?: DrawMenuActionId | undefined;
}

export interface DrawMenuListEmits {
  close: [];
  'select-action': [action: DrawMenuActionItem];
}
