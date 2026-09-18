import {
  BATCH_AREAS,
  CURRENT_ROW_FLAG,
  DRAW_MENU_ACTION_ID,
  DRAW_MENU_ACTION_LABELS,
  DRAW_MENU_ACTION_TARGET,
  EEN_COMMENT_COUNT_FOR_ADD,
  HOLD_DISABLED_ACTION_IDS,
  INITIAL_MARKING_OPERATION,
  LOT_PAYLOAD_ACTION_IDS,
  LOT_STATUS,
  NON_CURRENT_DISABLED_ACTION_IDS,
  RUN_DISABLED_ACTION_IDS,
} from '../components/draw-menu-list/draw-menu-list.constants';
import type {
  DrawMenuActionId,
  DrawMenuActionItem,
  DrawMenuActionPayload,
  DrawMenuActionTarget,
} from '../components/draw-menu-list/draw-menu-list.types';
import type { ESheetDrawMenuRow, ESheetOperationContext } from '../types/esheet.types';

interface UseDrawMenuActionsInput extends ESheetOperationContext {
  row: ESheetDrawMenuRow;
  selectedAction?: DrawMenuActionId | undefined;
}

function normalize(value: string | number | null | undefined): string {
  return value == null ? '' : String(value);
}

function includesAction(actions: readonly DrawMenuActionId[], id: DrawMenuActionId): boolean {
  return actions.includes(id);
}

function hasComment(row: ESheetDrawMenuRow): boolean {
  const commentCount = normalize(row.COMMENTCNT).trim();

  return commentCount !== '' && commentCount !== EEN_COMMENT_COUNT_FOR_ADD;
}

function hasEndTime(row: ESheetDrawMenuRow): boolean {
  return normalize(row.ENDTIME).trim() !== '';
}

function isBatchArea(area: string): boolean {
  return BATCH_AREAS.includes(area);
}

function buildPayload(id: DrawMenuActionId, input: UseDrawMenuActionsInput): DrawMenuActionPayload {
  const row = input.row;
  const lotPayload = { LOTID: input.lotId };

  if (id === DRAW_MENU_ACTION_ID.batch) return {};

  if (id === DRAW_MENU_ACTION_ID.comment) {
    return {
      ...lotPayload,
      OPERATION: normalize(row.OPERATION),
      SUBOPERATION: normalize(row.SUBOPERATION),
      PROCESSSTEP: normalize(row.PROCESSSTEP),
      OPERSEQUENCE: normalize(row.OPERSEQUENCE),
    };
  }

  if (id === DRAW_MENU_ACTION_ID.settingEen) {
    return {
      ...lotPayload,
      FACTORYNAME: input.factoryName,
      PRODUCT: input.productName,
      ROUTE: input.routeName,
      OPERATION: normalize(row.OPERATION),
      SUBOPERATION: normalize(row.SUBOPERATION),
      PROCESSSTEP: normalize(row.PROCESSSTEP),
    };
  }

  if (includesAction(LOT_PAYLOAD_ACTION_IDS, id)) return lotPayload;

  return {};
}

function buildTarget(
  id: DrawMenuActionId,
  input: UseDrawMenuActionsInput,
): DrawMenuActionTarget | undefined {
  if (id !== DRAW_MENU_ACTION_ID.settingEen) return undefined;

  return normalize(input.row.COMMENTCNT).trim() === EEN_COMMENT_COUNT_FOR_ADD
    ? DRAW_MENU_ACTION_TARGET.eenAdd
    : DRAW_MENU_ACTION_TARGET.eenSetting;
}

function isDisabled(id: DrawMenuActionId, input: UseDrawMenuActionsInput): boolean {
  const row = input.row;
  const isCurrent = row.ISCURRENT === CURRENT_ROW_FLAG;
  const status = normalize(row.LOT_STATUS);
  const operation = normalize(row.OPERATION);

  if (!isCurrent) {
    if (includesAction(NON_CURRENT_DISABLED_ACTION_IDS, id)) {
      return true;
    }

    if (id === DRAW_MENU_ACTION_ID.auto && operation !== INITIAL_MARKING_OPERATION) return true;
  }

  if (status === LOT_STATUS.run && includesAction(RUN_DISABLED_ACTION_IDS, id)) {
    return true;
  }

  if (
    (status === LOT_STATUS.wait || status === LOT_STATUS.reserved) &&
    id === DRAW_MENU_ACTION_ID.moveOut
  ) {
    return true;
  }

  if (status === LOT_STATUS.hold && includesAction(HOLD_DISABLED_ACTION_IDS, id)) {
    return true;
  }

  if (id === DRAW_MENU_ACTION_ID.comment && !hasComment(row)) return true;
  if (id === DRAW_MENU_ACTION_ID.settingEen && hasEndTime(row)) return true;
  if (id === DRAW_MENU_ACTION_ID.batch && !isBatchArea(input.area)) return true;

  return false;
}

export function useDrawMenuActions(input: UseDrawMenuActionsInput): DrawMenuActionItem[] {
  return DRAW_MENU_ACTION_LABELS.map(({ id, label }) => ({
    id,
    label,
    disabled: isDisabled(id, input),
    selected: input.selectedAction === id,
    payload: buildPayload(id, input),
    target: buildTarget(id, input),
  }));
}
