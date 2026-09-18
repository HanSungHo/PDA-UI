import type { DrawMenuActionId } from 'src/features/esheet';
import type { ESheetDrawMenuRow, ESheetOperationContext } from 'src/features/esheet';
import { DRAW_MENU_ACTION_ID, DRAW_MENU_ACTION_TARGET } from 'src/features/esheet';
import { useDrawMenuActions } from 'src/features/esheet/composables/use-draw-menu-actions';
import { describe, expect, it } from 'vitest';

const baseContext: ESheetOperationContext = {
  lotId: 'WIP00001',
  factoryName: 'HF',
  productName: 'PRODUCT-A',
  routeName: 'ROUTE-A',
  area: 'DIFF',
};

const baseRow: ESheetDrawMenuRow = {
  ISCURRENT: 'Y',
  OPERATION: '10001',
  SUBOPERATION: '010',
  PROCESSSTEP: 'CONT CD',
  OPERSEQUENCE: '20',
  COMMENTCNT: '1',
  ENDTIME: '',
  LOT_STATUS: 'WAIT',
};

function action(
  overrides: Partial<ESheetDrawMenuRow> = {},
  contextOverrides: Partial<ESheetOperationContext> = {},
  selectedAction: DrawMenuActionId = DRAW_MENU_ACTION_ID.lotStatus,
) {
  const actions = useDrawMenuActions({
    ...baseContext,
    ...contextOverrides,
    row: { ...baseRow, ...overrides },
    selectedAction,
  });

  return Object.fromEntries(actions.map((item) => [item.id, item]));
}

