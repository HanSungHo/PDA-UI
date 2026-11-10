const CLICK_DELAY_TIME = 1000;

/** Legacy OnSingleClickListener: ignores clicks within the delay of the last accepted click. */
export function createSingleClick(clickDelayMilliSecond: number = CLICK_DELAY_TIME) {
  let lastClickTime = 0;

  return function onClick(action: () => void): void {
    const now = Date.now();
    if (now - lastClickTime > clickDelayMilliSecond) {
      action();
      lastClickTime = now;
    }
  };
}
