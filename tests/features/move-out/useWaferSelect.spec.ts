import { describe, expect, it } from 'vitest';

import {
  createWaferGrid,
  getSlotNo,
  resetWaferSelection,
  selectAllWafers,
  selectWaferWithLimit,
  toggleWaferSelection,
} from '~/features/move-out/composables/useWaferSelect';

describe('useWaferSelect', () => {
  it('normalizes slot numbers from wafer identifiers', () => {
    expect(getSlotNo(' LOT001.1 ')).toBe('01');
    expect(getSlotNo('25')).toBe('25');
  });

  it('maps wafer identifiers to their matching slots', () => {
    const grid = createWaferGrid('LOT001.01,LOT001.03');

    expect(grid).toHaveLength(25);
    expect(grid[0]).toMatchObject({ waferId: 'LOT001.01', slotNo: '01', disabled: false });
    expect(grid[1]).toMatchObject({ waferId: 'empty', slotNo: '02', disabled: true });
    expect(grid[2]).toMatchObject({ waferId: 'LOT001.03', slotNo: '03', disabled: false });
  });

  it('preserves selected and disabled state by full wafer id', () => {
    const grid = createWaferGrid('LOT001.01,LOT001.02', 'LOT001.02', 'LOT001.01');

    expect(grid[0]).toMatchObject({ waferId: 'LOT001.01', selected: true, machine: 'Empty' });
    expect(grid[1]).toMatchObject({ waferId: 'LOT001.02', selected: false, disabled: true });
  });

  it('does not match bare slot numbers in select or disable lists', () => {
    // Legacy WaferAdapter matched only against the full waferName.
    const grid = createWaferGrid('LOT001.01,LOT001.02', '02', '01');

    expect(grid[0]).toMatchObject({ waferId: 'LOT001.01', selected: false });
    expect(grid[1]).toMatchObject({ waferId: 'LOT001.02', disabled: false });
  });

  it('does not substring-match similar wafer ids', () => {
    // Intentional deviation: legacy used contains() which let 'LOT001.1'
    // match 'LOT001.11'. Exact matching avoids that false positive.
    const grid = createWaferGrid('LOT001.1,LOT001.11', 'LOT001.1', 'LOT001.1');

    expect(grid[0]).toMatchObject({ waferId: 'LOT001.1', selected: true });
    expect(grid[10]).toMatchObject({ waferId: 'LOT001.11', selected: false, disabled: false });
  });

  it('selects every existing wafer when initialized as readonly', () => {
    const grid = createWaferGrid('LOT001.01,LOT001.02', '', '', false);

    expect(grid[0]).toMatchObject({ selected: true, machine: 'Empty' });
    expect(grid[1]).toMatchObject({ selected: true, machine: 'Empty' });
    expect(grid.filter((item) => item.selected)).toHaveLength(2);
  });

  it('matches adapter toggle rules and fixed-count enforcement', () => {
    const grid = createWaferGrid('LOT001.01,LOT001.02');

    expect(toggleWaferSelection(grid[0], 0, 1, true)).toBe('selected');
    expect(grid[0]).toMatchObject({ selected: true, machine: 'Empty' });
    expect(toggleWaferSelection(grid[1], 1, 1, true)).toBe('limit');
    expect(toggleWaferSelection(grid[0], 1, 1, true)).toBe('deselected');
    expect(toggleWaferSelection(grid[1], 0, 1, false)).toBe('blocked');
  });

  it('selects available wafers up to the fixed count and resets them', () => {
    const grid = createWaferGrid('LOT001.01,LOT001.02,LOT001.03', 'LOT001.02');

    selectAllWafers(grid, 0, 2);
    expect(grid.filter((item) => item.selected).map((item) => item.slotNo)).toEqual(['01', '03']);

    resetWaferSelection(grid);
    expect(grid.filter((item) => item.selected)).toHaveLength(0);
  });

  it('enforces the fixed count when restoring wafers from the last event', () => {
    // Legacy: getLotLastEvent() restored via waferButton.performClick(),
    // which enforced SelectWafer.currentCount < maxCount.
    const grid = createWaferGrid('LOT001.01,LOT001.02,LOT001.03');

    expect(selectWaferWithLimit(grid[0], 0, 2)).toBe(false);
    expect(grid[0]).toMatchObject({ selected: true, machine: 'Empty' });

    expect(selectWaferWithLimit(grid[1], 1, 2)).toBe(false);
    expect(selectWaferWithLimit(grid[2], 2, 2)).toBe(true);
    expect(grid[2]).toMatchObject({ selected: false, machine: '' });
  });
});