describe('useDrawMenuActions', () => {
  it('returns legacy actions in display order and marks selected action', () => {
    const actions = useDrawMenuActions({
      ...baseContext,
      row: baseRow,
      selectedAction: DRAW_MENU_ACTION_ID.lotStatus,
    });

    expect(actions.map((item) => item.id)).toEqual([
      DRAW_MENU_ACTION_ID.moveIn,
      DRAW_MENU_ACTION_ID.moveOut,
      DRAW_MENU_ACTION_ID.batch,
      DRAW_MENU_ACTION_ID.comment,
      DRAW_MENU_ACTION_ID.settingEen,
      DRAW_MENU_ACTION_ID.rework,
      DRAW_MENU_ACTION_ID.split,
      DRAW_MENU_ACTION_ID.lotStatus,
      DRAW_MENU_ACTION_ID.rcpSearch,
      DRAW_MENU_ACTION_ID.auto,
      DRAW_MENU_ACTION_ID.batchAuto,
      DRAW_MENU_ACTION_ID.furnaceAuto,
      DRAW_MENU_ACTION_ID.sampleRelease,
      DRAW_MENU_ACTION_ID.etchInsp,
    ]);
    expect(actions.find((item) => item.id === DRAW_MENU_ACTION_ID.lotStatus)?.selected).toBe(true);
  });

  it('disables transaction actions for non-current rows and keeps auto enabled for operation 10005', () => {
    const items = action({ ISCURRENT: 'N', OPERATION: '10005' });

    expect(items[DRAW_MENU_ACTION_ID.moveIn]?.disabled).toBe(true);
    expect(items[DRAW_MENU_ACTION_ID.moveOut]?.disabled).toBe(true);
    expect(items[DRAW_MENU_ACTION_ID.rework]?.disabled).toBe(true);
    expect(items[DRAW_MENU_ACTION_ID.split]?.disabled).toBe(true);
    expect(items[DRAW_MENU_ACTION_ID.batchAuto]?.disabled).toBe(true);
    expect(items[DRAW_MENU_ACTION_ID.furnaceAuto]?.disabled).toBe(true);
    expect(items[DRAW_MENU_ACTION_ID.auto]?.disabled).toBe(false);
  });

  it('applies RUN, WAIT, reserved, and HOLD status rules', () => {
    expect(action({ LOT_STATUS: 'RUN' })[DRAW_MENU_ACTION_ID.moveIn]?.disabled).toBe(true);
    expect(action({ LOT_STATUS: 'RUN' })[DRAW_MENU_ACTION_ID.auto]?.disabled).toBe(true);
    expect(action({ LOT_STATUS: 'WAIT' })[DRAW_MENU_ACTION_ID.moveOut]?.disabled).toBe(true);
    expect(action({ LOT_STATUS: '예약' })[DRAW_MENU_ACTION_ID.moveOut]?.disabled).toBe(true);

    const holdItems = action({ LOT_STATUS: 'HOLD' });
    expect(holdItems[DRAW_MENU_ACTION_ID.moveIn]?.disabled).toBe(true);
    expect(holdItems[DRAW_MENU_ACTION_ID.moveOut]?.disabled).toBe(true);
    expect(holdItems[DRAW_MENU_ACTION_ID.rework]?.disabled).toBe(true);
    expect(holdItems[DRAW_MENU_ACTION_ID.split]?.disabled).toBe(true);
    expect(holdItems[DRAW_MENU_ACTION_ID.auto]?.disabled).toBe(true);
  });

  it('preserves legacy rework behavior for WAIT and reserved status when no other rule disables it', () => {
    expect(action({ LOT_STATUS: 'WAIT' })[DRAW_MENU_ACTION_ID.rework]?.disabled).toBe(false);
    expect(action({ LOT_STATUS: '예약' })[DRAW_MENU_ACTION_ID.rework]?.disabled).toBe(false);
  });

  it('disables comment without comment count and EEN after end time', () => {
    expect(action({ COMMENTCNT: '0' })[DRAW_MENU_ACTION_ID.comment]?.disabled).toBe(true);
    expect(action({ COMMENTCNT: '' })[DRAW_MENU_ACTION_ID.comment]?.disabled).toBe(true);
    expect(
      action({ ENDTIME: '2026-09-15 10:30:00' })[DRAW_MENU_ACTION_ID.settingEen]?.disabled,
    ).toBe(true);
  });

  it('disables batch outside DIFF and END areas', () => {
    expect(action({}, { area: 'PHOTO' })[DRAW_MENU_ACTION_ID.batch]?.disabled).toBe(true);
    expect(action({}, { area: 'DIFF' })[DRAW_MENU_ACTION_ID.batch]?.disabled).toBe(false);
    expect(action({}, { area: 'END' })[DRAW_MENU_ACTION_ID.batch]?.disabled).toBe(false);
  });

  it('builds legacy payloads and intentionally omits LOTID from batch', () => {
    const items = action();

    expect(items[DRAW_MENU_ACTION_ID.comment]?.payload).toEqual({
      LOTID: 'WIP00001',
      OPERATION: '10001',
      SUBOPERATION: '010',
      PROCESSSTEP: 'CONT CD',
      OPERSEQUENCE: '20',
    });
    expect(items[DRAW_MENU_ACTION_ID.settingEen]?.payload).toEqual({
      LOTID: 'WIP00001',
      FACTORYNAME: 'HF',
      PRODUCT: 'PRODUCT-A',
      ROUTE: 'ROUTE-A',
      OPERATION: '10001',
      SUBOPERATION: '010',
      PROCESSSTEP: 'CONT CD',
    });
    expect(items[DRAW_MENU_ACTION_ID.batch]?.payload).toEqual({});
    expect(items[DRAW_MENU_ACTION_ID.lotStatus]?.payload).toEqual({ LOTID: 'WIP00001' });
  });

  it('marks which EEN screen should open from the legacy comment count rule', () => {
    expect(action({ COMMENTCNT: '0' })[DRAW_MENU_ACTION_ID.settingEen]?.target).toBe(
      DRAW_MENU_ACTION_TARGET.eenAdd,
    );
    expect(action({ COMMENTCNT: '1' })[DRAW_MENU_ACTION_ID.settingEen]?.target).toBe(
      DRAW_MENU_ACTION_TARGET.eenSetting,
    );
  });
});
