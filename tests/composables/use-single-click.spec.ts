import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSingleClick } from '~/composables/use-single-click';

describe('useSingleClick', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the first click immediately', () => {
    const guard = useSingleClick();
    const action = vi.fn();

    guard(action);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('drops clicks that arrive within the delay', () => {
    const guard = useSingleClick();
    const action = vi.fn();

    guard(action);
    vi.advanceTimersByTime(999);
    guard(action);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('accepts a click once the delay has elapsed', () => {
    const guard = useSingleClick();
    const action = vi.fn();

    guard(action);
    vi.advanceTimersByTime(1001);
    guard(action);

    expect(action).toHaveBeenCalledTimes(2);
  });

  it('keeps an independent timer per guard instance', () => {
    const first = useSingleClick();
    const second = useSingleClick();
    const action = vi.fn();

    first(action);
    second(action);

    expect(action).toHaveBeenCalledTimes(2);
  });
});
