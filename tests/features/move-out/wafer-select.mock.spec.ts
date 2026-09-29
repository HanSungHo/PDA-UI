import { describe, expect, it } from 'vitest';

import { createWaferGrid } from '~/features/move-out/composables/useWaferSelect';
import { waferSelectMocks } from '~/features/move-out/mocks/wafer-select.mock';

describe('wafer-select mocks', () => {
  it('models the editable DIFF scenario', () => {
    const input = waferSelectMocks.diffArea();
    const grid = createWaferGrid(
      input.EXISTWAFERLIST ?? '',
      input.DISABLEWAFERLIST,
      input.SELECTWAFERLIST,
      input.EDITABLE !== 'N',
    );

    expect(input.AREA).toBe('DIFF');
    expect(grid[0]).toMatchObject({ selected: true, disabled: false, machine: 'Empty' });
    expect(grid[2]).toMatchObject({ selected: false, disabled: true });
  });

  it('models readonly adapter behavior by selecting every existing wafer', () => {
    const input = waferSelectMocks.readonly();
    const grid = createWaferGrid(
      input.EXISTWAFERLIST ?? '',
      input.DISABLEWAFERLIST,
      input.SELECTWAFERLIST,
      input.EDITABLE !== 'N',
    );

    expect(input.SELECTWAFERLIST).toBe('');
    expect(grid.filter((item) => item.selected)).toHaveLength(5);
    expect(grid.filter((item) => item.waferId !== 'empty' && !item.selected)).toHaveLength(0);
  });

  it('models the all-disabled scenario without making empty slots selectable', () => {
    const input = waferSelectMocks.disabled();
    const grid = createWaferGrid(
      input.EXISTWAFERLIST ?? '',
      input.DISABLEWAFERLIST,
      input.SELECTWAFERLIST,
      input.EDITABLE !== 'N',
    );

    expect(grid.filter((item) => item.waferId !== 'empty' && item.disabled)).toHaveLength(5);
    expect(grid.filter((item) => item.waferId === 'empty' && !item.disabled)).toHaveLength(0);
  });
});
