const DEFAULT_CLICK_DELAY_MS = 1000;

export function useSingleClick(delayMs = DEFAULT_CLICK_DELAY_MS) {
  let lastClickTime = 0;

  return (action: () => void) => {
    const now = Date.now();
    if (now - lastClickTime > delayMs) {
      action();
      lastClickTime = now;
    }
  };
}
