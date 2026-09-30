import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { InputScopeReturnResult } from '~/features/move-out/types/move-out.types';

/**
 * Bridge store for Move Out flows that receive results from child screens
 * (Input Scope Data, Wafer Skip, etc.) without Activity.setResult.
 */
export const useMoveOutStore = defineStore('moveOut', () => {
  /**
   * Pending Input Scope Data result to apply when Move Out screen mounts.
   * Legacy: MoveOutActivity.inputScopeActivityResultLauncher applies
   * WAFERLIST -> editComment ("; W/H:#" + list) and LOGO -> editMaskLogo.
   */
  const pendingInputScopeResult = ref<InputScopeReturnResult | null>(null);

  function setPendingInputScopeResult(result: InputScopeReturnResult) {
    pendingInputScopeResult.value = {
      lotId: result.lotId,
      logo: result.logo,
      waferList: result.waferList,
    };
  }

  /** Read and clear the pending result (one-shot consume). */
  function consumePendingInputScopeResult(): InputScopeReturnResult | null {
    const current = pendingInputScopeResult.value;
    pendingInputScopeResult.value = null;
    return current;
  }

  function clearPendingInputScopeResult() {
    pendingInputScopeResult.value = null;
  }

  return {
    pendingInputScopeResult,
    setPendingInputScopeResult,
    consumePendingInputScopeResult,
    clearPendingInputScopeResult,
  };
});
