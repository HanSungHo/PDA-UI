import { createSingleClick } from 'src/features/gas/composables/single-click';
import { describe, expect, it, vi } from 'vitest';

describe('createSingleClick (legacy OnSingleClickListener)', () => {
  it('ignores clicks within 1000 ms of the last accepted click, across actions', () => {
    let time = 10_000;
    const click = createSingleClick(() => time);
    const first = vi.fn();
    const second = vi.fn();

    click(first);
    time += 1000;
    click(second);
    expect(second).not.toHaveBeenCalled();

    time += 1;
    click(second);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('uses the real clock by default', () => {
    const click = createSingleClick();
    const action = vi.fn();
    click(action);
    click(action);
    expect(action).toHaveBeenCalledTimes(1);
  });
});
